const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// สร้าง parametersPool สำหรับ parameter database
const parametersPool = new Pool({
  host: process.env.DB_HOST || '49.0.87.9',
  port: process.env.DB_PORT || 5432,
  database: process.env.PARAMETER_DB_NAME || 'parameters_db', // ใช้ parameters database
  user: process.env.PARAMETER_DB_USER || 'postgres',
  password: process.env.PARAMETER_DB_PASSWORD || 'orangepi123',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
parametersPool.on('connect', () => {
  console.log('✅ Connected to Parameters PostgreSQL database');
  console.log('🚀 Database config:', {
    host: process.env.DB_HOST || '49.0.87.9',
    port: process.env.DB_PORT || 5432,
    database: process.env.PARAMETER_DB_NAME || 'parameters_db',
    user: process.env.PARAMETER_DB_USER || 'postgres'
  });
});

parametersPool.on('error', (err) => {
  console.error('❌ Unexpected error on parameters database client', err);
  console.error('❌ Error details:', {
    message: err.message,
    code: err.code,
    stack: err.stack
  });
});

// GET /api/parameters/slave/:slaveId - ดึงข้อมูลจาก parameter_value table ตาม slave_id
router.get('/slave/:slaveId', async (req, res) => {
  try {
    const { slaveId } = req.params;
    
    console.log('🚀 === PARAMETERS API: GET BY SLAVE ID ===');
    console.log(`🚀 Requested slave_id: ${slaveId}`);
    console.log(`🚀 Request params:`, req.params);
    console.log(`🚀 Request query:`, req.query);
    console.log(`🚀 Database config:`, {
      host: process.env.DB_HOST || '49.0.87.9',
      port: process.env.DB_PORT || 5432,
      database: process.env.PARAMETER_DB_NAME || 'parameters_db',
      user: process.env.PARAMETER_DB_USER || 'postgres'
    });
    
    // ตรวจสอบว่า slaveId เป็นตัวเลขหรือไม่
    const numericSlaveId = parseInt(slaveId);
    if (isNaN(numericSlaveId)) {
      console.log('❌ Invalid slave_id:', slaveId);
      return res.status(400).json({
        success: false,
        error: 'Invalid slave_id. Must be a number.',
        data: null
      });
    }
    
    // ดึงข้อมูลจาก parameter_value table ตาม slave_id
    const query = `
      SELECT 
        reading_timestamp,
        param_01_freqency,
        param_02_voltage_phase_1,
        param_03_voltage_phase_2,
        param_04_voltage_phase_3,
        param_05_voltage_avg_phase,
        param_06_voltage_line_1_2,
        param_07_voltage_line_2_3,
        param_08_voltage_line_3_1,
        param_09_voltage_avg_line,
        param_10_current_phase_a,
        param_11_current_phase_b,
        param_12_current_phase_c,
        param_13_current_avg_phase,
        param_14_current_neutral,
        param_15_power_phase_a,
        param_16_power_phase_b,
        param_17_power_phase_c,
        param_18_power_total_system,
        param_19_reactive_power_phase_a,
        param_20_reactive_power_phase_b,
        param_21_reactive_power_phase_c,
        param_22_reactive_power_total,
        param_23_apparent_power_phase_a,
        param_24_apparent_power_phase_b,
        param_25_apparent_power_phase_c,
        param_26_apparent_power_total,
        param_27_power_factor_phase_a,
        param_28_power_factor_phase_b,
        param_29_power_factor_phase_c,
        param_30_power_factor_total,
        param_31_power_demand,
        param_32_reactive_power_demand,
        param_33_apparent_power_demand,
        param_34_import_kwh,
        param_35_export_kwh,
        param_36_import_kvarh,
        param_37_export_kvarh,
        param_38_thdv,
        param_39_thdi
      FROM parameters_value
      WHERE slave_id = $1
      ORDER BY reading_timestamp DESC
      LIMIT 100
    `;
    
    console.log(`🚀 Executing query for slave_id: ${numericSlaveId}`);
    console.log(`🚀 SQL Query:`, query);
    
    // Test database connection first
    try {
      const testQuery = await parametersPool.query('SELECT 1 as test');
      console.log(`🚀 Database connection test:`, testQuery.rows[0]);
    } catch (testError) {
      console.log(`❌ Database connection test failed:`, testError.message);
      return res.status(500).json({
        success: false,
        error: 'Database connection failed',
        message: testError.message
      });
    }
    
    const result = await parametersPool.query(query, [numericSlaveId]);
    
    console.log(`🚀 Query executed successfully`);
    console.log(`🚀 Rows returned: ${result.rows.length}`);
    console.log(`🚀 First row sample:`, result.rows[0]);
    
    // Check table structure if no data
    if (result.rows.length === 0) {
      try {
        const tableCheck = await parametersPool.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'parameters_value' 
          ORDER BY ordinal_position
        `);
        console.log(`🚀 Table structure:`, tableCheck.rows);
        
        const dataCheck = await parametersPool.query(`
          SELECT COUNT(*) as total_rows, 
                 COUNT(DISTINCT slave_id) as unique_slave_ids,
                 MIN(slave_id) as min_slave_id,
                 MAX(slave_id) as max_slave_id
          FROM parameters_value
        `);
        console.log(`🚀 Data summary:`, dataCheck.rows[0]);
      } catch (checkError) {
        console.log(`❌ Table check failed:`, checkError.message);
      }
    }
    
    // แปลงข้อมูลให้อยู่ในรูปแบบที่ frontend ต้องการ
    const formattedData = result.rows.map(row => ({
      reading_timestamp: row.reading_timestamp,
      frequency: row.param_01_freqency,
      voltage_phase_1: row.param_02_voltage_phase_1,
      voltage_phase_2: row.param_03_voltage_phase_2,
      voltage_phase_3: row.param_04_voltage_phase_3,
      voltage_avg_phase: row.param_05_voltage_avg_phase,
      voltage_line_1_2: row.param_06_voltage_line_1_2,
      voltage_line_2_3: row.param_07_voltage_line_2_3,
      voltage_line_3_1: row.param_08_voltage_line_3_1,
      voltage_avg_line: row.param_09_voltage_avg_line,
      current_phase_a: row.param_10_current_phase_a,
      current_phase_b: row.param_11_current_phase_b,
      current_phase_c: row.param_12_current_phase_c,
      current_avg_phase: row.param_13_current_avg_phase,
      current_neutral: row.param_14_current_neutral,
      power_phase_a: row.param_15_power_phase_a,
      power_phase_b: row.param_16_power_phase_b,
      power_phase_c: row.param_17_power_phase_c,
      power_total_system: row.param_18_power_total_system,
      reactive_power_phase_a: row.param_19_reactive_power_phase_a,
      reactive_power_phase_b: row.param_20_reactive_power_phase_b,
      reactive_power_phase_c: row.param_21_reactive_power_phase_c,
      reactive_power_total: row.param_22_reactive_power_total,
      apparent_power_phase_a: row.param_23_apparent_power_phase_a,
      apparent_power_phase_b: row.param_24_apparent_power_phase_b,
      apparent_power_phase_c: row.param_25_apparent_power_phase_c,
      apparent_power_total: row.param_26_apparent_power_total,
      power_factor_phase_a: row.param_27_power_factor_phase_a,
      power_factor_phase_b: row.param_28_power_factor_phase_b,
      power_factor_phase_c: row.param_29_power_factor_phase_c,
      power_factor_total: row.param_30_power_factor_total,
      power_demand: row.param_31_power_demand,
      reactive_power_demand: row.param_32_reactive_power_demand,
      apparent_power_demand: row.param_33_apparent_power_demand,
      import_kwh: row.param_34_import_kwh,
      export_kwh: row.param_35_export_kwh,
      import_kvarh: row.param_36_import_kvarh,
      export_kvarh: row.param_37_export_kvarh,
      thdv: row.param_38_thdv,
      thdi: row.param_39_thdi
    }));
    
    console.log(`🚀 Data formatted successfully`);
    console.log(`🚀 Formatted data sample:`, formattedData[0]);
    console.log(`🚀 === SENDING RESPONSE ===`);
    console.log(`🚀 Response data count: ${formattedData.length}`);
    console.log(`🚀 Response success: true`);
    console.log(`🚀 Response slave_id: ${numericSlaveId}`);
    
    res.json({
      success: true,
      data: formattedData,
      count: formattedData.length,
      slave_id: numericSlaveId,
      message: `Successfully fetched ${formattedData.length} parameter records for slave_id: ${numericSlaveId}`
    });
    
    console.log('================================');
    
  } catch (error) {
    console.error('❌ === PARAMETERS API ERROR ===');
    console.error('❌ Error fetching parameter data:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error code:', error.code);
    console.log('================================');
    
    res.status(500).json({
      success: false,
      error: 'Database error occurred while fetching parameter data',
      message: error.message,
      data: null
    });
  }
});

// GET /api/parameters/slave/:slaveId/latest - ดึงข้อมูลล่าสุดจาก parameter_value table ตาม slave_id
router.get('/slave/:slaveId/latest', async (req, res) => {
  try {
    const { slaveId } = req.params;
    
    console.log('🚀 === PARAMETERS API: GET LATEST BY SLAVE ID ===');
    console.log(`🚀 Requested slave_id: ${slaveId}`);
    
    // ตรวจสอบว่า slaveId เป็นตัวเลขหรือไม่
    const numericSlaveId = parseInt(slaveId);
    if (isNaN(numericSlaveId)) {
      console.log('❌ Invalid slave_id:', slaveId);
      return res.status(400).json({
        success: false,
        error: 'Invalid slave_id. Must be a number.',
        data: null
      });
    }
    
    // ดึงข้อมูลล่าสุดจาก parameter_value table ตาม slave_id
    const query = `
      SELECT 
        reading_timestamp,
        param_01_freqency,
        param_02_voltage_phase_1,
        param_03_voltage_phase_2,
        param_04_voltage_phase_3,
        param_05_voltage_avg_phase,
        param_06_voltage_line_1_2,
        param_07_voltage_line_2_3,
        param_08_voltage_line_3_1,
        param_09_voltage_avg_line,
        param_10_current_phase_a,
        param_11_current_phase_b,
        param_12_current_phase_c,
        param_13_current_avg_phase,
        param_14_current_neutral,
        param_15_power_phase_a,
        param_16_power_phase_b,
        param_17_power_phase_c,
        param_18_power_total_system,
        param_19_reactive_power_phase_a,
        param_20_reactive_power_phase_b,
        param_21_reactive_power_phase_c,
        param_22_reactive_power_total,
        param_23_apparent_power_phase_a,
        param_24_apparent_power_phase_b,
        param_25_apparent_power_phase_c,
        param_26_apparent_power_total,
        param_27_power_factor_phase_a,
        param_28_power_factor_phase_b,
        param_29_power_factor_phase_c,
        param_30_power_factor_total,
        param_31_power_demand,
        param_32_reactive_power_demand,
        param_33_apparent_power_demand,
        param_34_import_kwh,
        param_35_export_kwh,
        param_36_import_kvarh,
        param_37_export_kvarh,
        param_38_thdv,
        param_39_thdi
      FROM parameters_value
      WHERE slave_id = $1
      ORDER BY reading_timestamp DESC
      LIMIT 1
    `;
    
    console.log(`🚀 Executing latest query for slave_id: ${numericSlaveId}`);
    
    const result = await parametersPool.query(query, [numericSlaveId]);
    
    if (result.rows.length === 0) {
      console.log(`🚀 No data found for slave_id: ${numericSlaveId}`);
      return res.json({
        success: true,
        data: null,
        count: 0,
        slave_id: numericSlaveId,
        message: `No parameter data found for slave_id: ${numericSlaveId}`
      });
    }
    
    const latestData = result.rows[0];
    console.log(`🚀 Latest data found:`, latestData);
    
    // แปลงข้อมูลให้อยู่ในรูปแบบที่ frontend ต้องการ
    const formattedData = {
      reading_timestamp: latestData.reading_timestamp,
      frequency: latestData.param_01_freqency,
      voltage_phase_1: latestData.param_02_voltage_phase_1,
      voltage_phase_2: latestData.param_03_voltage_phase_2,
      voltage_phase_3: latestData.param_04_voltage_phase_3,
      voltage_avg_phase: latestData.param_05_voltage_avg_phase,
      voltage_line_1_2: latestData.param_06_voltage_line_1_2,
      voltage_line_2_3: latestData.param_07_voltage_line_2_3,
      voltage_line_3_1: latestData.param_08_voltage_line_3_1,
      voltage_avg_line: latestData.param_09_voltage_avg_line,
      current_phase_a: latestData.param_10_current_phase_a,
      current_phase_b: latestData.param_11_current_phase_b,
      current_phase_c: latestData.param_12_current_phase_c,
      current_avg_phase: latestData.param_13_current_avg_phase,
      current_neutral: latestData.param_14_current_neutral,
      power_phase_a: latestData.param_15_power_phase_a,
      power_phase_b: latestData.param_16_power_phase_b,
      power_phase_c: latestData.param_17_power_phase_c,
      power_total_system: latestData.param_18_power_total_system,
      reactive_power_phase_a: latestData.param_19_reactive_power_phase_a,
      reactive_power_phase_b: latestData.param_20_reactive_power_phase_b,
      reactive_power_phase_c: latestData.param_21_reactive_power_phase_c,
      reactive_power_total: latestData.param_22_reactive_power_total,
      apparent_power_phase_a: latestData.param_23_apparent_power_phase_a,
      apparent_power_phase_b: latestData.param_24_apparent_power_phase_b,
      apparent_power_phase_c: latestData.param_25_apparent_power_phase_c,
      apparent_power_total: latestData.param_26_apparent_power_total,
      power_factor_phase_a: latestData.param_27_power_factor_phase_a,
      power_factor_phase_b: latestData.param_28_power_factor_phase_b,
      power_factor_phase_c: latestData.param_29_power_factor_phase_c,
      power_factor_total: latestData.param_30_power_factor_total,
      power_demand: latestData.param_31_power_demand,
      reactive_power_demand: latestData.param_32_reactive_power_demand,
      apparent_power_demand: latestData.param_33_apparent_power_demand,
      import_kwh: latestData.param_34_import_kwh,
      export_kwh: latestData.param_35_export_kwh,
      import_kvarh: latestData.param_36_import_kvarh,
      export_kvarh: latestData.param_37_export_kvarh,
      thdv: latestData.param_38_thdv,
      thdi: latestData.param_39_thdi
    };
    
    console.log(`🚀 Latest data formatted successfully`);
    console.log(`🚀 Formatted latest data:`, formattedData);
    
    res.json({
      success: true,
      data: formattedData,
      count: 1,
      slave_id: numericSlaveId,
      message: `Successfully fetched latest parameter data for slave_id: ${numericSlaveId}`
    });
    
    console.log('================================');
    
  } catch (error) {
    console.error('❌ === PARAMETERS API ERROR ===');
    console.error('❌ Error fetching latest parameter data:', error);
    console.error('❌ Error stack:', error.stack);
    console.log('================================');
    
    res.status(500).json({
      success: false,
      error: 'Database error occurred while fetching latest parameter data',
      message: error.message,
      data: null
    });
  }
});

module.exports = router;
