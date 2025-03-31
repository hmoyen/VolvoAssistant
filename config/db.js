require('dotenv').config(); // This loads the .env file

const { Pool } = require('pg');

// Create a new pool instance with SSL configuration
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: 5432, // default PostgreSQL port
  ssl: {
    rejectUnauthorized: false, // Accept self-signed certificates (if needed)
  },
});

// Test the connection to the database
pool.connect()
    .then(() => console.log("Connected to the database"))
    .catch(err => console.error("Error connecting to the database", err.stack));

// Export the pool for use in other files
module.exports = pool;
