const express = require("express");
const router = express.Router();
const pool = require("../config/db"); // or wherever your DB client is set up

// POST /conversations
router.post("/", async (req, res) => {
  const { issue_id, sender, message } = req.body;

  if (!issue_id || !sender || !message) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  try {
    const result = await pool.query(
      `INSERT INTO conversations (issue_id, sender, message)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [issue_id, sender, message]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error saving conversation message:", err);
    res.status(500).json({ error: "Failed to save conversation message." });
  }
});

module.exports = router;
