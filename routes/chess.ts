import express from "express";
import { Board } from "../src/lib/chessEngineV2.ts";

const router = express.Router();

router.get("/", (req, res) => {
  res.json({ data: { message: "Chess route working" } });
});

// Move validation endpoint
router.post("/validate-move", (req, res) => {
  const { fen, from, to, promotion } = req.body;
  console.log('DEBUG: Backend - Received move request:', { fen, from, to, promotion });
  if (!fen || !from || !to) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  
  const board = new Board(fen);
  const result = board.movePiece(from, to, promotion);
  
  if (result.success) {
    res.json({ data: { isValid: true, move: result.move, newFen: board.getFen() } });
  } else {
    res.json({ data: { isValid: false, error: result.error, newFen: fen } });
  }
});

// Board analysis endpoint
router.post("/analyze", (req, res) => {
  const { fen } = req.body;
  if (!fen) {
    return res.status(400).json({ error: "Missing FEN" });
  }
  
  const board = new Board(fen);
  const analysis = {
    legalMoves: board.generateValidMoves(req.body.square), // Optional square
    turn: board.getTurn(),
    fen: board.getFen()
  };
  res.json({ data: analysis });
});

export const chessRouter = router;
