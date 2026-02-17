const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const PB_URL = 'https://uben-pocketbase-backend.fly.dev/api/collections';
const main = async () => {
  const categories = await getCategories();

  console.log(categories);

  const nounJson = [];

  const csvFilePath = path.join(
    // eslint-disable-next-line no-undef
    __dirname,
    '..',
    'database',
    'seeds',
    'nouns',
    'goethe-a1.csv',
  );
  fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on('data', (data) => nounJson.push(data))
    .on('end', async () => {
      const level = 'A1';
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
          await updateNoun(existingNoun.id, {
            ...existingNoun,
            level,
            sources,
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

const insertNoun = async (paylod) => {
  try {
    const response = await fetch(`${PB_URL}/nouns/records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paylod),
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

const updateNoun = async (id, paylod) => {
  try {
    const response = await fetch(`${PB_URL}/nouns/records/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paylod),
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
