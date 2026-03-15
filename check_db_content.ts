import Database from "better-sqlite3";
const db = new Database('puzzles.db');
const puzzles = db.prepare('SELECT data FROM puzzles LIMIT 5').all();
puzzles.forEach((p, i) => {
  const data = JSON.parse((p as any).data);
  console.log(`Puzzle ${i}:`, JSON.stringify(data, null, 2));
});
