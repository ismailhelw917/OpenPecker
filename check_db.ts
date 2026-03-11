import Database from "better-sqlite3";
const db = new Database('puzzles.db');
const count = (db.prepare('SELECT COUNT(*) as count FROM puzzles').get() as any).count;
console.log('Puzzle count:', count);
const samples = db.prepare('SELECT theme, rating FROM puzzles LIMIT 5').all();
console.log('Samples:', samples);
