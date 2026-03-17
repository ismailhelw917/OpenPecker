export async function fetchBigQueryPuzzles(theme: string, minRating: number, maxRating: number, count: number) {
  const response = await fetch(`/api/bigquery/puzzles?theme=${theme}&minRating=${minRating}&maxRating=${maxRating}&count=${count}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Failed to fetch puzzles from BigQuery');
  }
  return await response.json();
}

export async function fetchBigQueryOpenings() {
  const response = await fetch('/api/bigquery/openings');
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Failed to fetch openings from BigQuery');
  }
  return await response.json();
}

export async function fetchBigQueryStats() {
  const response = await fetch('/api/bigquery/puzzles/stats');
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Failed to fetch stats from BigQuery');
  }
  return await response.json();
}
