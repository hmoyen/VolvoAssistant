// /routes/userRoutes.js

const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Import database connection

// Route to register a user
router.post('/register', (req, res) => {
  const { name, email, password, role } = req.body;

  // SQL query to insert user data into the database
  const query = `INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *`;

  // Execute the query
  db.query(query, [name, email, password, role])
    .then(result => {
      res.status(201).json({ message: 'User registered successfully', user: result.rows[0] });
    })
    .catch(err => {
      console.error(err.stack);
      res.status(500).json({ message: 'Error registering user', error: err.message });
    });
});

module.exports = router;
