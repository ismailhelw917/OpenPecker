import Database from 'better-sqlite3';

const db = new Database('puzzles.db');
const themes = ['mate', 'fork'];

async function populate() {
  const insertStmt = db.prepare('INSERT OR IGNORE INTO puzzles (id, theme, rating, data) VALUES (?, ?, ?, ?)');
  
  for (const theme of themes) {
    console.log(`Populating theme: ${theme}`);
    for (let i = 0; i < 5; i++) {
      try {
        const response = await fetch(`https://lichess.org/api/puzzle/next?theme=${theme}`, {
          headers: { 'User-Agent': 'OpenPecker/1.0' }
        });
        if (response.ok) {
          const puzzle = await response.json();
          insertStmt.run(puzzle.puzzle.id, theme, puzzle.puzzle.rating, JSON.stringify(puzzle));
          console.log(`Inserted puzzle ${puzzle.puzzle.id} for ${theme}`);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }
}

populate();
