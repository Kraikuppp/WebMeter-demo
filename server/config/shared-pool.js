const { Pool } = require('pg');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env.production') });

// Force production environment if on Render
if (process.env.RENDER) {
  process.env.NODE_ENV = 'production';
}

console.log('🔍 Shared Pool Configuration:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('PARAMETER_DB_NAME:', process.env.PARAMETER_DB_NAME);

// สร้าง shared connection pool เดียวสำหรับทุก routes
const sharedPool = new Pool({
  host: process.env.DB_HOST || 'dpg-d3f1hphr0fns73d4ts0g-a.singapore-postgres.render.com',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'webmeter_db', // ใช้ main database
  user: process.env.DB_USER || 'webmeter_db_user',
  password: process.env.DB_PASSWORD || 'daWOGvyNuUBHDDRtwv8sLxisuHrwdnoL',
  
  // Optimized settings for production
  max: 15, // ลดจำนวน max connections
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000, // เพิ่มเวลา timeout
  acquireTimeoutMillis: 20000,
  
  // SSL configuration
  ssl: {
    rejectUnauthorized: false,
    require: true
  },
  
  // Keep alive
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

// Event handlers
sharedPool.on('connect', () => {
  console.log('✅ Shared database pool connected');
});

sharedPool.on('error', (err) => {
  console.error('❌ Shared pool error:', err.message);
});

sharedPool.on('acquire', () => {
  console.log('🔗 Connection acquired from shared pool');
});

sharedPool.on('release', () => {
  console.log('🔓 Connection released to shared pool');
});

module.exports = {
  sharedPool,
  query: (text, params) => sharedPool.query(text, params)
};
