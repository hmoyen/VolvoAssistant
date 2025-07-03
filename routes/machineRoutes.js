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

router.post("/find_by_model", async (req, res) => {
  const { user_id, model } = req.body;
  console.log(model);

  try {
    const cleanedModel = model.replace(/\s+/g, "").toUpperCase();

    const result = await db.query(
      `SELECT * FROM machines WHERE user_id = $1 AND UPPER(REPLACE(model, ' ', '')) LIKE $2`,
      [user_id, `%${cleanedModel}%`]
    );

    res.status(200).json({
      success: true,
      machines: result.rows.map((row) => ({
        serial_number: row.serial_number,
        machine_id: row.machine_id,
      })),
    });


  } catch (error) {
    console.error("💥 Error searching by model:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
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

  // PUT route to update the image URL of a machine
router.put("/update_url/:machineId", async (req, res) => {
  const { machineId } = req.params;
  const { url } = req.body; // The URL of the image to be updated

  try {
    const result = await db.query(
      `UPDATE machines
       SET url = $1
       WHERE machine_id = $2
       RETURNING *`,
      [url, machineId]
    );

    if (result.rows.length > 0) {
      const updatedMachine = result.rows[0];
      res.status(200).json({
        success: true,
        message: "Machine URL updated successfully",
        updatedMachine,
      });
    } else {
      res.status(404).json({ success: false, message: "Machine not found" });
    }
  } catch (error) {
    console.error("Error updating machine URL:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// GET machine by machine ID
router.get("/get/:machineId", async (req, res) => {
  const { machineId } = req.params;

  try {
    const result = await db.query(
      "SELECT * FROM machines WHERE machine_id = $1",
      [machineId]
    );

    if (result.rows.length > 0) {
      const machine = result.rows[0];
      res.status(200).json({
        success: true,
        machine_model: machine.model,
        machine_number: machine.serial_number,
        machine_id: machine.machine_id,
        url: machine.url || "https://via.placeholder.com/150", // If no URL, provide a placeholder
      });
    } else {
      res.status(404).json({ success: false, message: "Machine not found" });
    }
  } catch (error) {
    console.error("Error fetching machine:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

module.exports = router;
