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
  host: process.env.DB_HOST || 'dpg-d3f1hphr0fns73d4ts0g-a.singapore-postgres.render.com',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'webmeter_db',
  user: process.env.DB_USER || 'webmeter_db_user',
  password: process.env.DB_PASSWORD || 'daWOGvyNuUBHDDRtwv8sLxisuHrwdnoL',
  
  // Production-optimized connection settings
  max: process.env.NODE_ENV === 'production' ? 10 : 20, // ลดจำนวน connection ใน production
  min: 2, // connection ขั้นต่ำ
  idleTimeoutMillis: 60000, // เพิ่มเวลา idle timeout เป็น 60 วินาที
  connectionTimeoutMillis: 10000, // เพิ่มเวลา connection timeout เป็น 10 วินาที
  acquireTimeoutMillis: 30000, // เพิ่มเวลารอ connection จาก pool
  
  // SSL configuration for production
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false // อนุญาตให้ใช้ self-signed certificates
  } : false,
  
  // Keep alive settings
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  // ไม่ exit process ใน production เพื่อให้ระบบยังทำงานต่อได้
  if (process.env.NODE_ENV !== 'production') {
    process.exit(-1);
  }
});

// เพิ่ม event handlers สำหรับ production monitoring
pool.on('acquire', () => {
  console.log('🔗 Database connection acquired from pool');
});

pool.on('release', () => {
  console.log('🔓 Database connection released back to pool');
});

// Health check function
const healthCheck = async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('✅ Database health check passed');
    return true;
  } catch (error) {
    console.error('❌ Database health check failed:', error.message);
    return false;
  }
};

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('🛑 Closing database pool...');
  try {
    await pool.end();
    console.log('✅ Database pool closed successfully');
  } catch (error) {
    console.error('❌ Error closing database pool:', error);
  }
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  healthCheck,
  gracefulShutdown,
};
