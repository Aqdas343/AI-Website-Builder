import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_MESSAGE = `CRITICAL RULE: Generate ONLY the section types listed in the Layout array. Do NOT add extra sections. For login pages generate ONLY navbar + login-form. For signup pages generate ONLY navbar + signup-form. For forgot-password pages generate ONLY the forgot-password section.

You are a world-class copywriter and content strategist for premium tech startups and SaaS companies.
Generate rich, detailed, conversion-focused content for each website section.
Return ONLY a valid JSON array with no extra text, no markdown, no code blocks.

Each item: { "id": "type-number", "type": "section type", "props": { ...detailed props }, "animations": { "entry": "fade-up", "scroll": "reveal", "hover": "scale" } }

ALLOWED SECTION TYPES AND THEIR DETAILED PROPS:

navbar: {
  brand: "Company name",
  tagline: "short tagline under brand",
  links: [{ label, href }],
  ctaText: "Get Started Free",
  ctaHref: "#pricing",
  animations: { logo: "spin-once", links: "stagger" }
}

hero: {
  badge: "short badge text (e.g. '✨ Now with AI v2.0')",
  headline: "POWERFUL 6-10 word headline that grabs attention",
  headlineHighlight: "the word(s) to highlight with gradient",
  subheadline: "2-3 sentence compelling description of the value proposition",
  primaryCta: "primary button text",
  secondaryCta: "secondary button text (e.g. Watch Demo)",
  socialProof: "e.g. Trusted by 50,000+ creators worldwide",
  stats: [{ value: "10K+", label: "Active Users" }, { value: "99.9%", label: "Uptime" }, { value: "4.9★", label: "Rating" }],
  floatingElements: [
    { icon: "⚡", text: "Fastest AI", x: "10%", y: "20%", rotate: "-5deg" },
    { icon: "🎨", text: "Beautiful UI", x: "80%", y: "15%", rotate: "8deg" }
  ],
  motionEffect: "one of: parallax, mouse-tracking, typing, float"
}

stats: {
  title: "optional section title",
  items: [{ value: "50K+", label: "Users", description: "brief context" }]
}

features: {
  badge: "FEATURES",
  title: "Why teams choose [Product]",
  subtitle: "2 sentence description",
  items: [
    {
      icon: "emoji",
      title: "Feature name",
      description: "2-3 sentence detailed description of this feature and its benefit",
      highlight: "key benefit phrase"
    }
  ]
}

how-it-works: {
  badge: "HOW IT WORKS",
  title: "Get started in 3 simple steps",
  subtitle: "description",
  steps: [
    {
      number: "01",
      title: "Step title",
      description: "2-3 sentence detailed description",
      icon: "emoji"
    }
  ]
}

testimonials: {
  badge: "TESTIMONIALS",
  title: "Loved by thousands of creators",
  subtitle: "description",
  items: [
    {
      quote: "Detailed 2-3 sentence testimonial that sounds authentic and specific",
      name: "Full Name",
      role: "Job Title",
      company: "Company Name",
      avatar: "initials",
      rating: 5
    }
  ]
}

pricing: {
  badge: "PRICING",
  title: "Simple, transparent pricing",
  subtitle: "description",
  plans: [
    {
      name: "Plan name",
      price: "$29",
      period: "/month",
      description: "Who this plan is for",
      features: ["detailed feature 1", "detailed feature 2"],
      cta: "Get Started",
      popular: false,
      badge: "Most Popular"
    }
  ]
}

faq: {
  badge: "FAQ",
  title: "Frequently asked questions",
  subtitle: "description",
  items: [
    {
      question: "Detailed question?",
      answer: "Comprehensive 2-3 sentence answer that fully addresses the question"
    }
  ]
}

cta: {
  badge: "GET STARTED",
  headline: "Ready to build something amazing?",
  subheadline: "2 sentence compelling reason to act now",
  primaryCta: "Start Building Free",
  secondaryCta: "Talk to Sales",
  note: "No credit card required • Free forever plan"
}

footer: {
  brand: "Company name",
  tagline: "Short brand tagline",
  description: "1-2 sentence company description",
  links: {
    Product: [{ label, href }],
    Company: [{ label, href }],
    Legal: [{ label, href }]
  },
  social: [{ platform: "Twitter", href: "#", icon: "𝕏" }],
  copyright: "© 2025 Company. All rights reserved."
}

login-form: { title, subtitle, submitText, forgotPasswordText, signupText }
signup-form: { title, subtitle, submitText, fields: [{ label, type, placeholder }], loginText }
forgot-password: { title, subtitle, submitText, backToLoginText }
dashboard-header: {
  title: "App or product name",
  subtitle: "short tagline or user greeting",
  notificationCount: 3,
  userName: "User full name",
  userRole: "User role/title",
  userAvatar: "initials"
}
dashboard-sidebar: {
  appName: "App name",
  menuItems: [
    { label: "Dashboard", icon: "📊", active: true },
    { label: "Analytics", icon: "📈", active: false },
    { label: "Voice AI", icon: "🎙️", active: false },
    { label: "Transcription", icon: "📝", active: false },
    { label: "Chat", icon: "💬", active: false },
    { label: "Team", icon: "👥", active: false },
    { label: "Settings", icon: "⚙️", active: false }
  ],
  userName: "User full name",
  userRole: "User role",
  userAvatar: "initials"
}
dashboard-stats: {
  title: "Overview",
  stats: [
    { label: "Active Users", value: "24,891", change: "+12%", icon: "👥", trend: "up" },
    { label: "Voice Sessions", value: "8,432", change: "+8%", icon: "🎙️", trend: "up" },
    { label: "Accuracy", value: "98.7%", change: "+2%", icon: "🎯", trend: "up" },
    { label: "Uptime", value: "99.9%", change: "stable", icon: "⚡", trend: "stable" }
  ]
}
dashboard-charts: {
  title: "Analytics",
  usageChart: {
    title: "Usage Over Time",
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    values: [65, 80, 55, 90, 75, 40, 85]
  },
  distributionChart: {
    title: "Language Distribution",
    segments: [
      { label: "English", value: 45, color: "purple" },
      { label: "Spanish", value: 25, color: "cyan" },
      { label: "French", value: 20, color: "violet" },
      { label: "Other", value: 10, color: "gray" }
    ]
  }
}
dashboard-activity: {
  title: "Recent Activity",
  activities: [
    { time: "2 min ago", event: "Voice session started by Ahmed K.", type: "voice" },
    { time: "5 min ago", event: "Transcription completed — 3,200 words", type: "transcription" },
    { time: "12 min ago", event: "New team member joined", type: "user" },
    { time: "1 hr ago", event: "AI model updated to v2.4", type: "system" },
    { time: "3 hr ago", event: "Monthly report exported", type: "report" }
  ]
}
about: { title, description, highlights: [] }
contact: { title, subtitle, email }
portfolio: { title, items: [{ title, description, tags: [] }] }
team: { title, members: [{ name, role, bio }] }

ANIMATION RULES - Read the animations.types array passed with layout and apply accordingly.
CRITICAL: Apply each effect to EVERY section that supports it, not just one section.

- If 'particles' in types → hero gets motionEffect: 'particles', dashboard-header gets motionEffect: 'particles'. Both must have it if both exist in layout.
- If 'matrix-rain' in types → hero gets motionEffect: 'matrix-rain', dashboard-header gets motionEffect: 'matrix-rain'
- If 'aurora-background' in types → hero gets motionEffect: 'aurora', dashboard-header gets motionEffect: 'aurora'
- If 'typing-effect' in types → hero gets motionEffect: 'typing', headline suitable for typing animation
- If 'glitch-effect' in types → navbar gets animations.logo: 'glitch', hero headlineHighlight must be set, dashboard-header gets animations.titleEffect: 'glitch'
- If 'magnetic-buttons' in types → hero primaryCta notes magnetic effect, cta primaryCta notes magnetic effect, dashboard-header cta notes it
- If 'tilt-3d' in types → features items note tilt, testimonials items note tilt, pricing plans note tilt, stats items note tilt, dashboard-stats stats note tilt, dashboard-charts panels note tilt
- If 'glow-pulse' in types → cta gets animations.special: 'glow-pulse', hero primaryCta notes glow, navbar gets animations.border: 'glow', dashboard-header gets animations.border: 'glow', dashboard-sidebar gets animations.border: 'glow'
- If 'blob-animation' in types → hero notes blob background, cta notes blob background
- If 'noise-texture' in types → global overlay, no prop needed
- If 'ripple' in types → global effect, no prop needed
- If 'particles' in types → dashboard-header gets motionEffect: 'particles'
- If 'glow-pulse' in types → dashboard-header and dashboard-sidebar get animations.border: 'glow'
- If 'tilt-3d' in types → dashboard-stats cards and dashboard-charts panels note tilt
- If 'glitch-effect' in types → dashboard-header gets animations.titleEffect: 'glitch'

CONTENT RULES:
- Make ALL content specific to the industry and goal — no generic placeholders
- Hero headline must be POWERFUL and memorable
- Features should have 6 items minimum for landing pages
- Testimonials should sound real and specific
- Pricing should have 3 plans (Starter, Pro, Enterprise)
- FAQ should have 6-8 questions
- All descriptions should be 2-3 sentences, NOT one-liners
- Use the brand's tone and target audience from the analysis

For each component you generate, add a "sourceAttribution" field inside props with this structure:
"sourceAttribution": {
  "component": "<section type>",
  "inspiredBy": "<title of web source used>",
  "sourceUrl": "<url of web source>",
  "dataUsed": "<brief description of what was taken from this source>"
}`;

const VALID_TYPES = new Set([
  'navbar','hero','features','about','pricing','testimonials','faq','contact','footer',
  'cta','stats','team','how-it-works','portfolio','blog-list',
  'login-form','signup-form','forgot-password',
  'dashboard-header','dashboard-sidebar','dashboard-stats','dashboard-table',
  'dashboard-charts','dashboard-activity',
]);

const strictTypes = {
  login: ['navbar', 'login-form'],
  signup: ['navbar', 'signup-form'],
  'forgot-password': ['forgot-password'],
};

const ANIMATION_SECTION_MAP = {
  'tilt-3d': ['features', 'testimonials', 'pricing', 'team', 'portfolio', 'dashboard-stats', 'dashboard-charts'],
  'glitch-effect': ['navbar', 'hero', 'cta', 'dashboard-header'],
  'magnetic-buttons': ['hero', 'cta', 'pricing'],
  'typing-effect': ['hero'],
  'glow-pulse': ['hero', 'cta', 'dashboard-header', 'dashboard-sidebar', 'navbar', 'login-form', 'signup-form', 'forgot-password'],
  particles: ['hero', 'dashboard-header', 'navbar', 'login-form', 'signup-form'],
  'aurora-background': ['hero', 'navbar', 'login-form', 'signup-form', 'forgot-password', 'dashboard-header'],
  'matrix-rain': ['hero', 'navbar', 'login-form', 'signup-form', 'dashboard-header'],
  'blob-animation': ['hero', 'cta', 'login-form', 'signup-form', 'forgot-password'],
};

const GLOBAL_ONLY_ANIMATIONS = new Set(['noise-texture', 'ripple']);

export function getSectionAnimationTypes(sectionType, globalTypes = []) {
  if (!Array.isArray(globalTypes)) return [];

  return globalTypes.filter((type) => {
    if (GLOBAL_ONLY_ANIMATIONS.has(type)) return false;
    const allowedSections = ANIMATION_SECTION_MAP[type];
    if (!allowedSections) return false;
    return allowedSections.includes(sectionType);
  });
}

function buildDefaultProps(type, analysis) {
  const brand = analysis?.brand || analysis?.industry || 'App';
  const defaults = {
    'login-form': {
      title: `Welcome back to ${brand}`,
      subtitle: 'Sign in to your account to continue',
      submitText: 'Sign In',
      forgotPasswordText: 'Forgot password?',
      signupText: "Don't have an account?",
    },
    'signup-form': {
      title: `Join ${brand} today`,
      subtitle: 'Create your account and get started',
      submitText: 'Create Account',
      loginText: 'Already have an account?',
      fields: [
        { label: 'Full Name', type: 'text', placeholder: 'Enter your full name', icon: '👤' },
        { label: 'Email Address', type: 'email', placeholder: 'name@company.com', icon: '✉' },
        { label: 'Password', type: 'password', placeholder: '••••••••', icon: '🔒' },
      ],
    },
    'forgot-password': {
      title: 'Forgot your password?',
      subtitle: 'Enter your email and we will send you a reset link',
      submitText: 'Send Reset Link',
      backToLoginText: 'Back to login',
    },
    navbar: {
      brand: brand,
      links: [{ label: 'Home', href: '/' }, { label: 'About', href: '#' }],
      ctaText: 'Get Started',
    },
  };
  return defaults[type] || {};
}

export async function generateComponents(layoutResult, analysisResult, webInsights = []) {
  let sections = Array.isArray(layoutResult) ? layoutResult : (layoutResult.sections || []);

  const pageType = analysisResult?.pageType;
  if (strictTypes[pageType]) {
    sections = sections.filter((s) => strictTypes[pageType].includes(s.type));
  }

  const AUTH_FAST_PASS = ['login', 'signup', 'forgot-password'];
  if (AUTH_FAST_PASS.includes(pageType)) {
    return sections.map((s) => ({
      id: `${s.type}-${Math.random().toString(36).slice(2, 8)}`,
      type: s.type,
      props: buildDefaultProps(s.type, analysisResult),
      animations: {
        entry: 'fade-up',
        types: getSectionAnimationTypes(s.type, analysisResult?.animations?.types || []),
      },
    }));
  }

  const midPoint = Math.ceil(sections.length / 2);
  const batch1 = sections.slice(0, midPoint);
  const batch2 = sections.slice(midPoint);

  const [res1, res2] = await Promise.all([
    openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_MESSAGE },
        {
          role: 'user',
          content: `Batch 1 Layout: ${JSON.stringify(batch1)}\nAnalysis: ${JSON.stringify(analysisResult)}\nGlobal Animation Types: ${JSON.stringify(analysisResult.animations?.types || [])}\nWeb Research Insights (use these to write realistic, specific content for props like title, subtitle, features, descriptions): ${JSON.stringify(webInsights.slice(0, 5))}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 4000,
    }),
    openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_MESSAGE },
        {
          role: 'user',
          content: `Batch 2 Layout: ${JSON.stringify(batch2)}\nAnalysis: ${JSON.stringify(analysisResult)}\nGlobal Animation Types: ${JSON.stringify(analysisResult.animations?.types || [])}\nWeb Research Insights (use these to write realistic, specific content for props like title, subtitle, features, descriptions): ${JSON.stringify(webInsights.slice(5, 10))}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 4000,
    })
  ]);

  const parseText = (text) => {
    return text.trim()
      .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  };

  const t1 = parseText(res1.choices[0].message.content);
  const t2 = parseText(res2.choices[0].message.content);

  const safeParse = async (text, originalBatch) => {
    try {
      return JSON.parse(text);
    } catch {
      const retry = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a JSON fixer. Return ONLY valid JSON.' },
          { role: 'user', content: `Fix this invalid JSON array of sections: ${text}` }
        ],
        temperature: 0.1,
      });
      return JSON.parse(parseText(retry.choices[0].message.content));
    }
  };

  const [p1, p2] = await Promise.all([
    safeParse(t1, batch1),
    safeParse(t2, batch2)
  ]);

  const combined = [...p1, ...p2];
  console.log('[ComponentGen] Sample component props:', JSON.stringify(combined[0]?.props).slice(0, 500));

  const requiredTypes = sections.map((s) => s.type);

  const filteredCombined = combined.filter((item) => requiredTypes.includes(item.type));

  const effectiveCombined = filteredCombined.length > 0 ? filteredCombined : combined;

  const layoutOrder = sections.map((s) => s.type);
  const normalizeItemType = (rawType) =>
    VALID_TYPES.has(rawType) ? rawType : rawType.toLowerCase().replace(/\s+/g, '-');

  const seenTypes = new Set();
  const dedupedCombined = [];
  for (const item of effectiveCombined) {
    if (!item?.type) continue;
    const type = normalizeItemType(item.type);
    if (!VALID_TYPES.has(type) || !layoutOrder.includes(type)) continue;
    if (seenTypes.has(type)) continue;
    seenTypes.add(type);
    dedupedCombined.push(item);
  }

  const orderIndex = new Map(layoutOrder.map((t, i) => [t, i]));
  dedupedCombined.sort(
    (a, b) =>
      (orderIndex.get(normalizeItemType(a.type)) ?? Infinity) -
      (orderIndex.get(normalizeItemType(b.type)) ?? Infinity)
  );

  const uniqueCombined = dedupedCombined.length > 0 ? dedupedCombined : effectiveCombined;

  const usedIds = new Set();

  console.log('[Debug] before filter:', effectiveCombined.map(x => x.type));
  const filtered = uniqueCombined
    .filter((item) => item && item.type)
    .map((item) => {
      let id = item.id;
      if (!id || usedIds.has(id)) {
        id = `${item.type}-${Math.random().toString(36).slice(2, 8)}`;
      }
      usedIds.add(id);
      const normalizedType = VALID_TYPES.has(item.type)
        ? item.type
        : item.type.toLowerCase().replace(/\s+/g, '-');
      return {
        ...item,
        type: normalizedType,
        id,
        animations: {
          entry: item.animations?.entry || 'fade-up',
          scroll: item.animations?.scroll,
          hover: item.animations?.hover,
          special: item.animations?.special,
          types: getSectionAnimationTypes(
            normalizedType,
            analysisResult?.animations?.types || []
          ),
        },
      };
    })
    .filter((item) => VALID_TYPES.has(item.type));

  console.log('[Debug] after filter:', filtered.map(x => x.type));
  const sanitized = filtered;

  if (sanitized.length === 0) throw new Error('No valid sections in AI response');
  return sanitized;
}
