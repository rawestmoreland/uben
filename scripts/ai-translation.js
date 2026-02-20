const path = require('path');
const z = require('zod');
const { Anthropic } = require('@anthropic-ai/sdk');

// eslint-disable-next-line no-undef
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const PB_URL = 'https://uben-pocketbase-backend.fly.dev/api/collections';
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const LANGUAGE = 'Italian';
const LOCALE = 'it';

const TranslationResponseSchema = z.array(
  z.object({
    id: z.string(),
    translation: z.string(),
  }),
);

async function main() {
  const anthropic = new Anthropic({
    apiKey: CLAUDE_API_KEY,
  });
  const nouns = await getAllNouns();
  if (!nouns || nouns.length === 0) {
    console.log('No nouns found. Exiting.');
    return;
  }

  const chunked = chunkNouns(nouns);
  const totalChunks = chunked.length;
  console.log(
    `Translating ${nouns.length} nouns in ${totalChunks} chunk(s)...`,
  );

  let totalUpserted = 0;
  const startTime = Date.now();

  for (let i = 0; i < chunked.length; i++) {
    const chunk = chunked[i];
    const chunkLabel = `[${i + 1}/${totalChunks}]`;
    const chunkLength = chunk.length;

    const chunkStart = Date.now();
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2050,
      temperature: 0.0,
      system: `You are a German-to-${LANGUAGE} translator specializing in vocabulary for language learners. Translate each German noun into ${LANGUAGE}. Use the English meaning to resolve any ambiguity. Return ONLY a valid JSON array, no explanation or extra text.`,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Translate these German nouns into ${LANGUAGE}. Match the English meaning exactly.\n\n  <nouns>\n${JSON.stringify(chunk, null, 4)}\n  </nouns>\n\nReturn ONLY a JSON array in this exact format, no other text:\n[{"id": "...", "translation": "..."}]`,
            },
          ],
        },
        {
          role: 'assistant',
          content: '[',
        },
      ],
    });
    const apiMs = Date.now() - chunkStart;
    const parsedResponse = JSON.parse('[' + response.content[0].text);
    const validationResponse =
      TranslationResponseSchema.safeParse(parsedResponse);

    if (!validationResponse.success) {
      console.error(
        `${chunkLabel} Invalid response schema: ${validationResponse.error.message}`,
      );
      continue;
    }

    if (parsedResponse.length !== chunkLength) {
      console.error(
        `${chunkLabel} Length mismatch: expected ${chunkLength}, got ${parsedResponse.length}. Skipping chunk.`,
      );
      continue;
    }

    for (const translation of parsedResponse) {
      await upsertNounTranslation(
        translation.id,
        LOCALE,
        translation.translation,
      );
    }

    totalUpserted += parsedResponse.length;
    console.log(
      `${chunkLabel} ${parsedResponse.length} translations upserted (${apiMs}ms)`,
    );
  }

  const totalMs = Date.now() - startTime;
  console.log(
    `\nDone — ${totalUpserted}/${nouns.length} upserted in ${(totalMs / 1000).toFixed(1)}s`,
  );
}

async function getAllNouns() {
  try {
    let page = 1;
    let totalPages = 0;
    const nouns = [];
    const response = await fetch(
      `${PB_URL}/nouns/records?perPage=50&key=${process.env.EXPO_PUBLIC_PB_API_KEY}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
    const data = await response.json();
    totalPages = data.totalPages;

    while (page <= totalPages) {
      const response = await fetch(
        `${PB_URL}/nouns/records?page=${page}&perPage=50&key=${process.env.EXPO_PUBLIC_PB_API_KEY}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
      const data = await response.json();
      nouns.push(...data.items);
      page++;
    }

    return nouns;
  } catch (error) {
    console.error(error);
    return [];
  }
}

function chunkNouns(nouns, size = 50) {
  const chunked = [];
  if (!!nouns && nouns.length > size) {
    for (let i = 0; i < Math.ceil(nouns.length / size); i++) {
      let start = i * size;
      let end = start + size;
      chunked.push(nouns.slice(start, end));
    }
  } else {
    chunked.push([...nouns]);
  }
  return chunked;
}

async function upsertNounTranslation(nounId, locale, translation) {
  // Check if the translation already exists
  let shouldUpdate = false;
  let existingTranslationId = null;
  try {
    const existingTranslation = await fetch(
      `${PB_URL}/noun_translations/records?filter=noun_id='${nounId}'&&locale='${locale}'`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
    if (existingTranslation.ok) {
      const data = await existingTranslation.json();
      if (data.items.length > 0) {
        shouldUpdate =
          data.items[0].translation.toLowerCase() !== translation.toLowerCase();
        existingTranslationId = data.items[0].id;
      }
    }

    if (shouldUpdate) {
      // Update
      const response = await fetch(
        `${PB_URL}/noun_translations/records/${existingTranslationId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ translation }),
        },
      );
      return response.json();
    } else {
      // Create
      const response = await fetch(`${PB_URL}/noun_translations/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          noun_id: nounId,
          locale,
          translation,
        }),
      });
      return response.json();
    }
  } catch (error) {
    console.error(`Error upserting noun translation: ${error.message}`);
    return null;
  }
}

main();
