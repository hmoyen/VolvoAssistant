const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Route to register a user
router.post('/register', (req, res) => {
  const { name, email, password, role } = req.body;

  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      return res.status(500).json({ message: 'Error hashing password' });
    }
  
    const query = `INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *`;
  
    db.query(query, [name, email, hashedPassword, role])
      .then(result => {
        res.status(201).json({ message: 'User registered successfully', user: result.rows[0] });
      })
      .catch(err => {
        console.error(err.stack);
        res.status(500).json({ message: 'Error registering user', error: err.message });
      });
  });
  
});

// Route to login a user
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  const query = `SELECT * FROM users WHERE email = $1`;

  db.query(query, [email])
    .then(result => {
      if (result.rows.length === 0) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const user = result.rows[0];

      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) {
          return res.status(500).json({ message: 'Error comparing passwords' });
        }

        if (!isMatch) {
          return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({
          message: 'Login successful',
          token
        });
      });
    })
    .catch(err => {
      console.error(err.stack);
      res.status(500).json({ message: 'Error logging in', error: err.message });
    });
});

module.exports = router;
