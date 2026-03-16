import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
  res.json({ data: { message: "Sample route working" } });
});

export const sampleRouter = router;
