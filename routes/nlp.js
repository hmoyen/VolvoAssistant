const { NlpManager } = require('node-nlp');
const db = require('../config/db');

const manager = new NlpManager({ languages: ['en'], forceNER: true });

async function trainFromDatabase() {
  try {
    console.log('[TRAINING] Fetching questions from database...');
    const { rows } = await db.query('SELECT * FROM troubleshoot_tree WHERE parent_id IS NULL');
    console.log(`[TRAINING] Found ${rows.length} root nodes to train`);

    for (const row of rows) {

      const intent = `node_${row.id}`;
      console.log(`[TRAINING] Adding documents for intent: ${intent}`);

      console.log(`[TRAINING] Adding question: ${row.question}`);
      manager.addDocument('en', row.question, intent);

      if (row.keywords) {
        console.log(`[TRAINING] Adding ${row.keywords.length} keywords for intent ${intent}`);
        for (const kw of row.keywords) {
          console.log(`[TRAINING] Adding keyword: ${kw}`);
          manager.addDocument('en', kw, intent);
        }
      }

      console.log(`[TRAINING] Adding answer for intent ${intent}: Node ${row.id}: ${row.question}`);
      manager.addAnswer('en', intent, `Node ${row.id}: ${row.question}`);
    }

    console.log('[TRAINING] Training the manager...');
    await manager.train();
    console.log('[TRAINING] Training completed successfully');

    console.log('[TRAINING] Saving the manager...');
    await manager.save();
    console.log('[TRAINING] Manager saved successfully');
  } catch (err) {
    console.error('[TRAINING] Error during training:', err);
  }
}

async function loadManager() {
  try {
    console.log('[LOADING] Loading trained manager...');
    await manager.load();
    console.log('[LOADING] Manager loaded successfully');
  } catch (err) {
    console.error('[LOADING] Error loading manager:', err);
  }
}

module.exports = { manager, trainFromDatabase, loadManager };
