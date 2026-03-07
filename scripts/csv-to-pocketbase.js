const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { convertToTranslationKey } = require('../utils/helpers.ts');

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const PB_URL = 'https://uben-pocketbase-backend.fly.dev/api/collections';
const main = async () => {
  const categories = await getCategories();

  const nounJson = [];

  const csvFilePath = path.join(
    // eslint-disable-next-line no-undef
    __dirname,
    '..',
    'database',
    'seeds',
    'nouns',
    'goethe-a2.csv',
  );
  fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on('data', (data) => nounJson.push(data))
    .on('end', async () => {
      const level = 'A2';
      const sources = ['Goethe'];

      const total = nounJson.length;
      let inserted = 0;
      let updated = 0;

      for (const noun of nounJson) {
        // Default to the general category id
        const categoryId =
          categories.find((c) => c.name === noun.category)?.id ??
          '0gskxzb0mphm3f0';
        const existingNoun = await getNoun(noun.german, noun.article);
        if (existingNoun) {
          // Preserve the lowest (earliest) level — don't overwrite 'A1' with 'A2'
          const keepLevel =
            LEVELS.indexOf(existingNoun.level) <= LEVELS.indexOf(level)
              ? existingNoun.level
              : level;
          // Merge sources rather than overwrite — a word can come from multiple lists
          const mergedSources = [
            ...new Set([...(existingNoun.sources ?? []), ...sources]),
          ];
          await updateNoun(existingNoun.id, {
            ...existingNoun,
            level: keepLevel,
            sources: mergedSources,
            category: categoryId,
          });
          updated++;
          continue;
        }
        await insertNoun({ ...noun, level, sources, category: categoryId });
        inserted++;
      }
      console.log(
        `Total: ${total}, Inserted: ${inserted}, Updated: ${updated}`,
      );
    });
};

const insertNoun = async (payload) => {
  try {
    const translationKey = payload.english
      ? convertToTranslationKey(payload.english)
      : '';
    const response = await fetch(`${PB_URL}/nouns/records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...payload, translation_key: translationKey }),
    });

    if (!response.ok) {
      throw new Error(`Failed to insert noun: ${response.statusText}`);
    }
    return response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
  }
};

const getNoun = async (german, article) => {
  try {
    const response = await fetch(
      `${PB_URL}/nouns/records?filter=german='${german}'&&article='${article}'&key=0LEA3wy4uPfnZ3prfk8cWLmV55oDvyC4dRWVxNMRTmY=`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
    if (!response.ok) {
      throw new Error(`Failed to get noun: ${response.statusText}`);
    }
    const data = await response.json();
    console.log(data);
    return data.items[0];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
  }
};

const updateNoun = async (id, payload) => {
  try {
    const translationKey = payload.english
      ? convertToTranslationKey(payload.english)
      : '';
    const response = await fetch(`${PB_URL}/nouns/records/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...payload, translation_key: translationKey }),
    });
    if (!response.ok) {
      throw new Error(`Failed to update noun: ${response.statusText}`);
    }
    return response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
  }
};

const getCategories = async () => {
  try {
    const response = await fetch(
      `${PB_URL}/categories/records?perPage=100&key=0LEA3wy4uPfnZ3prfk8cWLmV55oDvyC4dRWVxNMRTmY=`,
    );
    if (!response.ok) {
      throw new Error(`Failed to get categories: ${response.statusText}`);
    }
    const data = await response.json();
    return data.items;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
  }
};

main();
