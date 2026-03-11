import Database from "better-sqlite3";
import fs from "fs";

const db = new Database('puzzles.db');

async function test() {
  const rows = db.prepare('SELECT data FROM puzzles').all() as { data: string }[];
  const puzzles = rows.map(row => JSON.parse(row.data));
  fs.writeFileSync('puzzles_static.json', JSON.stringify(puzzles, null, 2));
  console.log(`Exported ${puzzles.length} puzzles to puzzles_static.json`);
}

test().catch(console.error);
