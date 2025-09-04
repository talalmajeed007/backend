const { drizzle } = require('drizzle-orm/node-postgres');
const { pool } = require('./index');
const schema = require('../src/schema');

const db = drizzle(pool, { schema });

module.exports = { db, schema };


