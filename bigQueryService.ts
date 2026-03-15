export async function fetchBigQueryPuzzles(theme: string, minRating: number, maxRating: number, count: number) {
  const response = await fetch(`/api/bigquery/puzzles?theme=${theme}&minRating=${minRating}&maxRating=${maxRating}&count=${count}`);
  if (!response.ok) {
    throw new Error('Failed to fetch puzzles from BigQuery');
  }
  return await response.json();
}
