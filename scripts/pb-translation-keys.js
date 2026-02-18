const { convertToTranslationKey } = require('../utils/helpers.ts');
// const PB_URL = 'https://uben-pocketbase-backend.fly.dev/api/collections';
const PB_URL = 'http://localhost:8080/api/collections';

async function main() {
  const nouns = await getAllNouns();
  for (const noun of nouns) {
    const translationKey = convertToTranslationKey(noun.english);
    console.log(`${noun.german} -> ${translationKey}`);
    await updateNoun(noun.id, translationKey);
  }
}

async function getAllNouns() {
  let page = 1;
  let totalPages = 0;
  const nouns = [];
  const response = await fetch(
    `${PB_URL}/nouns/records?page=${page}&perPage=200&key=0LEA3wy4uPfnZ3prfk8cWLmV55oDvyC4dRWVxNMRTmY=`,
  );
  const data = await response.json();
  totalPages = data.totalPages;
  nouns.push(...data.items);
  page = data.page;
  while (page <= totalPages) {
    console.log(`Fetching page ${page} of ${totalPages}`);
    const response = await fetch(
      `${PB_URL}/nouns/records?page=${page}&perPage=200&key=0LEA3wy4uPfnZ3prfk8cWLmV55oDvyC4dRWVxNMRTmY=`,
    );
    const data = await response.json();
    nouns.push(...data.items);
    page++;
  }
  return nouns;
}

async function updateNoun(nounId, translationKey) {
  const response = await fetch(`${PB_URL}/nouns/records/${nounId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ translation_key: translationKey }),
  });
  return response.json();
}

main();
