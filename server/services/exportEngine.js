import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SECTION_PROMPT = `Generate a complete standalone React component for a {type} section. 

Requirements:
- Import React, { useState, useEffect } from 'react' if needed.
- Import { motion, AnimatePresence } from 'framer-motion' if using animations.
- Use only Tailwind CSS classes for styling.
- Do NOT use any custom hooks, context, stores, or @/ imports.
- Do NOT use useWebsiteStore, useEditorStore, or useThemeStore.
- All props must have sensible defaults defined inside the component.
- Component must work with zero props passed (fully self-contained).
- Use inline style only for dynamic values that Tailwind cannot handle.
- Ensure the component is fully responsive and uses clamp() for font sizes.
- The component file must end with: export default {ComponentName}

Props to use: {props}
Theme values (use for inline styles if needed): {themeValues}
The component should include animations based on these types: {animationsTypes}`;

function stripMarkdown(text) {
  return text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```jsx\s*/i, '')
    .replace(/^```javascript\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

function sanitizeSectionType(type) {
  if (!type || typeof type !== 'string') return null;
  const cleaned = type.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  return cleaned || null;
}

/** PascalCase component name with only valid JS identifier characters */
function getValidComponentName(type) {
  const sanitized = sanitizeSectionType(type);
  if (!sanitized) return 'FallbackSection';

  const pascal = sanitized
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

  return /^[A-Z][a-zA-Z0-9]*$/.test(pascal) ? pascal : 'FallbackSection';
}

function validateAndNormalizeSection(section) {
  if (!section || typeof section !== 'object') return null;

  const type = sanitizeSectionType(section.type);
  if (!type) return null;

  const props =
    section.props && typeof section.props === 'object' && !Array.isArray(section.props)
      ? section.props
      : {};

  const animations =
    section.animations && typeof section.animations === 'object' && !Array.isArray(section.animations)
      ? section.animations
      : {};

  return {
    ...section,
    type,
    props,
    animations,
    id: section.id || `${type}-${Math.random().toString(36).slice(2, 9)}`,
  };
}

function normalizePages(pages, legacySections = []) {
  const sourcePages =
    pages.length > 0
      ? pages
      : [{ name: 'Home', slug: '/', sections: legacySections }];

  return sourcePages.map((page) => ({
    ...page,
    name: (page.name || 'Home').toString(),
    slug: page.slug || '/',
    sections: (Array.isArray(page.sections) ? page.sections : [])
      .map(validateAndNormalizeSection)
      .filter(Boolean),
  }));
}

function escapeJsString(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$')
    .replace(/"/g, '\\"');
}

function buildFallbackComponent(componentName, sectionType, reason) {
  const label = sectionType.replace(/-/g, ' ');
  const message = escapeJsString(reason || 'This section could not be generated.');

  return `import React from 'react';

export default function ${componentName}() {
  return (
    <section
      className="w-full px-6 py-16 border border-dashed border-gray-600 bg-gray-900/80"
      data-section-type="${sectionType}"
      aria-label="${label} placeholder"
    >
      <div className="max-w-2xl mx-auto text-center space-y-4 text-gray-300">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">
          Section placeholder
        </p>
        <h2 className="text-2xl font-bold text-white capitalize">${label}</h2>
        <p className="text-sm text-gray-400">${message}</p>
        <p className="text-xs text-gray-500">
          Replace this component in src/components/${componentName}.jsx
        </p>
      </div>
    </section>
  );
}
`;
}

async function generateSectionComponent(section, { safeProjectName, themeValues, fileMap, batchNum, totalBatches }) {
  const componentName = getValidComponentName(section.type);
  const sectionType = section.type;

  try {
    const sectionCompletion = await openai.chat.completions.create(
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Return ONLY React component code.' },
          {
            role: 'user',
            content: SECTION_PROMPT.replace('{type}', sectionType)
              .replace('{ComponentName}', componentName)
              .replace('{props}', JSON.stringify(section.props))
              .replace('{themeValues}', JSON.stringify(themeValues))
              .replace('{animationsTypes}', JSON.stringify(section.animations?.types || [])),
          },
        ],
        max_tokens: 3000,
        temperature: 0.3,
      },
      { timeout: 25000 }
    );

    const content = sectionCompletion.choices[0]?.message?.content;
    if (!content) {
      throw new Error(`AI returned empty content for ${sectionType}`);
    }

    fileMap[`${safeProjectName}/src/components/${componentName}.jsx`] = stripMarkdown(content);
    return { componentName, success: true };
  } catch (err) {
    console.error(
      `Export Error [Batch ${batchNum}/${totalBatches}] [${sectionType}]:`,
      err.message
    );
    fileMap[`${safeProjectName}/src/components/${componentName}.jsx`] = buildFallbackComponent(
      componentName,
      sectionType,
      err.message
    );
    return { componentName, success: false };
  }
}

export async function generateExportCode(websiteSchema, projectName = 'my-website') {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured on the server');
  }

  const { theme = {}, pages = [], sections: legacySections = [] } = websiteSchema;
  const fileMap = {};
  const safeProjectName = projectName.toLowerCase().replace(/\s+/g, '-');

  const activePages = normalizePages(pages, legacySections);

  const themeValues = {
    primary: theme.colors?.primary || '#7c3aed',
    secondary: theme.colors?.secondary || '#2563eb',
    background: theme.colors?.background || '#030712',
    text: theme.colors?.text || '#f9fafb',
    gradient: theme.colors?.gradient || 'linear-gradient(135deg, #7c3aed, #2563eb)',
    headingFont: theme.fonts?.heading || 'Inter',
    bodyFont: theme.fonts?.body || 'Inter'
  };

  fileMap[`${safeProjectName}/package.json`] = JSON.stringify({
    name: safeProjectName,
    version: '0.1.0',
    private: true,
    dependencies: {
      "react": "^18.2.0",
      "react-dom": "^18.2.0",
      "react-router-dom": "^6.22.0",
      "framer-motion": "^11.0.0",
      "tailwindcss": "^3.4.1",
      "autoprefixer": "^10.4.17",
      "postcss": "^8.4.35"
    },
    devDependencies: {
      "vite": "^5.1.4",
      "@vitejs/plugin-react": "^4.2.1"
    },
    scripts: {
      "dev": "vite",
      "build": "vite build",
      "preview": "vite preview"
    }
  }, null, 2);

  const headingFont = themeValues.headingFont;
  const bodyFont = themeValues.bodyFont;
  const fontUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(headingFont)}:wght@400;700;900&family=${encodeURIComponent(bodyFont)}:wght@400;500;600&display=swap`;

  fileMap[`${safeProjectName}/index.html`] = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="${fontUrl}" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`;

  fileMap[`${safeProjectName}/tailwind.config.js`] = `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "${themeValues.primary}",
        secondary: "${themeValues.secondary}",
        background: "${themeValues.background}",
        text: "${themeValues.text}",
      },
    },
  },
  plugins: [],
}`;

  fileMap[`${safeProjectName}/postcss.config.js`] = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`;

  fileMap[`${safeProjectName}/.gitignore`] = `node_modules
dist
.env
.DS_Store`;

  fileMap[`${safeProjectName}/README.md`] = `# ${projectName}

Generated by AI Website Builder.

## Getting Started

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Run development server:
   \`\`\`bash
   npm run dev
   \`\`\`

3. Build for production:
   \`\`\`bash
   npm run build
   \`\`\`
`;

  fileMap[`${safeProjectName}/src/index.css`] = `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --primary: ${themeValues.primary};
  --background: ${themeValues.background};
  --text: ${themeValues.text};
}

* { box-sizing: border-box; }

body {
  background-color: var(--background);
  color: var(--text);
  margin: 0;
  font-family: "${bodyFont}", sans-serif;
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, h4, h5, h6 {
  font-family: "${headingFont}", sans-serif;
}`;

  // Collect unique valid sections across all pages
  const allSections = [];
  const sectionTypeMap = new Map();

  activePages.forEach((page) => {
    page.sections.forEach((section) => {
      if (!sectionTypeMap.has(section.type)) {
        sectionTypeMap.set(section.type, true);
        allSections.push(section);
      }
    });
  });

  const componentExports = allSections
    .map((s) => {
      const name = getValidComponentName(s.type);
      return `export { default as ${name} } from './${name}';`;
    })
    .join('\n');
  
  fileMap[`${safeProjectName}/src/components/index.js`] = componentExports;

  // Generate Page Components
  activePages.forEach((page) => {
    const pageName = page.name.replace(/[^a-zA-Z0-9]/g, '') || 'Home';
    const pageImports = page.sections
      .map((s) => {
        const name = getValidComponentName(s.type);
        return `import ${name} from '../components/${name}';`;
      })
      .join('\n');
    const pageComponents = page.sections
      .map((s) => `<${getValidComponentName(s.type)} />`)
      .join('\n        ');

    fileMap[`${safeProjectName}/src/pages/${pageName}.jsx`] = `import React from 'react';
${pageImports}

export default function ${pageName}() {
  return (
    <main className="w-full min-h-screen">
        ${pageComponents}
    </main>
  );
}`;
  });

  // App.jsx with Router
  if (activePages.length > 1) {
    const pageImports = activePages.map(page => `import ${page.name.replace(/\s+/g, '')} from './pages/${page.name.replace(/\s+/g, '')}';`).join('\n');
    const routes = activePages.map(page => `<Route path="${page.slug}" element={<${page.name.replace(/\s+/g, '')} />} />`).join('\n          ');

    fileMap[`${safeProjectName}/src/App.jsx`] = `import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
${pageImports}

function App() {
  return (
    <BrowserRouter>
      <Routes>
          ${routes}
      </Routes>
    </BrowserRouter>
  );
}

export default App;`;
  } else {
    // Legacy single page App.jsx
    const page = activePages[0] || { sections: [] };
    const imports = page.sections
      .map((s) => {
        const name = getValidComponentName(s.type);
        return `import ${name} from './components/${name}';`;
      })
      .join('\n');
    const components = page.sections
      .map((s) => `<${getValidComponentName(s.type)} />`)
      .join('\n        ');
    
    fileMap[`${safeProjectName}/src/App.jsx`] = `import React from 'react';
${imports}

function App() {
  return (
    <main className="w-full min-h-screen">
        ${components}
    </main>
  );
}

export default App;`;
  }

  fileMap[`${safeProjectName}/vite.config.js`] = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`;

  fileMap[`${safeProjectName}/src/main.jsx`] = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`;

  // Generate Section Components in Batches (to avoid timeouts)
  const BATCH_SIZE = 2;
  const totalBatches = Math.max(1, Math.ceil(allSections.length / BATCH_SIZE));

  for (let i = 0; i < allSections.length; i += BATCH_SIZE) {
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const batch = allSections.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map((section) =>
        generateSectionComponent(section, {
          safeProjectName,
          themeValues,
          fileMap,
          batchNum,
          totalBatches,
        })
      )
    );
  }

  return fileMap;
}

