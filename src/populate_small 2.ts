import Database from 'better-sqlite3';

const db = new Database('puzzles.db');
const themes = ['mate', 'fork', 'pin', 'skewer', 'discoveredAttack', 'sacrifice', 'endgame', 'middlegame', 'opening', 'defensiveMove', 'advantage', 'crushing', 'long', 'short', 'master', 'hangingPiece', 'attraction', 'deflection', 'doubleCheck', 'backRankMate', 'smotheredMate', 'clearance', 'interference', 'xRayAttack', 'zugzwang'];

async function populate() {
  const insertStmt = db.prepare('INSERT OR IGNORE INTO puzzles (id, theme, rating, data) VALUES (?, ?, ?, ?)');
  
  for (const theme of themes) {
    console.log(`Populating theme: ${theme}`);
    // Fetch 5 puzzles for each theme
    for (let i = 0; i < 5; i++) {
      try {
        const themeParam = theme === 'opening' ? '' : `?theme=${encodeURIComponent(theme)}`;
        const response = await fetch(`https://lichess.org/api/puzzle/next${themeParam}`, {
          headers: { 
            'Accept': 'application/json',
            'User-Agent': 'OpenPecker/1.0 (ismail.helw@gmail.com)'
          }
        });
        if (response.ok) {
          const puzzle = await response.json();
          if (puzzle && puzzle.puzzle && puzzle.puzzle.id) {
            insertStmt.run(puzzle.puzzle.id, theme, puzzle.puzzle.rating, JSON.stringify(puzzle));
          }
        }
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
      } catch (e) {}
    }
  }
}

populate().then(() => console.log('Done')).catch(console.error);
