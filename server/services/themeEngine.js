import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_MESSAGE = `You are a world-class UI/UX designer specializing in premium SaaS and startup websites.
Generate a stunning, professional visual theme based on the website analysis.
Return ONLY a valid JSON object with no extra text, no markdown, no code blocks.

The JSON must follow this exact structure:
{
  "colors": {
    "primary": "hex color (the main brand/accent color)",
    "secondary": "hex color (secondary accent)",
    "background": "hex color (page background)",
    "surface": "hex color (card/component background)",
    "text": "hex color (primary text)",
    "textMuted": "hex color (secondary/muted text)",
    "border": "hex color (border color)",
    "gradient": "CSS gradient string (e.g. linear-gradient(135deg, #7c3aed, #2563eb))"
  },
  "fonts": {
    "heading": "Google Font name for headings (e.g. Inter, Syne, Space Grotesk, Outfit, Plus Jakarta Sans)",
    "body": "Google Font name for body text (e.g. Inter, DM Sans, Nunito, Manrope)"
  },
  "spacing": {
    "section": "vertical padding for sections (e.g. 120px)",
    "card": "padding inside cards (e.g. 32px)"
  },
  "effects": {
    "blur": "backdrop blur value (e.g. 20px)",
    "glow": "box shadow glow (e.g. 0 0 40px rgba(124,58,237,0.3))",
    "cardBg": "card background with opacity (e.g. rgba(255,255,255,0.05))",
    "borderGlow": "border with glow (e.g. 1px solid rgba(124,58,237,0.3))"
  }
}

DESIGN GUIDELINES:
- If user wants purple/magic: background=#030014, surface=rgba(255,255,255,0.03), primary=#7c3aed, secondary=#d946ef, gradient=linear-gradient(135deg, #7c3aed, #d946ef, #2563eb)
- If user wants dark theme: background=#030712 or #0a0a0f, surface=rgba(255,255,255,0.03), text=#f9fafb, textMuted=#9ca3af
- If user wants modern/futuristic: use Space Grotesk or Syne for headings, add glow effects in primary colors
- If user wants glassmorphism: cardBg=rgba(255,255,255,0.04), blur=24px, border=rgba(255,255,255,0.1), glow=0 0 50px rgba(124,58,237,0.2)
- If specific effects like "aurora", "matrix", or "glow" are requested, ensure the primary/secondary colors are vibrant (e.g., #00f2ff, #7c3aed, #00ff88)
- Always make the gradient vibrant, using 3+ colors for "magic" or "premium" feel
- Premium fonts: Space Grotesk, Syne, Outfit, Plus Jakarta Sans, Clash Display, Cal Sans
- For "magic" effect, use primary=#7c3aed (purple) and secondary=#d946ef (pink) with cyan accents.
`;

function fillMissingThemeDefaults(theme, pageType = 'landing') {
  const defaults = {
    colors: {
      primary: '#7c3aed',
      secondary: '#2563eb',
      background: '#030712',
      surface: 'rgba(255,255,255,0.03)',
      text: '#f9fafb',
      textMuted: '#6b7280',
      border: 'rgba(255,255,255,0.08)',
      gradient: 'linear-gradient(135deg, #7c3aed, #2563eb)'
    },
    fonts: {
      heading: 'Inter',
      body: 'Inter'
    }
  };

  const filled = { ...theme };
  filled.colors = { ...defaults.colors, ...theme.colors };
  filled.fonts = { ...defaults.fonts, ...theme.fonts };

  const requiredColorKeys = ['primary', 'secondary', 'background', 'surface', 'text', 'textMuted', 'border', 'gradient'];
  const requiredFontKeys = ['heading', 'body'];

  requiredColorKeys.forEach(k => {
    // Fill missing color keys silently
  });

  requiredFontKeys.forEach(k => {
    // Fill missing font keys silently
  });

  if (['login', 'signup', 'forgot-password'].includes(pageType)) {
    filled.colors.surface = filled.colors.surface || 'rgba(255,255,255,0.05)';
    filled.effects = filled.effects || {};
    filled.effects.cardBg = filled.effects.cardBg || 'rgba(255,255,255,0.05)';
  }

  return filled;
}

export async function generateTheme(analysisResult) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_MESSAGE },
      { role: 'user', content: JSON.stringify(analysisResult) },
    ],
    temperature: 0.3,
  });

  const parseText = (text) => text.trim()
    .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

  const rawText = parseText(completion.choices[0].message.content);

  let theme;
  try {
    theme = JSON.parse(rawText);
  } catch {
    const retry = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a JSON fixer. Return ONLY valid JSON object.' },
        { role: 'user', content: `Fix this invalid JSON object for website theme: ${rawText}` }
      ],
      temperature: 0.1,
    });
    theme = JSON.parse(parseText(retry.choices[0].message.content));
  }

  return fillMissingThemeDefaults(theme, analysisResult?.pageType);
}
