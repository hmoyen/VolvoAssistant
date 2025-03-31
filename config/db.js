require('dotenv').config(); 

const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: 5432,
  ssl: {
    rejectUnauthorized: false, 
  },
});

pool.connect()
    .then(() => console.log("Connected to the database"))
    .catch(err => console.error("Error connecting to the database", err.stack));

module.exports = pool;
