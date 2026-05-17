import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const PAGE_TYPE_PRESETS = {
  login: {
    pageType: 'login',
    sections: ['navbar', 'login-form'],
  },
  signup: {
    pageType: 'signup',
    sections: ['navbar', 'signup-form'],
  },
  'forgot-password': {
    pageType: 'forgot-password',
    sections: ['forgot-password'],
  },
  dashboard: {
    pageType: 'dashboard',
    sections: ['dashboard-header', 'dashboard-stats'],
  },
  landing: {
    pageType: 'landing',
    sections: ['navbar', 'hero', 'features', 'pricing', 'footer'],
  },
};

const MARKETING_SECTIONS = new Set([
  'hero', 'stats', 'features', 'how-it-works', 'testimonials', 'pricing', 'faq', 'cta', 'footer',
]);

const SYSTEM_MESSAGE = `CRITICAL OVERRIDE RULES - THESE CANNOT BE IGNORED:
- If prompt contains ANY of these words: signup, sign up, register, create account → pageType = 'signup', sections = ['navbar', 'signup-form'] ONLY
- If prompt contains ANY of these: login, sign in, log in, signin → pageType = 'login', sections = ['navbar', 'login-form'] ONLY
- If prompt contains: forgot password, reset password → pageType = 'forgot-password', sections = ['forgot-password'] ONLY
- If prompt contains: dashboard → pageType = 'dashboard'
- ONLY default to landing if none of the above match

You are a website strategist. Analyze the user prompt and return ONLY valid JSON.

JSON structure:
{
  "pageType": "login|signup|forgot-password|dashboard|landing",
  "sections": ["array of section types"],
  "industry": "string",
  "theme": "dark|light|colorful|minimal|glassmorphism",
  "style": "string",
  "colorScheme": "string",
  "animations": { "enabled": true, "types": [], "intensity": "medium" },
  "goal": "string",
  "tone": "string",
  "targetAudience": "string"
}

For signup page, sections must be: ["navbar", "signup-form"]
For login page, sections must be: ["navbar", "login-form"]
Do NOT add hero, features, pricing, testimonials, cta, footer for login/signup pages.

Return ONLY JSON. No explanation. No markdown.`;

function normalizePrompt(prompt) {
  return prompt
    .toLowerCase()
    .replace(/[_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasAny(text, patterns) {
  return patterns.some((pattern) => {
    if (pattern instanceof RegExp) return pattern.test(text);
    return text.includes(pattern);
  });
}

/**
 * Deterministic page-type detection — checked BEFORE OpenAI.
 * Order: forgot-password → signup → login → dashboard → explicit landing
 */
export function detectPageTypeFromPrompt(prompt) {
  const p = normalizePrompt(prompt);

  if (
    hasAny(p, [
      'forgot password',
      'forgot-password',
      'reset password',
      'password reset',
      'recover password',
    ])
  ) {
    return PAGE_TYPE_PRESETS['forgot-password'];
  }

  const signupPatterns = [
    'signup',
    'sign-up',
    'sign up',
    'signing up',
    'register',
    'registration',
    'create account',
    'create an account',
    'new account',
    /sign[\s-]*up/i,
    /signup[\s-]*page/i,
    /sign[\s-]*up[\s-]*page/i,
    /register[\s-]*page/i,
    /registration[\s-]*page/i,
    /create[\s-]*account/i,
  ];

  if (
    p === 'signup' ||
    p === 'register' ||
    p === 'sign up' ||
    hasAny(p, signupPatterns)
  ) {
    return PAGE_TYPE_PRESETS.signup;
  }

  const loginPatterns = [
    'login',
    'log-in',
    'log in',
    'logging in',
    'sign in',
    'sign-in',
    'signin',
    /log[\s-]*in/i,
    /sign[\s-]*in(?!g)/i,
    /login[\s-]*page/i,
    /signin[\s-]*page/i,
    /sign[\s-]*in[\s-]*page/i,
  ];

  if (
    p === 'login' ||
    p === 'signin' ||
    p === 'sign in' ||
    hasAny(p, loginPatterns)
  ) {
    return PAGE_TYPE_PRESETS.login;
  }

  if (hasAny(p, ['dashboard', 'admin dashboard', 'admin panel', 'control panel'])) {
    return PAGE_TYPE_PRESETS.dashboard;
  }

  if (hasAny(p, ['landing page', 'homepage', 'home page', 'marketing site', 'marketing page'])) {
    return PAGE_TYPE_PRESETS.landing;
  }

  return null;
}

function extractContextFromPrompt(userPrompt) {
  const p = normalizePrompt(userPrompt);

  const industryMap = [
    ['fintech', 'Fintech'],
    ['finance', 'Fintech'],
    ['healthcare', 'Healthcare'],
    ['ecommerce', 'E-commerce'],
    ['e-commerce', 'E-commerce'],
    ['saas', 'SaaS'],
    ['cybersecurity', 'Cybersecurity'],
    ['security', 'Cybersecurity'],
    ['agency', 'Agency'],
    ['restaurant', 'Restaurant'],
    ['education', 'Education'],
    ['crypto', 'Crypto'],
    ['ai ', 'AI'],
    ['artificial intelligence', 'AI'],
  ];

  let industry = 'Technology';
  for (const [keyword, label] of industryMap) {
    if (p.includes(keyword)) {
      industry = label;
      break;
    }
  }

  let theme = 'dark';
  if (p.includes('light mode') || p.includes('light theme') || /\blight\b/.test(p)) {
    theme = 'light';
  } else if (p.includes('glassmorphism') || p.includes('glass')) {
    theme = 'glassmorphism';
  } else if (p.includes('minimal')) {
    theme = 'minimal';
  } else if (p.includes('colorful') || p.includes('vibrant')) {
    theme = 'colorful';
  }

  let style = 'modern';
  if (p.includes('futuristic') || p.includes('cyberpunk')) style = 'futuristic';
  if (p.includes('corporate') || p.includes('professional')) style = 'corporate';
  if (p.includes('playful') || p.includes('fun')) style = 'playful';
  if (p.includes('luxury') || p.includes('premium')) style = 'luxury';

  // animations intentionally omitted — handled by applyAnimationOverrides / buildAnalysisFromPreset
  return {
    industry,
    theme,
    style,
    colorScheme: theme === 'dark' ? 'dark background with accent gradients' : 'clean light palette with accent color',
    goal: p.includes('signup') || p.includes('register')
      ? 'user registration'
      : p.includes('login') || p.includes('sign in')
        ? 'user authentication'
        : 'conversion and engagement',
    tone: p.includes('professional') ? 'professional and trustworthy' : 'bold and confident',
    targetAudience: `users in the ${industry} space`,
  };
}

function buildAnalysisFromPreset(preset, userPrompt) {
  const context = extractContextFromPrompt(userPrompt);

  return {
    pageType: preset.pageType,
    sections: [...preset.sections],
    ...context,
    industry: context.industry || 'general',
    animations: { enabled: true, types: [], intensity: 'medium' },
  };
}

function applyPageTypePreset(analysis, preset) {
  analysis.pageType = preset.pageType;
  analysis.sections = [...preset.sections];
}

function sanitizeSectionsForPageType(analysis) {
  const preset = PAGE_TYPE_PRESETS[analysis.pageType];
  if (!preset) return;

  const focusedTypes = ['login', 'signup', 'forgot-password', 'dashboard'];
  if (!focusedTypes.includes(analysis.pageType)) return;

  const current = Array.isArray(analysis.sections) ? analysis.sections : [];
  const hasStrayMarketing = current.some((s) => MARKETING_SECTIONS.has(s));
  if (hasStrayMarketing || current.length === 0) {
    analysis.sections = [...preset.sections];
  }
}

function applyPageTypeRules(analysis, userPrompt) {
  const detected = detectPageTypeFromPrompt(userPrompt);

  if (detected) {
    applyPageTypePreset(analysis, detected);
    return analysis;
  }

  if (!analysis.pageType || analysis.pageType === 'other') {
    applyPageTypePreset(analysis, PAGE_TYPE_PRESETS.landing);
    return analysis;
  }

  if (analysis.pageType === 'landing') {
    if (!Array.isArray(analysis.sections) || analysis.sections.length === 0) {
      analysis.sections = [...PAGE_TYPE_PRESETS.landing.sections];
    }
    return analysis;
  }

  sanitizeSectionsForPageType(analysis);
  return analysis;
}

function addAnimationType(analysis, type) {
  if (!analysis.animations.types.includes(type)) {
    analysis.animations.types.push(type);
  }
}

function applyAnimationOverrides(analysis, userPrompt) {
  const promptLower = normalizePrompt(userPrompt);
  analysis.animations = analysis.animations || { enabled: true, types: [], intensity: 'medium' };
  analysis.animations.types = analysis.animations.types || [];

  if (
    hasAny(promptLower, [
      'matrix rain',
      'matrix effect',
      'matrix',
      'hacker',
      'cyberpunk rain',
      'green rain',
      'hacker rain',
      'falling code',
      /matrix[\s-]*rain/i,
      /matrix[\s-]*effect/i,
    ])
  ) {
    addAnimationType(analysis, 'matrix-rain');
    analysis.animations.types = analysis.animations.types.filter((t) => t !== 'particles');
  }

  if (
    hasAny(promptLower, [
      'aurora',
      'northern lights',
      'aurora borealis',
      'aurora effect',
      /aurora[\s-]*background/i,
    ])
  ) {
    addAnimationType(analysis, 'aurora-background');
  }

  if (
    hasAny(promptLower, [
      'glitch',
      'glitch effect',
      'glitch text',
      'glitchy',
      'cyberpunk text',
      /glitch[\s-]*effect/i,
    ])
  ) {
    addAnimationType(analysis, 'glitch-effect');
  }

  if (
    hasAny(promptLower, [
      'magnetic',
      'magnetic button',
      'magnetic buttons',
      'magnetic hover',
      /magnetic[\s-]*button/i,
    ])
  ) {
    addAnimationType(analysis, 'magnetic-buttons');
  }

  if (
    hasAny(promptLower, [
      'tilt',
      '3d card',
      'tilt card',
      '3d effect',
      'card tilt',
      'hover tilt',
      /tilt[\s-]*card/i,
      /3d[\s-]*card/i,
    ])
  ) {
    addAnimationType(analysis, 'tilt-3d');
  }

  if (
    hasAny(promptLower, [
      'particles',
      'particle effect',
      'floating particles',
      'particle background',
      'flying dots',
      /particle[\s-]*effect/i,
    ])
  ) {
    addAnimationType(analysis, 'particles');
  }

  if (
    hasAny(promptLower, [
      'noise',
      'noise texture',
      'grain',
      'grainy',
      'film grain',
      'analog',
      /noise[\s-]*texture/i,
    ])
  ) {
    addAnimationType(analysis, 'noise-texture');
  }

  if (
    hasAny(promptLower, [
      'ripple',
      'ripple effect',
      'click ripple',
      'water ripple',
      /ripple[\s-]*effect/i,
    ])
  ) {
    addAnimationType(analysis, 'ripple');
  }

  if (
    hasAny(promptLower, [
      'blob',
      'morphing blob',
      'blob animation',
      'blob background',
      'morphing shapes',
      /blob[\s-]*animation/i,
    ])
  ) {
    addAnimationType(analysis, 'blob-animation');
  }

  if (
    hasAny(promptLower, [
      'typing',
      'typewriter',
      'typing effect',
      'typed text',
      'animated text',
      /typing[\s-]*effect/i,
    ])
  ) {
    addAnimationType(analysis, 'typing-effect');
  }

  if (
    hasAny(promptLower, [
      'glow',
      'glow effect',
      'glow pulse',
      'neon glow',
      'pulsing',
      'shimmer',
      /glow[\s-]*pulse/i,
    ])
  ) {
    addAnimationType(analysis, 'glow-pulse');
  }

  analysis.animations.types = [...new Set(analysis.animations.types)];
  return analysis;
}

export async function analyzePrompt(userPrompt) {
  const detectedPreset = detectPageTypeFromPrompt(userPrompt);

  if (detectedPreset) {
    const analysis = buildAnalysisFromPreset(detectedPreset, userPrompt);
    return applyAnimationOverrides(analysis, userPrompt);
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_MESSAGE },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
  });

  const parseText = (text) => text.trim()
    .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

  const rawText = parseText(completion.choices[0].message.content);

  let analysis;
  try {
    analysis = JSON.parse(rawText);
  } catch {
    const retry = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a JSON fixer. Return ONLY valid JSON.' },
        { role: 'user', content: `Fix this invalid JSON object for website analysis: ${rawText}` },
      ],
      temperature: 0.1,
    });
    analysis = JSON.parse(parseText(retry.choices[0].message.content));
  }

  applyPageTypeRules(analysis, userPrompt);
  return applyAnimationOverrides(analysis, userPrompt);
}
