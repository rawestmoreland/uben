// Helper function to fetch all records with pagination
async function fetchAllRecords(collection) {
  const baseUrl = `https://uben-pocketbase-backend.fly.dev/api/collections/${collection}/records`;
  const allRecords = [];
  let page = 1;
  let totalPages = 1;
  const perPage = 500; // Max records per page

  do {
    const response = await fetch(`${baseUrl}?page=${page}&perPage=${perPage}`);
    const data = await response.json();
    
    allRecords.push(...data.items);
    totalPages = data.totalPages || 1;
    
    console.log(`Fetched page ${page}/${totalPages} of ${collection} (${data.items.length} records)`);
    page++;
  } while (page <= totalPages);

  return allRecords;
}

(async () => {
  console.log('Starting date backfill for nouns...');
  
  // Fetch all nouns with pagination
  const nouns = await fetchAllRecords('nouns');
  console.log(`Total nouns fetched: ${nouns.length}`);

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weekAgoString = weekAgo.toISOString();

  // Update all nouns
  const updatePromises = nouns.map((noun) => {
    return fetch(
      `https://uben-pocketbase-backend.fly.dev/api/collections/nouns/records/${noun.id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          created: weekAgoString,
          updated: weekAgoString,
        }),
      },
    );
  });
  
  await Promise.all(updatePromises);
  console.log(`Successfully updated ${nouns.length} nouns`);
})();
