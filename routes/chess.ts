import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
  res.json({ data: { message: "Chess route working" } });
});

// Add basic chess logic placeholders
router.get("/games", (req, res) => {
  res.json({ data: [] });
});

export const chessRouter = router;
