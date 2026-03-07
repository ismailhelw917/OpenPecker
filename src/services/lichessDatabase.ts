import * as fzstd from 'fzstd';
import { PuzzleData } from '../types';

export interface PuzzleSearchOptions {
  themes?: string[];
  minRating?: number;
  maxRating?: number;
  limit?: number;
}

export async function searchLichessPuzzles(
  options: PuzzleSearchOptions,
  onProgress?: (count: number) => void
): Promise<PuzzleData[]> {
  const limit = options.limit || 400;
  const results: PuzzleData[] = [];
  
  const response = await fetch('https://database.lichess.org/lichess_db_puzzle.csv.zst');
  if (!response.body) {
    throw new Error('Failed to fetch puzzle database');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let csvBuffer = '';
  let isCanceled = false;

  return new Promise((resolve, reject) => {
    const decompressor = new fzstd.Decompress((chunk, isLast) => {
      if (isCanceled) return;
      
      const text = decoder.decode(chunk, { stream: !isLast });
      csvBuffer += text;

      // Process complete lines
      const lines = csvBuffer.split('\n');
      // Keep the last incomplete line in the buffer
      csvBuffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim() || line.startsWith('PuzzleId')) continue;

        // Parse line manually
        // Format: PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags
        const parts = line.split(',');
        if (parts.length < 9) continue;

        const id = parts[0];
        const fen = parts[1];
        const moves = parts[2].split(' ');
        const rating = parseInt(parts[3], 10);
        const themes = parts[7].split(' ');

        // Apply filters
        let match = true;
        if (options.minRating !== undefined && rating < options.minRating) match = false;
        if (options.maxRating !== undefined && rating > options.maxRating) match = false;
        if (options.themes && options.themes.length > 0) {
          const hasAllThemes = options.themes.every(t => themes.includes(t));
          if (!hasAllThemes) match = false;
        }

        if (match) {
          results.push({
            puzzle: {
              id,
              fen,
              solution: moves.slice(1), // The first move is the initial move
              initialMove: moves[0],
              rating,
              plays: parseInt(parts[6], 10),
              themes: themes,
            },
          });

          if (onProgress) {
            onProgress(results.length);
          }

          if (results.length >= limit) {
            isCanceled = true;
            reader.cancel();
            resolve(results);
            return;
          }
        }
      }

      if (isLast && !isCanceled) {
        resolve(results);
      }
    });

    const processStream = async () => {
      try {
        while (!isCanceled) {
          const { done, value } = await reader.read();
          if (done) {
            decompressor.push(new Uint8Array(0), true);
            break;
          }
          if (value) {
            decompressor.push(value);
          }
        }
      } catch (err) {
        reject(err);
      }
    };

    processStream();
  });
}
