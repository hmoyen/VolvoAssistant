const express = require('express');
const router = express.Router();
const db = require("../config/db");  // Use db, not pool

// ➕ Add a ticket
router.post('/add', async (req, res) => {
    const { machine_id, title, description } = req.body;

    try {
        const result = await db.query(
            `INSERT INTO tickets (machine_id, title, description) 
             VALUES ($1, $2, $3) RETURNING *`,
            [machine_id, title, description]
        );
        res.status(201).json({ success: true, ticket: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Failed to add ticket' });
    }
});

// GET all tickets for a specific machine_id
router.get('/machine/:machine_id', async (req, res) => {
    const { machine_id } = req.params;

    try {
        const result = await db.query(
            `SELECT * FROM tickets WHERE machine_id = $1 ORDER BY created_at DESC`,
            [machine_id]
        );

        res.json({ success: true, tickets: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Failed to fetch tickets' });
    }
});

// 📝 Edit a ticket (title & description)
router.put('/edit/:ticket_id', async (req, res) => {
    const { ticket_id } = req.params;
    const { title, description } = req.body;

    try {
        const result = await db.query(
            `UPDATE tickets SET title = $1, description = $2 WHERE ticket_id = $3 RETURNING *`,
            [title, description, ticket_id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Ticket not found' });
        }

        res.json({ success: true, ticket: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Failed to edit ticket' });
    }
});

// 🔎 Find tickets by machine ID
router.get('/machine/:machine_id', async (req, res) => {
    const { machine_id } = req.params;

    try {
        const result = await db.query(
            `SELECT * FROM tickets WHERE machine_id = $1 ORDER BY created_at DESC`,
            [machine_id]
        );

        res.json({ success: true, tickets: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Failed to fetch tickets' });
    }
});

// ✅ Mark ticket as resolved
router.put('/resolve/:ticket_id', async (req, res) => {
    const { ticket_id } = req.params;

    try {
        const result = await db.query(
            `UPDATE tickets SET resolved = TRUE, resolved_at = NOW() WHERE ticket_id = $1 RETURNING *`,
            [ticket_id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Ticket not found' });
        }

        res.json({ success: true, ticket: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Failed to resolve ticket' });
    }
});

module.exports = router;
