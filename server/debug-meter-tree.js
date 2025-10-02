require('dotenv').config();
const { Pool } = require('pg');

// สร้าง connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'dpg-d3f1hphr0fns73d4ts0g-a.singapore-postgres.render.com',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'webmeter_db',
  user: process.env.DB_USER || 'webmeter_db_user',
  password: process.env.DB_PASSWORD || 'daWOGvyNuUBHDDRtwv8sLxisuHrwdnoL',
  ssl: {
    rejectUnauthorized: false,
    require: true
  }
});

async function debugMeterTreeData() {
  try {
    console.log('🔍 === METER TREE DATABASE DEBUG ===');
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('🗄️ Database:', process.env.DB_NAME || 'webmeter_db');
    console.log('');

    // 1. ตรวจสอบว่า tables มีอยู่หรือไม่
    console.log('📋 === CHECKING TABLES EXISTENCE ===');
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('meters', 'locations', 'buildings', 'floors', 'lognets')
      ORDER BY table_name
    `;
    
    const tablesResult = await pool.query(tablesQuery);
    console.log('✅ Available tables:', tablesResult.rows.map(r => r.table_name));
    
    if (tablesResult.rows.length === 0) {
      console.log('❌ No meter tree tables found!');
      return;
    }

    // 2. ตรวจสอบจำนวนข้อมูลในแต่ละ table
    console.log('\n📊 === TABLE RECORD COUNTS ===');
    
    for (const table of tablesResult.rows) {
      try {
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table.table_name}`);
        console.log(`📈 ${table.table_name}: ${countResult.rows[0].count} records`);
      } catch (error) {
        console.log(`❌ Error counting ${table.table_name}:`, error.message);
      }
    }

    // 3. ตรวจสอบ sample data จาก meters (ถ้ามี)
    if (tablesResult.rows.find(r => r.table_name === 'meters')) {
      console.log('\n🔌 === METERS SAMPLE DATA ===');
      try {
        const metersResult = await pool.query(`
          SELECT id, name, brand, model, slave_id, is_active, lognet_id, floor_id 
          FROM meters 
          ORDER BY id 
          LIMIT 5
        `);
        
        if (metersResult.rows.length > 0) {
          console.log('✅ Sample meters:');
          metersResult.rows.forEach((meter, index) => {
            console.log(`  ${index + 1}. ID: ${meter.id}, Name: ${meter.name}, Brand: ${meter.brand}, Model: ${meter.model}, Slave ID: ${meter.slave_id}, Active: ${meter.is_active}`);
          });
        } else {
          console.log('❌ No meters found in database');
        }
      } catch (error) {
        console.log('❌ Error fetching meters:', error.message);
      }
    }

    // 4. ตรวจสอบ sample data จาก locations (ถ้ามี)
    if (tablesResult.rows.find(r => r.table_name === 'locations')) {
      console.log('\n📍 === LOCATIONS SAMPLE DATA ===');
      try {
        const locationsResult = await pool.query(`
          SELECT id, name, description, parent_id, tree_type 
          FROM locations 
          ORDER BY id 
          LIMIT 5
        `);
        
        if (locationsResult.rows.length > 0) {
          console.log('✅ Sample locations:');
          locationsResult.rows.forEach((location, index) => {
            console.log(`  ${index + 1}. ID: ${location.id}, Name: ${location.name}, Type: ${location.tree_type}, Parent: ${location.parent_id}`);
          });
        } else {
          console.log('❌ No locations found in database');
        }
      } catch (error) {
        console.log('❌ Error fetching locations:', error.message);
      }
    }

    // 5. ตรวจสอบ relationships
    console.log('\n🔗 === CHECKING RELATIONSHIPS ===');
    try {
      const relationshipQuery = `
        SELECT 
          m.id as meter_id,
          m.name as meter_name,
          f.name as floor_name,
          b.name as building_name,
          l.name as location_name
        FROM meters m
        LEFT JOIN floors f ON m.floor_id = f.id
        LEFT JOIN buildings b ON f.building_id = b.id
        LEFT JOIN locations l ON b.location_id = l.id
        LIMIT 3
      `;
      
      const relationshipResult = await pool.query(relationshipQuery);
      if (relationshipResult.rows.length > 0) {
        console.log('✅ Meter relationships:');
        relationshipResult.rows.forEach((rel, index) => {
          console.log(`  ${index + 1}. Meter: ${rel.meter_name} → Floor: ${rel.floor_name} → Building: ${rel.building_name} → Location: ${rel.location_name}`);
        });
      } else {
        console.log('❌ No meter relationships found');
      }
    } catch (error) {
      console.log('❌ Error checking relationships:', error.message);
    }

    console.log('\n✅ === DEBUG COMPLETED ===');
    
  } catch (error) {
    console.error('❌ Database debug failed:', error.message);
    console.error('🔍 Error details:', error);
  } finally {
    await pool.end();
  }
}

// เรียกใช้ debug function
debugMeterTreeData();
