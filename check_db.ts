import Database from "better-sqlite3";
const db = new Database('puzzles.db');
const puzzles = db.prepare('SELECT data FROM puzzles WHERE theme = ? LIMIT 5').all('opening');
const parsed = puzzles.map(p => JSON.parse((p as any).data));
console.log('Opening puzzle colors (inferred):', parsed.map(p => (p.puzzle.initialPly % 2 === 1 ? 'white' : 'black')));
