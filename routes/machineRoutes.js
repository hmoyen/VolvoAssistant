const express = require("express");
const router = express.Router();
const db = require("../config/db"); 

// GET machines by customer ID
router.get("/:customerId", async (req, res) => {
  const { customerId } = req.params;

  try {
    const result = await db.query(
      "SELECT * FROM machines WHERE user_id = $1",
      [customerId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching machines:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/find", async (req, res) => {
    const { user_id, search_string } = req.body;
  
    try {
      const cleanedSearchString = search_string.replace(/\s+/g, "").toUpperCase();
  
      console.log("🔍 Incoming search request:");
      console.log("User ID:", user_id);
      console.log("Original Search String:", search_string);
      console.log("Cleaned Search String:", cleanedSearchString);
  
      const result = await db.query(
        `SELECT * FROM machines WHERE user_id = $1 AND (
          UPPER(REPLACE(model, ' ', '')) LIKE $2 OR 
          UPPER(REPLACE(serial_number, ' ', '')) LIKE $2
        ) LIMIT 1`,
        [user_id, `%${cleanedSearchString}%`]
      );
  
      console.log("🔍 Query result:", result.rows);
  
      if (result.rows.length > 0) {
        const machine = result.rows[0];
        res.status(200).json({
          success: true,
          machine_model:machine.model,
          machine_number: machine.serial_number,
          machine_id: machine.machine_id,
        });
      } else {
        console.log("❌ No machine found.");
        res.status(404).json({
          success: false,
          message: "Machine not found",
        });
      }
    } catch (error) {
      console.error("💥 Error searching for machine:", error);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  });
  

// POST route to create a new machine
router.post("/", async (req, res) => {
    const { user_id, model, serial_number } = req.body;
  
    try {
      const cleanedModel = model.replace(/\s+/g, "").toUpperCase();
      const cleanedSerial = serial_number.replace(/\s+/g, "").toUpperCase();
  
      const result = await db.query(
        `INSERT INTO machines (user_id, model, serial_number)
         VALUES ($1, $2, $3) RETURNING *`,
        [user_id, cleanedModel, cleanedSerial]
      );
  
      const newMachine = result.rows[0];
      res.status(201).json(newMachine);
    } catch (error) {
      console.error("Error creating machine:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  

module.exports = router;
