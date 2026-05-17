import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_MESSAGE = `You are a website section editor.
You will receive an existing website section JSON and a user instruction describing how to update it.
Return ONLY the updated section as a valid JSON object with no extra text, no markdown, no code blocks.

Rules:
- Keep the same "id" and "type" fields exactly as provided
- Only update the "props" based on the user instruction
- Do not add or remove top-level fields (id, type, props)
- Do not regenerate other sections or return an array`;

export async function regenerateSection(sectionJSON, userInstruction) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_MESSAGE },
      {
        role: 'user',
        content: JSON.stringify({
          existingSection: sectionJSON,
          instruction: userInstruction,
        }),
      },
    ],
    temperature: 0.4,
  });

  const rawText = completion.choices[0].message.content.trim()
    .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

  try {
    const updated = JSON.parse(rawText);

    if (updated.id !== sectionJSON.id || updated.type !== sectionJSON.type) {
      throw new Error('Model changed section id or type, which is not allowed');
    }

    return updated;
  } catch (err) {
    throw new Error(`Failed to parse regenerated section as JSON: ${err.message}`);
  }
}
