require('dotenv').config();
const { Pool } = require('pg');

// Test parameters database connection
const parametersPool = new Pool({
  host: process.env.PARAMETER_DB_HOST || 'dpg-d3f1hphr0fns73d4ts0g-a.singapore-postgres.render.com',
  port: process.env.PARAMETER_DB_PORT || 5432,
  database: process.env.PARAMETER_DB_NAME || 'parameters_db',
  user: process.env.PARAMETER_DB_USER || 'webmeter_db_user',
  password: process.env.PARAMETER_DB_PASSWORD || 'daWOGvyNuUBHDDRtwv8sLxisuHrwdnoL',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: {
    rejectUnauthorized: false,
    require: true
  }
});

async function testConnection() {
  try {
    console.log('🔍 Testing parameters database connection...');
    
    // Test basic connection
    const client = await parametersPool.connect();
    console.log('✅ Connected to parameters database');
    
    // Test if tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('meters', 'locations', 'buildings', 'floors', 'lognets')
      ORDER BY table_name
    `);
    
    console.log('📋 Available tables:', tablesResult.rows.map(r => r.table_name));
    
    // Test meters table
    if (tablesResult.rows.find(r => r.table_name === 'meters')) {
      const metersResult = await client.query('SELECT COUNT(*) FROM meters');
      console.log('🔢 Meters count:', metersResult.rows[0].count);
    } else {
      console.log('❌ Meters table not found');
    }
    
    // Test locations table
    if (tablesResult.rows.find(r => r.table_name === 'locations')) {
      const locationsResult = await client.query('SELECT COUNT(*) FROM locations');
      console.log('🔢 Locations count:', locationsResult.rows[0].count);
    } else {
      console.log('❌ Locations table not found');
    }
    
    client.release();
    console.log('✅ Test completed successfully');
    
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    console.error('🔍 Error details:', error);
  } finally {
    await parametersPool.end();
    process.exit();
  }
}

testConnection();
