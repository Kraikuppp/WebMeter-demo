const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// สร้าง connection pool สำหรับ parameters_db
const parametersPool = new Pool({
  host: 'dpg-d3f1hphr0fns73d4ts0g-a.singapore-postgres.render.com',
  port: 5432,
  database: 'parameters_db',
  user: 'webmeter_db_user',
  password: 'daWOGvyNuUBHDDRtwv8sLxisuHrwdnoL',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
parametersPool.on('connect', () => {
  console.log('✅ Connected to parameters_db database');
  // DEBUG: Database connection test log
  parametersPool.query('SELECT 1')
    .then(() => console.log('[DB TEST] ✅ Database connection successful'))
    .catch(err => console.error('[DB TEST] ❌ Database connection failed:', err.message));
});

parametersPool.on('error', (err) => {
  console.error('❌ Unexpected error on parameters_db client', err);
});

// GET /api/realtime-data - ดึงข้อมูล real-time ตาม slave_id และ columns ที่เลือก
router.get('/api/realtime-data', async (req, res) => {
  try {
    const { slaveIds, columns } = req.query;
    
    console.log('🔄 === REALTIME DATA API CALL ===');
    console.log('📅 Current Time:', new Date().toLocaleString('th-TH'));
    console.log('📋 Slave IDs from frontend:', slaveIds);
    console.log('📊 Selected Columns:', columns);
    
    // ตรวจสอบ parameters
    if (!slaveIds || !columns) {
      console.log('❌ Missing required parameters');
      return res.status(400).json({ 
        error: 'Missing required parameters: slaveIds and columns' 
      });
    }
    
    // แปลง parameters
    const slaveIdArray = Array.isArray(slaveIds) ? slaveIds : slaveIds.split(',').map(id => parseInt(id.trim()));
    const columnArray = Array.isArray(columns) ? columns : columns.split(',');
    
    console.log('🔢 Slave IDs array:', slaveIdArray);
    console.log('📋 Columns array:', columnArray);
    
         // สร้าง mapping สำหรับ column names ไปยัง database fields
     const columnMapping = {
       'Frequency': 'param_01_freqency',
       'Volt AN': 'param_02_voltage_phase_1',
       'Volt BN': 'param_03_voltage_phase_2',
       'Volt CN': 'param_04_voltage_phase_3',
       'Volt LN Avg': 'param_05_voltage_avg_phase',
       'Volt AB': 'param_06_voltage_line_1_2',
       'Volt BC': 'param_07_voltage_line_2_3',
       'Volt CA': 'param_08_voltage_line_3_1',
       'Volt LL Avg': 'param_09_voltage_avg_line',
       'Current A': 'param_10_current_phase_a',
       'Current B': 'param_11_current_phase_b',
       'Current C': 'param_12_current_phase_c',
       'Current Avg': 'param_13_current_avg_phase',
       'Current IN': 'param_14_current_neutral',
       'Watt A': 'param_15_power_phase_a',
       'Watt B': 'param_16_power_phase_b',
       'Watt C': 'param_17_power_phase_c',
       'Watt Total': 'param_18_power_total_system',
       'Var A': 'param_19_reactive_power_phase_a',
       'Var B': 'param_20_reactive_power_phase_b',
       'Var C': 'param_21_reactive_power_phase_c',
       'Var total': 'param_22_reactive_power_total',
       'VA A': 'param_23_apparent_power_phase_a',
       'VA B': 'param_24_apparent_power_phase_b',
       'VA C': 'param_25_apparent_power_phase_c',
       'VA Total': 'param_26_apparent_power_total',
       'PF A': 'param_27_power_factor_phase_a',
       'PF B': 'param_28_power_factor_phase_b',
       'PF C': 'param_29_power_factor_phase_c',
       'PF Total': 'param_30_power_factor_total',
       'Demand W': 'param_31_power_demand',
       'Demand Var': 'param_32_reactive_power_demand',
       'Demand VA': 'param_33_apparent_power_demand',
       'Import kWh': 'param_34_import_kwh',
       'Export kWh': 'param_35_export_kwh',
       'Import kVarh': 'param_36_import_kvarh',
       'Export kVarh': 'param_37_export_kvarh',
       'THDV': 'param_38_thdv',
       'THDI': 'param_39_thdi'
     };
    
    // สร้าง SELECT clause
    const selectFields = columnArray.map(col => {
      const dbField = columnMapping[col];
      if (!dbField) {
        console.log(`⚠️ Warning: No mapping found for column: ${col}`);
        return `NULL as "${col}"`;
      }
      return `${dbField} as "${col}"`;
    });
    
    // เพิ่ม slave_id และ reading_timestamp
    selectFields.unshift('slave_id', 'reading_timestamp');
    
    const selectClause = selectFields.join(', ');
    
    // สร้าง WHERE clause สำหรับ slave_id และเวลาย้อนหลัง (ลองหลายช่วงเวลา)
    const now = new Date();
    let result;
    let timeRange;
    
    // ลองหาข้อมูลในช่วงเวลาต่างๆ จากใกล้ไปไกล
    const timeRanges = [
      { minutes: 5, label: '5 minutes' },
      { minutes: 15, label: '15 minutes' },
      { minutes: 30, label: '30 minutes' },
      { minutes: 60, label: '1 hour' },
      { minutes: 180, label: '3 hours' }
    ];
    
    // สร้าง SQL query template
    const query = `
      SELECT ${selectClause}
      FROM parameters_value 
      WHERE slave_id = ANY($1)
        AND reading_timestamp >= $2 
        AND reading_timestamp <= $3
      ORDER BY slave_id, reading_timestamp DESC
      LIMIT 100
    `;
    
    // ลองหาข้อมูลในแต่ละช่วงเวลา
    for (const range of timeRanges) {
      const startTime = new Date(now.getTime() - (range.minutes * 60 * 1000));
      const endTime = now;
      
      console.log(`🔍 Trying ${range.label} range:`, {
        from: startTime.toISOString(),
        to: endTime.toISOString()
      });
      
      const queryParams = [slaveIdArray, startTime, endTime];
      
      console.log('🔍 Executing query:', query);
      console.log('📋 Query parameters:', queryParams);
      
      result = await parametersPool.query(query, queryParams);
      
      console.log(`📊 Found ${result.rows.length} rows in ${range.label} range`);
      
      if (result.rows.length > 0) {
        timeRange = { from: startTime, to: endTime, range: range.label };
        console.log(`✅ Using data from ${range.label} range`);
        break;
      }
    }
    
    // ถ้าไม่เจอข้อมูลเลย ให้ใช้ช่วงเวลาสุดท้าย
    if (!result || result.rows.length === 0) {
      const lastRange = timeRanges[timeRanges.length - 1];
      const startTime = new Date(now.getTime() - (lastRange.minutes * 60 * 1000));
      timeRange = { from: startTime, to: now, range: lastRange.label };
      console.log('⚠️ No data found in any time range');
    }
    
    console.log('✅ Query executed successfully');
    console.log('📊 Total rows fetched:', result.rows.length);
    
    if (result.rows.length > 0) {
      console.log('📋 First row sample:', result.rows[0]);
      console.log('🔢 Unique Slave IDs in result:', [...new Set(result.rows.map(row => row.slave_id))]);
    } else {
      console.log('⚠️ No data found for the specified time range and slave IDs');
    }
    
    // จัดกลุ่มข้อมูลตาม slave_id
    const groupedData = {};
    slaveIdArray.forEach(slaveId => {
      const slaveData = result.rows.filter(row => row.slave_id === slaveId);
      if (slaveData.length > 0) {
        // ใช้ข้อมูลล่าสุด
        groupedData[slaveId] = slaveData[0];
      } else {
        // หากไม่มีข้อมูล ให้สร้าง object ว่าง
        groupedData[slaveId] = {
          slave_id: slaveId,
          reading_timestamp: now,
          ...columnArray.reduce((acc, col) => {
            acc[col] = null;
            return acc;
          }, {})
        };
      }
    });
    
    console.log('📊 Grouped data by slave_id:', Object.keys(groupedData));
    console.log('================================');
    
    res.json({
      success: true,
      data: groupedData,
      timestamp: now.toISOString(),
      queryInfo: {
        slaveIds: slaveIdArray,
        columns: columnArray,
        timeRange: timeRange ? {
          from: timeRange.from.toISOString(),
          to: timeRange.to.toISOString(),
          range: timeRange.range
        } : {
          from: now.toISOString(),
          to: now.toISOString(),
          range: 'no data found'
        },
        totalRows: result ? result.rows.length : 0
      }
    });
    
  } catch (error) {
    console.error('❌ Error in realtime-data API:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

module.exports = router;
