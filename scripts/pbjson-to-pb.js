const categories = require('../pb-import-categories.json');
const nouns = require('../pb-import-nouns.json');

async function main() {
  const categoryPromises = categories.map((c) => {
    return fetch(`http://localhost:8080/api/collections/categories/records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(c),
    });
  });
  await Promise.all(categoryPromises);
  const nounPromises = nouns.map((n) => {
    return fetch(`http://localhost:8080/api/collections/nouns/records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(n),
    });
  });
  await Promise.all(nounPromises);
}

main();
