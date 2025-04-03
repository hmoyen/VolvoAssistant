const express = require('express');
const router = express.Router();
const db = require('../config/db');
const jwt = require('jsonwebtoken');

// Middleware to verify technician role
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });

    if (decoded.role !== 'technician') {
      return res.status(403).json({ message: 'Access denied. Technicians only' });
    }

    req.user = decoded;
    next();
  });
};

// 📌 Add Availability (Only as "available")
router.post('/add', authenticate, async (req, res) => {
  const { day_of_week, time_slot } = req.body;
  const technician_id = req.user.userId;
  const status = true; 

  try {
    const query = `
      INSERT INTO technician_availability (technician_id, day_of_week, time_slot, status)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (technician_id, day_of_week, time_slot)
      DO NOTHING
      RETURNING *;
    `;
    const values = [technician_id, day_of_week, time_slot, status];
    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(409).json({ message: 'Availability already exists' });
    }
    
    res.status(201).json({ message: 'Availability added successfully', availability: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error adding availability', error: err.message });
  }
});

// 📌 Update Availability (Allow toggling between true and false)
router.put('/update', authenticate, async (req, res) => {
    const { day_of_week, time_slot, status } = req.body; 
    const technician_id = req.user.userId;
  
    if (typeof status !== 'boolean') {
      return res.status(400).json({ message: 'Invalid status value. Must be true or false.' });
    }
  
    try {
      const query = `
        UPDATE technician_availability
        SET status = $4, updated_at = NOW()
        WHERE technician_id = $1 AND day_of_week = $2 AND time_slot = $3
        RETURNING *;
      `;
      const values = [technician_id, day_of_week, time_slot, status];
      const result = await db.query(query, values);
  
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Availability not found' });
      }
  
      res.status(200).json({ message: `Availability updated to ${status ? 'available' : 'busy'}`, availability: result.rows[0] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error updating availability', error: err.message });
    }
  });
  
  

  // 📌 Get availability for a specific technician (mechanic) given an id
  router.get('/mechanic/:id', async (req, res) => {
    const technicianId = req.params.id;
    try {
      const query = `
        SELECT day_of_week, time_slot, status, created_at, updated_at
        FROM technician_availability
        WHERE technician_id = $1
        ORDER BY day_of_week, time_slot;
      `;
      const values = [technicianId];
      const result = await db.query(query, values);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'No schedule found for this technician' });
      }
      
      res.status(200).json({ schedule: result.rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error fetching technician schedule', error: err.message });
    }
  });
  
  // 📌 Get the first available technician for a given day and time slot
  router.get('/first-available', async (req, res) => {
    const { day_of_week, time_slot } = req.query;

    if (!day_of_week || !time_slot) {
        return res.status(400).json({ message: "Missing required query parameters: 'day_of_week' and 'time_slot'" });
    }

    try {

        const techQuery = `
            SELECT technician_id 
            FROM technician_availability 
            WHERE day_of_week = $1 AND time_slot = $2 AND status = true 
            LIMIT 1;
        `;
        const techResult = await db.query(techQuery, [day_of_week, time_slot]);

        if (techResult.rows.length === 0) {
            return res.status(404).json({ message: 'No available technician found' });
        }

        const technician_id = techResult.rows[0].technician_id;

        const userQuery = `
            SELECT id, name, email 
            FROM users 
            WHERE id = $1 AND role = 'technician';
        `;
        const userResult = await db.query(userQuery, [technician_id]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'Technician details not found' });
        }

        const technician = userResult.rows[0];

        res.status(200).json({
            technician_id: technician.id,
            name: technician.name,
            email: technician.email
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error retrieving available technician', error: err.message });
    }
});

  

module.exports = router;
