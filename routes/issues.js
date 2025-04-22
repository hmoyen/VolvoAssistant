const express = require('express');
const router = express.Router();
const db = require('../config/db'); 

router.post("/", async (req, res) => {
    const { machine_id, description, matched_issue } = req.body;
  
    try {
      const result = await db.query(
        `INSERT INTO issues (machine_id, description, matched_issue)
         VALUES ($1, $2, $3) RETURNING *`,
        [machine_id, description, matched_issue || null]
      );
  
      res.status(201).json({ id: result.rows[0].id });
    } catch (error) {
      console.error("Error creating issue:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  router.get("/:machineId", async (req, res) => {
    const machineId = req.params.machineId;
  
    try {
      const result = await db.query(
        "SELECT * FROM issues WHERE machine_id = $1 ORDER BY created_at DESC",
        [machineId]
      );
  
      res.status(200).json(result.rows);
    } catch (error) {
      console.error("Error fetching issues:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
module.exports = router;