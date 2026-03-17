console.log("[SERVER] Starting server.ts...");
import express from "express";
console.log('[SERVER] Starting...');
import { createServer as createViteServer } from "vite";
import { BigQuery } from "@google-cloud/bigquery";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import Stripe from "stripe";
import Database from "better-sqlite3";
import crypto from "crypto";
import { sampleRouter } from "./routes/sample";
import { chessRouter } from "./routes/chess";
import fs from "fs";

// Global error handlers to prevent crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize BigQuery client lazily
let bigquery: BigQuery | null = null;
function getBigQuery() {
  if (!bigquery) {
    const projectId = process.env.BIGQUERY_PROJECT_ID;
    const clientEmail = process.env.BIGQUERY_CLIENT_EMAIL;
    const privateKey = process.env.BIGQUERY_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (projectId && clientEmail && privateKey) {
      bigquery = new BigQuery({
        projectId,
        credentials: {
          client_email: clientEmail,
          private_key: privateKey,
        }
      });
      console.log('[SERVER] BigQuery initialized with provided credentials.');
    } else {
      console.log('[SERVER] BigQuery credentials missing from environment variables. Initializing with Application Default Credentials.');
      bigquery = new BigQuery();
    }
  }
  return bigquery;
}

// Initialize SQLite database for puzzles
const db = new Database('puzzles.db');
try {
  db.pragma('journal_mode = WAL');

  // Check if we need to migrate the primary key to support multiple themes per puzzle
  const tableInfo = db.pragma('table_info(puzzles)') as any[];
  if (tableInfo.length > 0) {
    const pkCount = tableInfo.filter(col => col.pk > 0).length;
    if (pkCount === 1) {
      console.log('Migrating puzzles table to composite primary key (id, theme)...');
      db.exec(`
        CREATE TABLE puzzles_new (
          id TEXT,
          theme TEXT NOT NULL,
          data TEXT NOT NULL,
          rating INTEGER,
          PRIMARY KEY (id, theme)
        );
        INSERT OR IGNORE INTO puzzles_new (id, theme, data, rating) SELECT id, theme, data, rating FROM puzzles;
        DROP TABLE puzzles;
        ALTER TABLE puzzles_new RENAME TO puzzles;
        CREATE INDEX IF NOT EXISTS idx_theme ON puzzles(theme);
        CREATE INDEX IF NOT EXISTS idx_rating ON puzzles(rating);
      `);
    }
  } else {
    // Create puzzles table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS puzzles (
        id TEXT,
        theme TEXT NOT NULL,
        data TEXT NOT NULL,
        rating INTEGER,
        PRIMARY KEY (id, theme)
      );
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        is_premium INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS puzzle_sets (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        device_id TEXT,
        opening_slug TEXT,
        opening_display TEXT,
        puzzle_count INTEGER,
        target_cycles INTEGER,
        cycles_completed INTEGER,
        status TEXT,
        best_accuracy REAL,
        total_attempts INTEGER,
        puzzles_json TEXT,
        last_played_at DATETIME
      );
      CREATE TABLE IF NOT EXISTS cycle_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        device_id TEXT,
        set_id TEXT,
        cycle INTEGER,
        total_puzzles INTEGER,
        correct_count INTEGER,
        total_time_ms INTEGER,
        completed_at DATETIME
      );
      CREATE INDEX IF NOT EXISTS idx_theme ON puzzles(theme);
      CREATE INDEX IF NOT EXISTS idx_rating ON puzzles(rating);
    `);
  }

  // Populate from puzzles_static.json if empty
  const count = (db.prepare('SELECT COUNT(*) as count FROM puzzles').get() as any).count;
  console.log(`[SERVER] Database count: ${count}`);
  if (false) {
    console.log('Populating database from puzzles_static.json...');
    const dataPath = path.join(process.cwd(), 'data/puzzles_static.json');
    console.log(`[SERVER] Reading from: ${dataPath}`);
    const data = fs.readFileSync(dataPath, 'utf8');
    console.log(`[SERVER] Read file, parsing JSON...`);
    const puzzles = JSON.parse(data);
    console.log(`[SERVER] Found ${puzzles.length} puzzles in JSON.`);
    const insertStmt = db.prepare('INSERT OR IGNORE INTO puzzles (id, theme, rating, data) VALUES (?, ?, ?, ?)');
    let populatedCount = 0;
    
    console.log(`[SERVER] Starting transaction...`);
    db.transaction(() => {
      for (const puzzle of puzzles.slice(0, 100)) {
        if (puzzle.puzzle && puzzle.puzzle.id && puzzle.puzzle.themes) {
          for (const theme of puzzle.puzzle.themes) {
            insertStmt.run(puzzle.puzzle.id, theme, puzzle.puzzle.rating, JSON.stringify(puzzle));
            populatedCount++;
          }
        }
      }
    })();
    console.log(`[SERVER] Transaction finished.`);
    
    console.log(`Populated ${puzzles.length} unique puzzles (${populatedCount} theme-entries).`);
  }
} catch (err) {
  console.error('Database initialization failed:', err);
}
let stripeClient: Stripe | null = null;
function getStripe() {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      console.warn("STRIPE_SECRET_KEY is not set. Stripe features will be disabled.");
      return null;
    }
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

async function startServer() {
  console.log('[SERVER] startServer called');
  // Verify schema
  try {
    const info = db.pragma('table_info(puzzles)') as any[];
    const hasRating = info.some(col => col.name === 'rating');
    if (!hasRating) {
      console.log('Migrating: Adding rating column to puzzles table');
      db.exec('ALTER TABLE puzzles ADD COLUMN rating INTEGER');
      db.exec('CREATE INDEX IF NOT EXISTS idx_rating ON puzzles(rating)');
    }
    const totalPuzzles = (db.prepare('SELECT COUNT(*) as count FROM puzzles').get() as any).count;
    console.log(`[SERVER] Reservoir contains ${totalPuzzles} puzzles.`);
    if (totalPuzzles === 0) {
      console.log('[SERVER] Populating dummy data...');
      const insertStmt = db.prepare('INSERT OR IGNORE INTO puzzles (id, theme, rating, data) VALUES (?, ?, ?, ?)');
      insertStmt.run('test1', 'opening', 1500, JSON.stringify({ puzzle: { id: 'test1', initialPly: 0 }, game: { color: 'white' } }));
      insertStmt.run('test2', 'opening', 1500, JSON.stringify({ puzzle: { id: 'test2', initialPly: 0 }, game: { color: 'white' } }));
      console.log('[SERVER] Dummy data populated.');
    }
  } catch (e) {
    console.error('Schema verification failed:', e);
  }

  const app = express();
  const PORT = 3000;

  // 1. Health check - MUST be first to respond to platform probes
  app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use(cors({
    origin: true,
    credentials: true,
  }));

  app.use(express.json());

  app.use((req, res, next) => {
    const host = req.headers.host;
    if (host === 'www.openpecker.com') {
      return res.redirect(301, `https://openpecker.com${req.url}`);
    }
    console.log(`[DEBUG] Incoming request: ${req.method} ${req.url} (Host: ${host})`);
    next();
  });

  app.get('/api/version', (req, res) => {
    res.json({ version: '1.1.1', timestamp: new Date().toISOString() });
  });

  app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working' });
  });

  // Handle /openpecker specifically if requested
  app.get('/openpecker', (req, res) => {
    if (process.env.NODE_ENV === "production") {
      res.sendFile(path.join(distPath, "index.html"));
    } else {
      // In dev, Vite handles this, but we can redirect to /
      res.redirect('/');
    }
  });

  // Batch puzzle endpoint as requested by user
  app.get('/api/puzzles/batch', async (req, res) => {
    console.log('[DEBUG] /api/puzzles/batch called');
    console.log('[BATCH] Request received:', req.query);
    const { minRating, maxRating, count = 10, theme, color } = req.query;
    const minR = parseInt(minRating as string) || 0;
    const maxR = parseInt(maxRating as string) || 3000;
    const requestedCount = parseInt(count as string) || 10;
    const themeStr = theme as string;
    let colorFilter = color as string;
    if (colorFilter === 'undefined' || colorFilter === 'null') {
      colorFilter = 'both';
    }
    console.log(`[BATCH] Parsed: rating=${minR}-${maxR}, count=${requestedCount}, theme=${themeStr}, color=${colorFilter}`);
    if (!themeStr) {
      console.warn(`[BATCH] Missing required fields: theme=${themeStr}`);
      return res.status(400).json({ error: "Theme is required." });
    }
    const rawThemes = themeStr.split(',').map(t => t.trim()).filter(t => t.length > 0);
    console.log(`[BATCH] Raw themes:`, rawThemes);
    try {
      if (rawThemes.length === 0) {
        return res.status(400).json({ error: "At least one valid theme is required." });
      }

      // Normalize themes: "Sicilian Defense" -> "sicilianDefense", "Checkmate" -> "mate"
      const mappedThemes = rawThemes.map(t => {
        if (t.toLowerCase() === 'checkmate') return 'mate';
        if (t.toLowerCase() === 'opening') return 'opening';
        if (t.toLowerCase() === 'middlegame') return 'middlegame';
        if (t.toLowerCase() === 'endgame') return 'endgame';
        
        // Convert "Sicilian Defense" to "sicilianDefense"
        const camelCase = t.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
          return index === 0 ? word.toLowerCase() : word.toUpperCase();
        }).replace(/\s+/g, '');
        
        return camelCase;
      });
      
      const puzzles: any[] = [];
      const puzzleIds = new Set<string>();
      
      console.log(`[BATCH] Searching DB for themes: ${mappedThemes.join(', ')} (from ${rawThemes.join(', ')}) between ${minR}-${maxR}`);
      
      // 0. Try BigQuery first if configured
      const bigQueryTable = process.env.BIGQUERY_TABLE_ID;
      if (bigQueryTable) {
        console.log(`[BATCH] Attempting BigQuery fetch from ${bigQueryTable}`);
        try {
          const bq = getBigQuery();
          const bqQuery = `
            SELECT data
            FROM \`${bigQueryTable}\`
            WHERE theme IN UNNEST(@themes)
            AND rating >= @minRating
            AND rating <= @maxRating
            ORDER BY RAND()
            LIMIT @count
          `;
          const [rows] = await bq.query({
            query: bqQuery,
            params: { 
              themes: mappedThemes, 
              minRating: minR, 
              maxRating: maxR, 
              count: requestedCount 
            }
          });
          
          rows.forEach((row: any) => {
            try {
              const p = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
              if (p && p.puzzle && !puzzleIds.has(p.puzzle.id) && (!colorFilter || colorFilter === 'both' || p.game.color === colorFilter)) {
                puzzles.push(p);
                puzzleIds.add(p.puzzle.id);
              }
            } catch (e) {}
          });
          console.log(`[BATCH] BigQuery found ${puzzles.length} puzzles.`);
        } catch (bqErr: any) {
          console.error(`[BATCH] BigQuery error:`, bqErr.message);
        }
      }

      // 1. Fetch from DB reservoir for all themes
      for (const t of mappedThemes) {
        const countPerTheme = Math.ceil(requestedCount / mappedThemes.length);
        
        // Try both normalized and raw theme just in case
        const rows = db.prepare('SELECT data FROM puzzles WHERE (theme = ? OR theme = ?) AND rating >= ? AND rating <= ? ORDER BY RANDOM() LIMIT ?')
                     .all(t, rawThemes[mappedThemes.indexOf(t)], minR, maxR, countPerTheme) as { data: string }[];
        
        rows.forEach(row => {
          try {
            const p = JSON.parse(row.data);
            const puzzleColor = p.puzzle.initialPly % 2 === 0 ? 'white' : 'black';
            if (!puzzleIds.has(p.puzzle.id) && (!colorFilter || colorFilter === 'both' || puzzleColor === colorFilter)) {
              puzzles.push(p);
              puzzleIds.add(p.puzzle.id);
            }
          } catch (e) {}
        });
      }

      console.log(`[BATCH] Found ${puzzles.length} puzzles in DB. Needed: ${requestedCount}`);
      
      if (puzzles.length === 0) {
        console.warn(`[BATCH] No puzzles found in DB for themes: ${mappedThemes.join(', ')}`);
      }

      // 2. If not enough in reservoir, try fallback to 'opening' if no puzzles found
      if (puzzles.length === 0) {
        console.log(`[BATCH] No puzzles found for themes: ${mappedThemes.join(', ')}. Falling back to 'opening'.`);
        const rows = db.prepare('SELECT data FROM puzzles WHERE theme = ? AND rating >= ? AND rating <= ? ORDER BY RANDOM() LIMIT ?')
                     .all('opening', minR, maxR, requestedCount) as { data: string }[];
        
        rows.forEach(row => {
          try {
            const p = JSON.parse(row.data);
            const puzzleColor = p.puzzle.initialPly % 2 === 0 ? 'white' : 'black';
            if (!puzzleIds.has(p.puzzle.id) && (!colorFilter || colorFilter === 'both' || puzzleColor === colorFilter)) {
              puzzles.push(p);
              puzzleIds.add(p.puzzle.id);
            }
          } catch (e) {}
        });
      }

      // 3. Fallback: If still not enough, just get ANY puzzles from DB within rating range
      if (puzzles.length < requestedCount) {
        const needed = requestedCount - puzzles.length;
        console.log(`[BATCH] Fallback: Searching DB for ${needed} puzzles in rating range ${minR}-${maxR}`);
        const rows = db.prepare('SELECT data FROM puzzles WHERE rating >= ? AND rating <= ? ORDER BY RANDOM() LIMIT ?')
                     .all(minR, maxR, needed) as { data: string }[];
        
        rows.forEach(row => {
          try {
            const p = JSON.parse(row.data);
            const puzzleColor = p.puzzle.initialPly % 2 === 0 ? 'white' : 'black';
            if (!puzzleIds.has(p.puzzle.id) && (!colorFilter || colorFilter === 'both' || puzzleColor === colorFilter)) {
              puzzles.push(p);
              puzzleIds.add(p.puzzle.id);
            }
          } catch (e) {}
        });
      }

      // 4. Ultimate Fallback: If STILL not enough, ignore rating range and just get ANY puzzles
      if (puzzles.length < requestedCount) {
        const needed = requestedCount - puzzles.length;
        console.log(`[BATCH] Ultimate Fallback: Ignoring rating range, getting ${needed} random puzzles`);
        const rows = db.prepare('SELECT data FROM puzzles ORDER BY RANDOM() LIMIT ?')
                     .all(needed) as { data: string }[];
        
        rows.forEach(row => {
          try {
            const p = JSON.parse(row.data);
            if (!puzzleIds.has(p.puzzle.id) && (!colorFilter || colorFilter === 'both' || p.game.color === colorFilter)) {
              puzzles.push(p);
              puzzleIds.add(p.puzzle.id);
            }
          } catch (e) {}
        });
      }

      // 5. Lichess API Fallback: If STILL not enough, fetch from Lichess API
      let needed = requestedCount - puzzles.length;
      if (needed > 0) {
        console.log(`[BATCH] Lichess Fallback: Fetching ${needed} more puzzles for themes: ${themeStr}`);
        const insertStmt = db.prepare('INSERT OR IGNORE INTO puzzles (id, theme, rating, data) VALUES (?, ?, ?, ?)');
        
        for (let i = 0; i < needed; i++) {
          const currentTheme = mappedThemes[i % mappedThemes.length] || 'opening';
          try {
            const response = await fetch(`https://lichess.org/api/puzzle/next?theme=${encodeURIComponent(currentTheme)}`, {
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'OpenPecker/1.0 (ismail.helw@gmail.com)'
              }
            });
            
            if (response.ok) {
              const puzzle = await response.json();
              insertStmt.run(puzzle.puzzle.id, currentTheme, puzzle.puzzle.rating, JSON.stringify(puzzle));
              
              const puzzleColor = puzzle.puzzle.initialPly % 2 === 0 ? 'white' : 'black';
              if (!puzzleIds.has(puzzle.puzzle.id) && (!colorFilter || colorFilter === 'both' || puzzleColor === colorFilter)) {
                puzzles.push(puzzle);
                puzzleIds.add(puzzle.puzzle.id);
              } else {
                // We got a puzzle but it didn't match our color filter, so we still need one
                i--;
              }
            } else if (response.status === 429) {
              const retryAfter = response.headers.get('Retry-After');
              await new Promise(resolve => setTimeout(resolve, (retryAfter ? parseInt(retryAfter) : 2) * 1000));
              i--; // Retry
            }
            // Small delay between puzzles
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (err) {
            console.error(`[BATCH] Error fetching puzzle for ${currentTheme}:`, err);
          }
          
          // If we are taking too long, just return what we have
          if (i > 50 && puzzles.length >= requestedCount / 2) break;
        }
      }

      console.log(`[BATCH] Final puzzle count: ${puzzles.length}`);

      if (puzzles.length === 0) {
        // Last resort: any puzzles at all
        const rows = db.prepare('SELECT data FROM puzzles ORDER BY RANDOM() LIMIT ?')
                     .all(requestedCount) as { data: string }[];
        rows.forEach(row => {
          try {
            puzzles.push(JSON.parse(row.data));
          } catch (e) {}
        });
      }

      res.json({
        status: "success",
        puzzles: puzzles.sort(() => 0.5 - Math.random()).slice(0, requestedCount)
      });
    } catch (err: any) {
      console.error("[BATCH] Global error:", err);
      res.status(500).json({ status: "error", error: "Failed to fetch puzzle reservoir.", details: err.message });
    }
  });

  app.use((req, res, next) => {
    console.log(`[SERVER] Request: ${req.method} ${req.url}`);
    next();
  });

  // Health check endpoint
  // Moved to top
  
  // API Routes following the contract: { data: ... }
  app.use("/api/sample", sampleRouter);
  app.use("/api/chess", chessRouter);

  // Auth Routes
  app.post("/api/auth/register", (req, res) => {
    console.log('[REGISTER] Request received:', req.body);
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      console.warn('[REGISTER] Missing fields');
      return res.status(400).json({ error: { message: "Missing required fields", code: "MISSING_FIELDS" } });
    }

    try {
      const salt = crypto.randomBytes(16).toString("hex");
      const hash = crypto.scryptSync(password, salt, 64).toString("hex");
      const passwordHash = `${salt}:${hash}`;
      const id = crypto.randomUUID();

      console.log('[REGISTER] Inserting user:', { id, username, email });
      const stmt = db.prepare("INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)");
      stmt.run(id, username, email, passwordHash);
      console.log('[REGISTER] User inserted successfully');

      res.json({ data: { id, username, email, isPremium: false } });
    } catch (error: any) {
      console.error('[REGISTER] Error:', error);
      if (error.code === "SQLITE_CONSTRAINT") {
        return res.status(400).json({ error: { message: "Username or email already exists", code: "USER_EXISTS" } });
      }
      res.status(500).json({ error: { message: error.message, code: "REGISTER_ERROR" } });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: { message: "Missing email or password", code: "MISSING_FIELDS" } });
    }

    try {
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
      if (!user || !user.password_hash) {
        return res.status(401).json({ error: { message: "Invalid email or password", code: "INVALID_CREDENTIALS" } });
      }

      const [salt, hash] = user.password_hash.split(":");
      const loginHash = crypto.scryptSync(password, salt, 64).toString("hex");

      if (loginHash !== hash) {
        return res.status(401).json({ error: { message: "Invalid email or password", code: "INVALID_CREDENTIALS" } });
      }

      res.json({ data: { id: user.id, username: user.username, email: user.email, isPremium: user.is_premium === 1 } });
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message, code: "LOGIN_ERROR" } });
    }
  });

  app.get("/api/user/me", (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(401).json({ error: { message: "Not authenticated", code: "UNAUTHORIZED" } });
    }

    try {
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
      if (!user) {
        return res.status(404).json({ error: { message: "User not found", code: "NOT_FOUND" } });
      }
      res.json({ data: { id: user.id, username: user.username, email: user.email, isPremium: user.is_premium === 1 } });
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message, code: "USER_FETCH_ERROR" } });
    }
  });

  // BigQuery Puzzle Query
  app.get(["/api/bigquery/puzzles", "/api/puzzles/batch"], async (req, res) => {
    const { theme, minRating, maxRating, count = 20 } = req.query;
    
    // Using the user's specific table path
    const tableId = process.env.BIGQUERY_PUZZLES_TABLE || 'puzzles_data';

    // Standard SQL query using UNNEST for array themes and ORDER BY RAND()
    const query = `
      SELECT puzzle_id, fen, moves, rating, themes, color
      FROM \`${tableId}\`
      WHERE rating BETWEEN @minRating AND @maxRating
      AND @theme IN UNNEST(themes)
      ORDER BY RAND()
      LIMIT @count
    `;

    const options = {
      query: query,
      params: { 
        theme: theme as string, 
        minRating: parseInt(minRating as string) || 0, 
        maxRating: parseInt(maxRating as string) || 3000, 
        count: parseInt(count as string) || 20 
      },
    };

    try {
      const bq = getBigQuery();
      const [rows] = await bq.query(options);
      
      if (!rows || rows.length === 0) {
        return res.status(404).json({ 
          error: { 
            message: `No puzzles found for theme "${theme}" in the rating range ${minRating}-${maxRating}.`,
            code: "NO_RESULTS_FOUND" 
          } 
        });
      }

      // Support legacy format if called via /api/puzzles/batch
      if (req.path === "/api/puzzles/batch") {
        return res.json({ 
          puzzles: rows.map((p: any) => ({
            id: p.puzzle_id,
            fen: p.fen,
            moves: p.moves,
            rating: p.rating,
            themes: p.themes,
            color: p.color
          })) 
        });
      }

      res.json({ data: rows });
    } catch (error: any) {
      console.error('[BIGQUERY ERROR]', error);
      res.status(500).json({ 
        error: { 
          message: error.message, 
          code: "BIGQUERY_QUERY_ERROR" 
        } 
      });
    }
  });

  // BigQuery Openings Query
  app.get(["/api/bigquery/openings", "/api/lichess/openings"], async (req, res) => {
    const tableId = process.env.BIGQUERY_OPENINGS_TABLE || 'openings_data';

    const query = `
      SELECT name, fen
      FROM \`${tableId}\`
      ORDER BY name ASC
    `;

    try {
      const bq = getBigQuery();
      const [rows] = await bq.query(query);
      res.json({ data: rows });
    } catch (error: any) {
      console.error('[BIGQUERY ERROR]', error);
      res.status(500).json({ 
        error: { 
          message: error.message, 
          code: "BIGQUERY_OPENINGS_ERROR" 
        } 
      });
    }
  });

  // BigQuery Stats Query
  app.get(["/api/bigquery/puzzles/stats", "/api/lichess/repository"], async (req, res) => {
    const tableId = process.env.BIGQUERY_PUZZLES_TABLE || 'puzzles_data';

    // This query assumes themes is a repeated string (array)
    const query = `
      SELECT theme, COUNT(*) as count
      FROM \`${tableId}\`, UNNEST(themes) as theme
      GROUP BY theme
      ORDER BY count DESC
    `;

    try {
      const bq = getBigQuery();
      const [rows] = await bq.query(query);
      res.json({ data: rows });
    } catch (error: any) {
      console.error('[BIGQUERY ERROR]', error);
      res.status(500).json({ 
        error: { 
          message: error.message, 
          code: "BIGQUERY_STATS_ERROR" 
        } 
      });
    }
  });

  // Lichess OAuth
  const pkceVerifiers = new Map<string, string>();
  app.get('/api/auth/lichess/url', (req, res) => {
    const state = crypto.randomBytes(16).toString('hex');
    const codeVerifier = crypto.randomBytes(32).toString('hex');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    
    pkceVerifiers.set(state, codeVerifier);

    const redirectUri = `${process.env.APP_URL || `http://localhost:3000`}/api/auth/lichess/callback`;
    const params = new URLSearchParams({
      client_id: 'openpecker-app',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'email:read',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state: state,
    });
    res.json({ url: `https://lichess.org/oauth/authorize?${params}` });
  });

  app.get(['/api/auth/lichess/callback', '/api/auth/lichess/callback/'], async (req, res) => {
    const { code, state } = req.query;
    const codeVerifier = pkceVerifiers.get(state as string);
    
    if (!codeVerifier) {
      return res.status(400).send('Invalid state');
    }
    pkceVerifiers.delete(state as string);
    
    try {
      const response = await fetch('https://lichess.org/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code as string,
          redirect_uri: `${process.env.APP_URL || `http://localhost:3000`}/api/auth/lichess/callback`,
          client_id: 'openpecker-app',
          code_verifier: codeVerifier,
        }),
      });

      const tokens = await response.json();
      
      // Get user info
      const userResponse = await fetch('https://lichess.org/api/account', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const lichessUser = await userResponse.json();

      // Sync with our users table
      let user = db.prepare("SELECT * FROM users WHERE lichess_id = ?").get(lichessUser.id) as any;
      if (!user) {
        const id = crypto.randomUUID();
        db.prepare("INSERT INTO users (id, username, lichess_id) VALUES (?, ?, ?)").run(id, lichessUser.username, lichessUser.id);
        user = { id, username: lichessUser.username, is_premium: 0 };
      }

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', user: { id: '${user.id}', username: '${user.username}', isPremium: ${user.is_premium === 1} } }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error) {
      res.status(500).send('Authentication failed');
    }
  });

  // Stripe Checkout Session
  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const stripe = getStripe();
      if (!stripe) {
        return res.status(503).json({ error: { message: "Stripe is not configured. Please add STRIPE_SECRET_KEY to the Secrets panel.", code: "STRIPE_NOT_CONFIGURED" } });
      }

      const { deviceId, userId } = req.body;
      // Use origin from headers as a fallback for dynamic preview URLs
      const originHeader = req.headers.origin;
      let origin = (originHeader && originHeader !== 'null') ? originHeader : process.env.APP_URL || `http://localhost:${PORT}`;
      origin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
      
      console.log(`Creating Stripe session for user: ${userId}, device: ${deviceId}, origin: ${origin}`);

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "OpenPecker Premium",
                description: "Unlock all 150+ openings and advanced analytics",
              },
              unit_amount: 499, // $4.99
              recurring: {
                interval: "month",
              },
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
        client_reference_id: userId || deviceId,
        success_url: `${origin}/?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/`,
      });

      console.log(`Stripe session created: ${session.id}`);
      res.json({ data: { url: session.url } });
    } catch (error: any) {
      console.error("Stripe Session Error:", error);
      res.status(500).json({ error: { message: error.message, code: "STRIPE_ERROR" } });
    }
  });

  // Verify Stripe Session
  app.get("/api/verify-session", async (req, res) => {
    try {
      const stripe = getStripe();
      if (!stripe) {
        return res.status(503).json({ error: { message: "Stripe is not configured", code: "STRIPE_NOT_CONFIGURED" } });
      }

      const { session_id } = req.query;
      if (!session_id) {
        return res.status(400).json({ error: { message: "Session ID is required", code: "MISSING_SESSION_ID" } });
      }

      const session = await stripe.checkout.sessions.retrieve(session_id as string);
      if (session.payment_status === "paid") {
        const referenceId = session.client_reference_id;
        if (referenceId) {
          // Update user if it looks like a UUID (our user ID)
          if (referenceId.length > 20) {
            db.prepare("UPDATE users SET is_premium = 1 WHERE id = ?").run(referenceId);
          }
        }
        res.json({ data: { status: "paid", referenceId } });
      } else {
        res.json({ data: { status: session.payment_status } });
      }
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message, code: "STRIPE_VERIFY_ERROR" } });
    }
  });

  // Get list of openings
  app.get("/api/openings", (req, res) => {
    try {
      const openingsPath = path.join(process.cwd(), "data/openings.json");
      if (fs.existsSync(openingsPath)) {
        const data = fs.readFileSync(openingsPath, 'utf8');
        const openings = JSON.parse(data);
        res.json({ data: openings });
      } else {
        res.status(404).json({ error: { message: "Openings file not found", code: "NOT_FOUND" } });
      }
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message, code: "OPENINGS_ERROR" } });
    }
  });

  // Debug endpoint
  app.get("/api/debug/status", (req, res) => {
    try {
      const puzzleCount = (db.prepare('SELECT COUNT(*) as count FROM puzzles').get() as any).count;
      const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;
      const setCount = (db.prepare('SELECT COUNT(*) as count FROM puzzle_sets').get() as any).count;
      const themes = db.prepare('SELECT theme, COUNT(*) as count FROM puzzles GROUP BY theme').all();
      
      res.json({
        status: "ok",
        nodeVersion: process.version,
        fetchAvailable: typeof fetch !== 'undefined',
        database: {
          puzzleCount,
          userCount,
          setCount,
          themes
        }
      });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  // Puzzle Sets API
  app.get("/api/sets", (req, res) => {
    const { userId, deviceId } = req.query;
    if (!userId && !deviceId) {
      return res.status(400).json({ error: "userId or deviceId required" });
    }

    try {
      let sets;
      if (userId) {
        sets = db.prepare('SELECT * FROM puzzle_sets WHERE user_id = ? ORDER BY last_played_at DESC').all(userId);
      } else {
        sets = db.prepare('SELECT * FROM puzzle_sets WHERE device_id = ? ORDER BY last_played_at DESC').all(deviceId);
      }

      const formattedSets = sets.map((s: any) => ({
        ...s,
        puzzles: JSON.parse(s.puzzles_json),
        puzzles_json: undefined
      }));

      res.json({ data: formattedSets });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/sets", express.json(), (req, res) => {
    const { 
      id, userId, deviceId, openingSlug, openingDisplay, 
      puzzleCount, targetCycles, cyclesCompleted, status, 
      bestAccuracy, totalAttempts, puzzles 
    } = req.body;

    if (!id || !puzzles) {
      return res.status(400).json({ error: "id and puzzles required" });
    }

    try {
      const stmt = db.prepare(`
        INSERT INTO puzzle_sets (
          id, user_id, device_id, opening_slug, opening_display, 
          puzzle_count, target_cycles, cycles_completed, status, 
          best_accuracy, total_attempts, puzzles_json, last_played_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          user_id = excluded.user_id,
          device_id = excluded.device_id,
          opening_slug = excluded.opening_slug,
          opening_display = excluded.opening_display,
          puzzle_count = excluded.puzzle_count,
          target_cycles = excluded.target_cycles,
          cycles_completed = excluded.cycles_completed,
          status = excluded.status,
          best_accuracy = excluded.best_accuracy,
          total_attempts = excluded.total_attempts,
          puzzles_json = excluded.puzzles_json,
          last_played_at = CURRENT_TIMESTAMP
      `);

      stmt.run(
        id, userId || null, deviceId || null, openingSlug, openingDisplay,
        puzzleCount, targetCycles, cyclesCompleted || 0, status || 'active',
        bestAccuracy || 0, totalAttempts || 0, JSON.stringify(puzzles)
      );

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/sets/:id", express.json(), (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    try {
      const keys = Object.keys(updates).filter(k => k !== 'id' && k !== 'puzzles');
      if (keys.length === 0 && !updates.puzzles) {
        return res.status(400).json({ error: "No updates provided" });
      }

      let query = 'UPDATE puzzle_sets SET last_played_at = CURRENT_TIMESTAMP';
      const params: any[] = [];

      keys.forEach(key => {
        // Map camelCase to snake_case if necessary
        const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        query += `, ${dbKey} = ?`;
        params.push(updates[key]);
      });

      if (updates.puzzles) {
        query += `, puzzles_json = ?`;
        params.push(JSON.stringify(updates.puzzles));
      }

      query += ' WHERE id = ?';
      params.push(id);

      const stmt = db.prepare(query);
      stmt.run(...params);

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/sets/:id", (req, res) => {
    const { id } = req.params;
    try {
      db.prepare('DELETE FROM puzzle_sets WHERE id = ?').run(id);
      db.prepare('DELETE FROM cycle_history WHERE set_id = ?').run(id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Cycle History API
  app.get("/api/cycles", (req, res) => {
    const { userId, deviceId } = req.query;
    if (!userId && !deviceId) {
      return res.status(400).json({ error: "userId or deviceId required" });
    }

    try {
      let cycles;
      if (userId) {
        cycles = db.prepare('SELECT * FROM cycle_history WHERE user_id = ? ORDER BY completed_at DESC').all(userId);
      } else {
        cycles = db.prepare('SELECT * FROM cycle_history WHERE device_id = ? ORDER BY completed_at DESC').all(deviceId);
      }
      res.json({ data: cycles });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/cycles", express.json(), (req, res) => {
    const { 
      userId, deviceId, setId, cycle, totalPuzzles, 
      correctCount, totalTimeMs, completedAt 
    } = req.body;

    try {
      const stmt = db.prepare(`
        INSERT INTO cycle_history (
          user_id, device_id, set_id, cycle, total_puzzles, 
          correct_count, total_time_ms, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        userId || null, deviceId || null, setId || null, cycle, 
        totalPuzzles, correctCount, totalTimeMs, completedAt || new Date().toISOString()
      );

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Proxy for Lichess Puzzles by theme
  app.get("/api/lichess/puzzles", async (req, res) => {
    try {
      const { theme, count = 10, minRating = 0, maxRating = 3000 } = req.query;
      console.log(`Puzzle request received: theme=${theme}, count=${count}, rating=${minRating}-${maxRating}`);
      
      const themeStr = theme as string;
      if (!themeStr) {
        return res.status(400).json({ error: { message: "Theme is required", code: "MISSING_THEME" } });
      }

      const themes = themeStr.split(',').map(t => t.trim());
      const requestedCount = Math.min(Number(count), 400);
      const minR = Number(minRating);
      const maxR = Number(maxRating);
      
      const puzzles: any[] = [];
      
      // Try to get from database first for all themes
      for (const t of themes) {
        const countPerTheme = Math.ceil(requestedCount / themes.length);
        const stmt = db.prepare('SELECT data FROM puzzles WHERE theme = ? AND rating >= ? AND rating <= ? ORDER BY RANDOM() LIMIT ?');
        const rows = stmt.all(t, minR, maxR, countPerTheme) as { data: string }[];
        rows.forEach(row => puzzles.push(JSON.parse(row.data)));
      }
      
      let needed = requestedCount - puzzles.length;
      
      if (needed > 0) {
        console.log(`Fetching ${needed} more puzzles for themes: ${themeStr} (Current DB cache: ${puzzles.length})`);
        
        const insertStmt = db.prepare('INSERT OR IGNORE INTO puzzles (id, theme, rating, data) VALUES (?, ?, ?, ?)');
        
        // Distribute needed puzzles across themes
        for (let i = 0; i < needed; i++) {
          const currentTheme = themes[i % themes.length];
          try {
            const response = await fetch(`https://lichess.org/api/puzzle/next?theme=${encodeURIComponent(currentTheme)}`, {
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'OpenPecker/1.0 (ismail.helw@gmail.com)'
              }
            });
            
            if (response.ok) {
              const puzzle = await response.json();
              insertStmt.run(puzzle.puzzle.id, currentTheme, puzzle.puzzle.rating, JSON.stringify(puzzle));
              
              if (!puzzles.some(p => p.puzzle.id === puzzle.puzzle.id)) {
                puzzles.push(puzzle);
              }
            } else if (response.status === 429) {
              const retryAfter = response.headers.get('Retry-After');
              await new Promise(resolve => setTimeout(resolve, (retryAfter ? parseInt(retryAfter) : 2) * 1000));
              i--; // Retry
            }
            // Small delay between puzzles
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (err) {
            console.error(`Error fetching puzzle for ${currentTheme}:`, err);
          }
          
          // If we are taking too long, just return what we have
          if (i > 50 && puzzles.length >= requestedCount / 2) break;
        }
      }

      // Shuffle the final array to ensure randomness
      const shuffled = [...puzzles].sort(() => 0.5 - Math.random());
      res.json({ data: shuffled.slice(0, requestedCount) });
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message, code: "LICHESS_PUZZLE_ERROR" } });
    }
  });

  // Get repository stats
  app.get("/api/lichess/repository", (req, res) => {
    try {
      const stmt = db.prepare('SELECT theme, COUNT(*) as count FROM puzzles GROUP BY theme');
      const rows = stmt.all();
      res.json({ data: rows });
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message, code: "REPOSITORY_ERROR" } });
    }
  });

  // Proxy for Lichess to avoid CORS
  app.get("/api/lichess/opening-explorer", async (req, res) => {
    try {
      const { fen, play, moves, topGames, recentGames, months, ratings, speeds, master, pro } = req.query;
      const url = new URL("https://explorer.lichess.ovh/chessdb");
      if (fen) url.searchParams.append("fen", fen as string);
      if (play) url.searchParams.append("play", play as string);
      if (moves) url.searchParams.append("moves", moves as string);
      
      const response = await fetch(url.toString());
      const data = await response.json();
      res.json({ data });
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message, code: "LICHESS_PROXY_ERROR" } });
    }
  });

  // Placeholder for lichess openings
  app.get("/api/lichess/openings", async (req, res) => {
    res.json({ data: [] });
  });

  // Default health check for the API contract pattern
  app.get("/api/health", (req, res) => {
    res.json({ data: { status: "ok" } });
  });

  // Error handling following the contract: { error: { message, code } }
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err);
    res.status(err.status || 500).json({
      error: {
        message: err.message || "Internal Server Error",
        code: err.code || "INTERNAL_ERROR"
      }
    });
  });

  // Vite middleware for development
  const distPath = path.join(process.cwd(), "dist");
  console.log(`[SERVER] Checking for dist at: ${distPath}`);
  
  if (process.env.NODE_ENV !== "production" || !fs.existsSync(distPath)) {
    console.log("[SERVER] Starting Vite in development mode (dist not found or NODE_ENV != production)...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in production mode...");
    // Serve static files in production
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] OpenPecker v1.1 running on http://0.0.0.0:${PORT}`);
    console.log(`[SERVER] Database: puzzles.db (WAL mode enabled)`);
    console.log(`[SERVER] Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer();
