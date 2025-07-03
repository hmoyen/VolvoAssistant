const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// POST /conversations
router.post("/", async (req, res) => {
  const { ticket_id, sender, message, media_url } = req.body;

  if (!ticket_id || !sender || (!message && !media_url)) {
    return res.status(400).json({ error: "Missing required fields: must include message or media_url." });
  }

  try {
    const result = await pool.query(
      `INSERT INTO conversations (ticket_id, sender, message, media_url)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [ticket_id, sender, message || null, media_url || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error saving conversation message:", err);
    res.status(500).json({ error: "Failed to save conversation message." });
  }
});

module.exports = router;
