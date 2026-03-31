const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
});

// REAL connection test
pool.query('SELECT NOW()')
    .then(res => {
        console.log('PostgreSQL connected at:', res.rows[0].now);
    })
    .catch(err => {
        console.error('PostgreSQL connection failed:', err.message);
    });

module.exports = pool;