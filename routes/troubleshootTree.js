const express = require('express');
const { manager } = require('./nlp');
const router = express.Router();
const db = require('../config/db'); 

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


router.get('/match', async (req, res) => {
  const { keyword } = req.query;

  console.log('[MATCH] Received keyword:', keyword);

  if (!keyword) {
    console.warn('[MATCH] No keyword provided in query');
    return res.status(400).json({ error: "Keyword is required" });
  }

  try {
    console.log('[MATCH] Calling NLP manager with keyword...');
    const result = await manager.process('en', keyword);
    console.log('[MATCH] NLP result:', result);

    if (result.intent.startsWith('node_') && result.score > 0.6) {
      const nodeId = parseInt(result.intent.replace('node_', ''));
      console.log(`[MATCH] Matched intent to node ID ${nodeId} with confidence ${result.score}`);

      const { rows } = await db.query('SELECT * FROM troubleshoot_tree WHERE id = $1', [nodeId]);
      console.log(`[MATCH] Query result for node ${nodeId}:`, rows);

      if (rows.length === 0) {
        console.warn(`[MATCH] No node found in DB with ID ${nodeId}`);
        return res.status(404).json({ message: 'Node not found' });
      }

      return res.json(rows[0]);
    } else {
      console.warn('[MATCH] Intent not matched or low confidence:', result.intent, result.score);
      return res.status(404).json({ message: 'No intent match found' });
    }
  } catch (err) {
    console.error('[MATCH] Error during matching:', err);
    res.status(500).json({ error: 'Matching failed' });
  }
});


router.get('/match-response', async (req, res) => {
  const { parent_id, response } = req.query;

  if (!parent_id || !response) {
    return res.status(400).json({ error: 'parent_id and response are required' });
  }

  const words = response
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2);

  if (words.length === 0) {
    return res.status(400).json({ error: 'No valid words in response' });
  }

  try {
    const { rows } = await db.query(`
      SELECT *,
        (
          SELECT COUNT(*) FROM unnest($1::text[]) AS word
          WHERE LOWER(response_label) LIKE '%' || word || '%'
        ) AS match_score
      FROM troubleshoot_tree
      WHERE parent_id = $2
      ORDER BY match_score DESC
      LIMIT 1
    `, [words, parent_id]);

    if (rows.length === 0 || rows[0].match_score === 0) {
      return res.status(404).json({ message: 'No matching response found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Matching failed' });
  }
});


module.exports = router;
