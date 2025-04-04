const express = require('express');
const router = express.Router();
const db = require('../config/db'); // ou '../config/db' dependendo da estrutura do seu projeto

router.get('/trees', async (req, res) => {
    const roots = await db.query('SELECT * FROM troubleshoot_tree WHERE parent_id IS NULL');
    res.json(roots.rows);
  });

// GET /tree/:id
router.get('/tree/:id', async (req, res) => {
    const rootId = parseInt(req.params.id);
    const allNodes = await db.query('SELECT * FROM troubleshoot_tree');
    const buildTree = (id) => {
      const node = allNodes.rows.find(n => n.id === id);
      node.children = allNodes.rows.filter(n => n.parent_id === id).map(n => buildTree(n.id));
      return node;
    };
    res.json(buildTree(rootId));
  });

// POST /trees
router.post('/trees', async (req, res) => {
    const { question } = req.body;
    const result = await db.query(
      'INSERT INTO troubleshoot_tree (parent_id, question) VALUES (NULL, $1) RETURNING *',
      [question]
    );
    res.json(result.rows[0]);
  });

// GET full tree
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM troubleshoot_tree');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST new node
router.post('/', async (req, res) => {
  const { parent_id, response_label, question, solution, image_url } = req.body;
  try {
    const { rows } = await db.query(
      'INSERT INTO troubleshoot_tree (parent_id, response_label, question, solution, image_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [parent_id, response_label, question, solution, image_url]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Insert failed' });
  }
});

// PUT (update node)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { question, solution, image_url } = req.body;
  try {
    const { rows } = await db.query(
      'UPDATE troubleshoot_tree SET question=$1, solution=$2, image_url=$3 WHERE id=$4 RETURNING *',
      [question, solution, image_url, id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Update failed' });
  }
});

// DELETE node
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM troubleshoot_tree WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

module.exports = router;
