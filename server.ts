import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import Stripe from "stripe";
import Database from "better-sqlite3";
import { sampleRouter } from "./routes/sample";
import { chessRouter } from "./routes/chess";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SQLite database for puzzles
const db = new Database('puzzles.db');
db.pragma('journal_mode = WAL');

// Create puzzles table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS puzzles (
    id TEXT PRIMARY KEY,
    theme TEXT NOT NULL,
    data TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_theme ON puzzles(theme);
`);

// Lazy initialize Stripe to avoid crash if key is missing
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
  const app = express();
  const PORT = 3000;

  app.use(cors({
    origin: true,
    credentials: true,
  }));

  app.use(express.json());

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API Routes following the contract: { data: ... }
  app.use("/api/sample", sampleRouter);
  app.use("/api/chess", chessRouter);

  // Stripe Checkout Session
  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const stripe = getStripe();
      if (!stripe) {
        return res.status(503).json({ error: { message: "Stripe is not configured. Please add STRIPE_SECRET_KEY to the Secrets panel.", code: "STRIPE_NOT_CONFIGURED" } });
      }

      const { deviceId } = req.body;
      // Use origin from headers as a fallback for dynamic preview URLs
      const originHeader = req.headers.origin;
      let origin = (originHeader && originHeader !== 'null') ? originHeader : process.env.APP_URL || `http://localhost:${PORT}`;
      origin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
      
      console.log(`Creating Stripe session for device: ${deviceId}, origin: ${origin}`);

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
        client_reference_id: deviceId,
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
        res.json({ data: { status: "paid", deviceId: session.client_reference_id } });
      } else {
        res.json({ data: { status: session.payment_status } });
      }
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message, code: "STRIPE_VERIFY_ERROR" } });
    }
  });

  // Proxy for Lichess Puzzles by theme
  app.get("/api/lichess/puzzles", async (req, res) => {
    try {
      const { theme, count = 10 } = req.query;
      console.log(`Puzzle request received: theme=${theme}, count=${count}`);
      const themeStr = theme as string;
      if (!themeStr) {
        return res.status(400).json({ error: { message: "Theme is required", code: "MISSING_THEME" } });
      }

      const requestedCount = Math.min(Number(count), 200);
      
      // Check database first
      const stmt = db.prepare('SELECT data FROM puzzles WHERE theme = ? ORDER BY RANDOM() LIMIT ?');
      const rows = stmt.all(themeStr, requestedCount) as { data: string }[];
      
      if (rows.length >= requestedCount) {
        console.log(`Serving ${requestedCount} puzzles from SQLite database for theme: ${themeStr}`);
        const puzzles = rows.map(row => JSON.parse(row.data));
        return res.json({ data: puzzles });
      }

      const puzzles: any[] = rows.map(row => JSON.parse(row.data));
      const needed = requestedCount - puzzles.length;
      
      if (needed > 0) {
        console.log(`Fetching ${needed} more puzzles for theme: ${themeStr} (Current DB cache: ${puzzles.length})`);
        
        // Fetch in small batches to avoid overwhelming Lichess and hitting 429s
        const batchSize = 4;
        let consecutiveErrors = 0;
        
        const insertStmt = db.prepare('INSERT OR IGNORE INTO puzzles (id, theme, data) VALUES (?, ?, ?)');
        
        for (let i = 0; i < needed; i += batchSize) {
          if (consecutiveErrors > 2) {
            console.warn(`Stopping fetch early due to consecutive network errors. Got ${puzzles.length} puzzles.`);
            break;
          }
          
          const currentBatchSize = Math.min(batchSize, needed - i);
          const batchPromises = Array.from({ length: currentBatchSize }).map(async () => {
            let retryCount = 0;
            const maxRetries = 2;
            
            // Try the specific theme first, then fallback to 'opening' if it fails
            const themesToTry = [themeStr, 'opening'];
            
            for (const currentTheme of themesToTry) {
              while (retryCount < maxRetries) {
                try {
                  const controller = new AbortController();
                  const timeoutId = setTimeout(() => controller.abort(), 15000);
                  
                  const response = await fetch(`https://lichess.org/api/puzzle/next?theme=${currentTheme}`, {
                    headers: {
                      'Accept': 'application/json',
                      'User-Agent': 'OpenPecker/1.0 (ismail.helw@gmail.com)'
                    },
                    signal: controller.signal
                  });
                  
                  clearTimeout(timeoutId);
                  
                  if (response.ok) {
                    const puzzle = await response.json();
                    console.log(`Successfully fetched puzzle: ${puzzle.puzzle.id} for theme: ${currentTheme}`);
                    consecutiveErrors = 0; // Reset on success
                    return puzzle;
                  } else if (response.status === 429) {
                    console.warn(`Lichess 429: Too Many Requests for theme: ${currentTheme}`);
                    const retryAfter = response.headers.get('Retry-After');
                    const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 2000;
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    retryCount++;
                  } else {
                    console.error(`Lichess API error: ${response.status} ${response.statusText} for theme: ${currentTheme}`);
                    break; // Try next theme in themesToTry
                  }
                } catch (err) {
                  console.error(`Fetch error for theme ${currentTheme}:`, err instanceof Error ? err.message : err);
                  consecutiveErrors++;
                  break; // Try next theme in themesToTry
                }
              }
              retryCount = 0; // Reset retry count for the fallback theme
            }
            return null;
          });

          const batchResults = await Promise.all(batchPromises);
          
          // Save to database
          const saveTransaction = db.transaction((results: any[]) => {
            for (const puzzle of results) {
              if (puzzle && !puzzles.some(p => p.puzzle.id === puzzle.puzzle.id)) {
                insertStmt.run(puzzle.puzzle.id, themeStr, JSON.stringify(puzzle));
                puzzles.push(puzzle);
              }
            }
          });
          
          saveTransaction(batchResults);

          // Small delay between batches to be nice to Lichess
          if (i + batchSize < needed) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      // Shuffle the final array to ensure randomness even if we just fetched them
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
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting Vite in development mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in production mode...");
    // Serve static files in production
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
