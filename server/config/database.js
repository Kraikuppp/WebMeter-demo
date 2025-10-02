const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Debug: ตรวจสอบ environment variables
console.log('🔍 Database Configuration:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'undefined');

// สร้าง connection pool สำหรับ PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || '192.168.1.175',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'webmeter_db',
  user: process.env.DB_USER || 'webmeter_app',
  password: process.env.DB_PASSWORD || 'WebMeter2024!',
  max: 20, // จำนวน connection สูงสุด
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
