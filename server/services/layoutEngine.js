import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const PAGE_TYPE_LAYOUTS = {
  login: [
    { type: 'navbar', order: 0, spacing: '0px' },
    { type: 'login-form', order: 1, spacing: '0px' },
  ],
  signup: [
    { type: 'navbar', order: 0, spacing: '0px' },
    { type: 'signup-form', order: 1, spacing: '0px' },
  ],
  'forgot-password': [
    { type: 'forgot-password', order: 0, spacing: '0px' },
  ],
  dashboard: [
    { type: 'navbar', order: 0, spacing: '0px' },
    { type: 'stats', order: 1, spacing: '80px' },
    { type: 'features', order: 2, spacing: '80px' },
  ],
};

const SYSTEM_MESSAGE = `CRITICAL: Read the pageType field in the analysis object. Generate layout ONLY for the requested page type. Do NOT add hero/features/pricing/testimonials/cta/footer to login, signup, or dashboard pages.

You are a website layout planner.
Given a website analysis object, generate a layout plan.
Return ONLY a valid JSON array with no extra text, no markdown, no code blocks.

Each item must follow this exact structure:
{ "type": "section name", "order": number, "spacing": "value in px" }

Choose section types based on the page type requested:

For LANDING PAGE (use ONLY when pageType is landing or unspecified): navbar, hero, features, about, pricing, testimonials, faq, contact, footer
For LOGIN PAGE: login-form (just this one section, maybe with navbar)
For SIGNUP PAGE: signup-form (just this one section, maybe with navbar)
For FORGOT PASSWORD: forgot-password
For DASHBOARD: dashboard-header, dashboard-sidebar, dashboard-stats, dashboard-table
For BLOG: navbar, blog-list, footer
For PORTFOLIO: navbar, hero, portfolio, contact, footer
For ERROR 404: error-404
For COMING SOON: coming-soon

Match the layout to what the user actually asked for.
Do not force a landing page structure on non-landing page requests.
Do not include any theme or color information.`;

const fallbackLayout = {
  structure: 'single-column',
  sections: [
    { type: 'navbar', order: 0, width: 'full', sticky: true },
    { type: 'hero', order: 1, width: 'full' },
    { type: 'features', order: 2, width: 'full' },
    { type: 'cta', order: 3, width: 'full' },
    { type: 'footer', order: 4, width: 'full' }
  ]
};

function validateLayout(layout) {
  const sections = Array.isArray(layout) ? layout : (layout?.sections || []);

  if (!sections || sections.length < 1) {
    return fallbackLayout;
  }

  const validatedSections = sections
    .map((s, i) => ({
      type: s.type || 'hero',
      order: typeof s.order === 'number' ? s.order : i,
      width: s.width || 'full',
      spacing: s.spacing,
    }))
    .sort((a, b) => a.order - b.order)
    .map((s, i) => ({ ...s, order: i }));

  return {
    structure: layout.structure || 'single-column',
    sections: validatedSections,
  };
}

export async function generateLayout(analysisResult) {
  const pageType = analysisResult?.pageType;
  if (PAGE_TYPE_LAYOUTS[pageType]) {
    return validateLayout(PAGE_TYPE_LAYOUTS[pageType]);
  }

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

  let layout;
  try {
    layout = JSON.parse(rawText);
  } catch {
    const retry = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a JSON fixer. Return ONLY valid JSON array.' },
        { role: 'user', content: `Fix this invalid JSON array for website layout: ${rawText}` },
      ],
      temperature: 0.1,
    });
    try {
      layout = JSON.parse(parseText(retry.choices[0].message.content));
    } catch {
      return fallbackLayout;
    }
  }

  return validateLayout(layout);
}
