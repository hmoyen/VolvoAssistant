// server.js

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const db = require('./config/db'); 
const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: 'http://localhost:3000',
  methods: 'GET,POST,PUT,DELETE',
  allowedHeaders: 'Content-Type,Authorization'
}));
app.use(express.json());

const userRoutes = require('./routes/userRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const troubleshootTreeRoutes = require('./routes/troubleshootTree');
app.use('/api/users', userRoutes);
app.use('/schedule', scheduleRoutes);
app.use('/api/tree', troubleshootTreeRoutes);


app.get('/api/db-test', (req, res) => {
  db.query('SELECT NOW()', (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(200).json({ message: 'Database connected', result: result.rows });
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
