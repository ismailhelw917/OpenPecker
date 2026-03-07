import * as fzstd from 'fzstd';
import https from 'https';
import csv from 'csv-parser';
import { Transform } from 'stream';

class ZstdDecompressStream extends Transform {
  private decompress: any;

  constructor() {
    super();
    this.decompress = new fzstd.Decompress((chunk) => {
      this.push(Buffer.from(chunk));
    });
  }

  _transform(chunk, encoding, callback) {
    try {
      this.decompress.push(chunk);
      callback();
    } catch (err) {
      callback(err);
    }
  }
}

const req = https.get('https://database.lichess.org/lichess_db_puzzle.csv.zst', (res) => {
  const puzzles = [];
  const targetTheme = 'superRareThemeThatDoesNotExist';
  const targetCount = 400;
  const startTime = Date.now();

  const decompressStream = new ZstdDecompressStream();
  
  res.pipe(decompressStream)
    .pipe(csv(['PuzzleId', 'FEN', 'Moves', 'Rating', 'RatingDeviation', 'Popularity', 'NbPlays', 'Themes', 'GameUrl', 'OpeningTags']))
    .on('data', (data) => {
      if (data.Themes && data.Themes.includes(targetTheme)) {
        puzzles.push(data);
        if (puzzles.length >= targetCount) {
          console.log(`Found ${puzzles.length} puzzles in ${Date.now() - startTime}ms!`);
          req.destroy(); // Abort the request
          process.exit(0);
        }
      }
    })
    .on('end', () => {
      console.log(`Finished reading in ${Date.now() - startTime}ms. Found:`, puzzles.length);
      process.exit(0);
    })
    .on('error', (err) => {
      console.error('Error:', err);
      process.exit(1);
    });
});
