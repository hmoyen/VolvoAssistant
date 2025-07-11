const express = require('express');
const { manager } = require('./nlp');
const router = express.Router();
const db = require('../config/db'); 
const translate = require('@iamtraction/google-translate');

router.get('/test-translate', async (req, res) => {
  try {
    const result = await translate('Olá mundo', { from: 'pt', to: 'en' });
    console.log('Tradução:', result.text);
    res.json({ translated: result.text });
  } catch (err) {
    console.error('Erro de tradução:', err);
    res.status(500).json({ error: 'Falha na tradução' });
  }
});


router.get('/trees', async (req, res) => {
    const roots = await db.query('SELECT * FROM troubleshoot_tree WHERE parent_id IS NULL');
    res.json(roots.rows);
  });

// POST new node
router.post('/', async (req, res) => {
  const { question, solution, image_url } = req.body;
  try {
    const { rows } = await db.query(
      'INSERT INTO troubleshoot_tree (question, solution, image_url) VALUES ($1, $2, $3) RETURNING *',
      [question, solution, image_url]
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
    const translated = await translate(keyword, { from: 'pt', to: 'en' });
    console.log('Translated response:', translated.text);
    console.log('Original response:', keyword);
    const result = await manager.process('en', translated.text);
    console.log('[MATCH] NLP result:', result);

    if (result.intent.startsWith('node_') && result.score > 0.6) {
      const nodeId = parseInt(result.intent.replace('node_', ''));
      console.log(`[MATCH] Matched intent to node ID ${nodeId} with confidence ${result.score}`);

      // Verify if the nodeId is child fo another node
      const isChild = await db.query('SELECT 1 FROM tree_edges WHERE child_id = $1 LIMIT 1', [nodeId]);
      if (isChild.rows.length > 0) {
        return res.status(400).json({ message: 'Node is not a root node' });
      }

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


  const translated = await translate(response, { from: 'pt', to: 'en' });
  console.log('Translated response:', translated.text);
  console.log('Original response:', response);


  const words = translated.text
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2);

  if (words.length === 0) {
    return res.status(400).json({ error: 'No valid words in response' });
  }

  try {
    
    const { rows } = await db.query(`
      SELECT tt.*, te.response_label,
        (
          SELECT COUNT(*) FROM unnest($1::text[]) AS word
          WHERE LOWER(te.response_label) LIKE '%' || word || '%'
        ) AS match_score
      FROM tree_edges te
      JOIN troubleshoot_tree tt ON tt.id = te.child_id
      WHERE te.parent_id = $2
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


// POST /edges - Adiciona a noew edge
router.post('/edges', async (req, res) => {
  const { parent_id, child_id, response_label } = req.body;
  try {
    const { rows } = await db.query(
      'INSERT INTO tree_edges (parent_id, child_id, response_label) VALUES ($1, $2, $3) RETURNING *',
      [parent_id, child_id, response_label]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao inserir ligação' });
  }
});

// DELETE /edges
router.delete('/edges', async (req, res) => {
  const { parent_id, child_id } = req.body;
  try {
    await db.query(
      'DELETE FROM tree_edges WHERE parent_id = $1 AND child_id = $2',
      [parent_id, child_id]
    );
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao remover ligação' });
  }
});

// GET /graph
router.get('/graph', async (req, res) => {
  try {
    const nodesResult = await db.query('SELECT * FROM troubleshoot_tree');
    const edgesResult = await db.query('SELECT * FROM tree_edges');

    const nodes = nodesResult.rows;
    const edges = edgesResult.rows;

    const nodeMap = {};
    nodes.forEach(node => {
      node.responses = {}; // preparar estrutura de árvore
      nodeMap[node.id] = node;
    });

    edges.forEach(edge => {
      const parent = nodeMap[edge.parent_id];
      const child = nodeMap[edge.child_id];
      if (parent) {
        parent.responses[edge.response_label] = child;
      }
    });

    // Retornar apenas raízes (sem pais)
    const rootIds = new Set(nodes.map(n => n.id));
    edges.forEach(e => rootIds.delete(e.child_id));
    const roots = [...rootIds].map(id => nodeMap[id]);

    res.json(roots);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao montar grafo' });
  }
});

module.exports = router;
