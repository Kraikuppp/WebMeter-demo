const express = require('express');
const { Pool } = require('pg');
const router = express.Router();

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

// Mapping ระหว่างชื่อ column ใน UI กับ column ใน database
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

// GET /api/table-data - ดึงข้อมูลตามช่วงวันเวลาและคอลัมน์ที่เลือก
router.get('/', async (req, res) => {
  try {
    const {
      dateFrom,
      dateTo,
      timeFrom = '00:00',
      timeTo = '23:59',
      columns,
      slaveIds,
      interval
    } = req.query;

    // ตรวจสอบ required parameters
    if (!dateFrom || !dateTo) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'dateFrom and dateTo are required'
      });
    }

    // สร้าง datetime strings
    const startDateTime = `${dateFrom} ${timeFrom}:00`;
    
    // แก้ไข: เพิ่ม 59 วินาทีให้ endDateTime เพื่อรวมข้อมูลในนาทีสุดท้าย
    const endTime = timeTo.split(':');
    const endHour = parseInt(endTime[0]);
    const endMinute = parseInt(endTime[1]);
    const endDateTime = `${dateTo} ${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}:59`;

    console.log('🕐 Time Range Fix Applied:');
    console.log('📅 Original timeTo:', timeTo);
    console.log('📅 Adjusted endDateTime:', endDateTime);

    // แปลง columns เป็น array และแมป
    let selectedColumns = [];
    if (columns) {
      selectedColumns = Array.isArray(columns) ? columns : [columns];
    } else {
      selectedColumns = Object.keys(columnMapping);
    }

    // เพิ่ม timestamp และ slave_id เสมอ
    const selectedDbColumns = ['reading_timestamp', 'slave_id'];
    
    // ตรวจสอบว่า columns ที่ส่งมาเป็น database column names หรือ UI column names
    selectedColumns.forEach(col => {
      // ถ้าเป็น database column name (ขึ้นต้นด้วย param_) ให้ใช้เลย
      if (col.startsWith('param_')) {
        selectedDbColumns.push(col);
      }
      // ถ้าเป็น UI column name ให้แมปเป็น database column name
      else if (columnMapping[col]) {
        selectedDbColumns.push(columnMapping[col]);
      }
      // ถ้าเป็น reading_timestamp หรือ slave_id ให้ข้าม (มีอยู่แล้ว)
      else if (col === 'reading_timestamp' || col === 'slave_id') {
        // ข้าม
      }
      // ถ้าไม่รู้จักให้เพิ่มเข้าไปเลย (เผื่อเป็น column name อื่น)
      else {
        selectedDbColumns.push(col);
      }
    });

    // แปลง slaveIds เป็น array
    let slaveIdArray = [];
    if (slaveIds) {
      if (Array.isArray(slaveIds)) {
        slaveIdArray = slaveIds.map(id => Number(id));
      } else {
        slaveIdArray = [Number(slaveIds)];
      }
    }

    // Debug: ตรวจสอบ slaveIds
    console.log('🔍 === SLAVE ID DEBUG ===');
    console.log('🔢 slaveIds (raw):', slaveIds);
    console.log('🔢 slaveIds type:', typeof slaveIds);
    console.log('🔢 slaveIds isArray:', Array.isArray(slaveIds));
    console.log('🔢 slaveIdArray:', slaveIdArray);
    console.log('🔢 slaveIdArray.length:', slaveIdArray.length);
    console.log('================================');

    // Log ข้อมูลการประมวลผล
    console.log('🔧 === BACKEND PROCESSING LOG ===');
    console.log('📅 Date Range:', `${startDateTime} to ${endDateTime}`);
    console.log('🔢 Slave IDs from frontend:', slaveIds);
    console.log('🔢 Slave IDs array:', slaveIdArray);
    console.log('📊 Selected Columns (from frontend):', selectedColumns);
    console.log('📊 Selected DB Columns (for SQL):', selectedDbColumns);
    console.log('⏱️ Interval:', interval);
    console.log('================================');

    let allRows = [];

    // ตรวจสอบจำนวนใน array แล้วตัดสินใจวิธีการดึงข้อมูล
    if (slaveIdArray.length > 1) {
      console.log(`🔄 Multiple slave IDs detected (${slaveIdArray.length}). Processing individually...`);
      
      // วนลูปดึงข้อมูลทีละ slave_id
      for (const slaveId of slaveIdArray) {
        console.log(`🔄 Processing slave_id: ${slaveId}`);
        
        // สร้าง SQL query สำหรับ slave_id นี้
        let query = `
          SELECT ${selectedDbColumns.join(', ')}
          FROM parameters_value
          WHERE reading_timestamp >= $1 
          AND reading_timestamp <= $2
          AND slave_id = $3
        `;

        // เพิ่มเงื่อนไขสำหรับ interval 15 นาที
        if (interval === '15') {
          query += ` AND EXTRACT(MINUTE FROM reading_timestamp) % 15 = 0`;
        }

        // เรียงลำดับตาม timestamp
        query += ` ORDER BY reading_timestamp ASC`;

        const queryParams = [startDateTime, endDateTime, slaveId];

        console.log(`🔍 Executing query for slave_id ${slaveId}:`, query);
        console.log('📊 Parameters:', queryParams);

        try {
          const result = await parametersPool.query(query, queryParams);
          console.log(`✅ Slave ID ${slaveId}: ${result.rows.length} rows retrieved`);
          
          // รวมข้อมูลเข้า allRows
          allRows = allRows.concat(result.rows);
        } catch (error) {
          console.error(`❌ Error querying slave_id ${slaveId}:`, error.message);
          // ยังคงประมวลผล slave_id อื่นต่อไป
        }
      }
      
      console.log(`🔄 Loop completed. Total rows from all slave IDs: ${allRows.length}`);
      
    } else if (slaveIdArray.length === 1) {
      console.log(`🔄 Single slave ID detected: ${slaveIdArray[0]}`);
      
      // สร้าง SQL query สำหรับ slave_id เดียว
      let query = `
        SELECT ${selectedDbColumns.join(', ')}
        FROM parameters_value
        WHERE reading_timestamp >= $1 
        AND reading_timestamp <= $2
        AND slave_id = $3
      `;

      // เพิ่มเงื่อนไขสำหรับ interval 15 นาที
      if (interval === '15') {
        query += ` AND EXTRACT(MINUTE FROM reading_timestamp) % 15 = 0`;
      }

      // เรียงลำดับตาม timestamp
      query += ` ORDER BY reading_timestamp ASC`;

      const queryParams = [startDateTime, endDateTime, slaveIdArray[0]];

      console.log('🔍 Executing single query:', query);
      console.log('📊 Parameters:', queryParams);

      const result = await parametersPool.query(query, queryParams);
      allRows = result.rows;
      
    } else {
      console.log('🔄 No slave ID specified. Fetching all data...');
      
      // ไม่มี slave_id filter
      let query = `
        SELECT ${selectedDbColumns.join(', ')}
        FROM parameters_value
        WHERE reading_timestamp >= $1 
        AND reading_timestamp <= $2
      `;

      // เพิ่มเงื่อนไขสำหรับ interval 15 นาที
      if (interval === '15') {
        query += ` AND EXTRACT(MINUTE FROM reading_timestamp) % 15 = 0`;
      }

      // เรียงลำดับตาม timestamp
      query += ` ORDER BY reading_timestamp ASC`;

      const queryParams = [startDateTime, endDateTime];

      console.log('🔍 Executing query without slave_id filter:', query);
      console.log('📊 Parameters:', queryParams);

      const result = await parametersPool.query(query, queryParams);
      allRows = result.rows;
    }

    console.log('✅ Query execution completed');
    console.log('📈 Total number of rows returned:', allRows.length);

    if (allRows.length > 0) {
      console.log('🔧 Available columns in result:', Object.keys(allRows[0]));
      console.log('🔧 First row sample:', allRows[0]);
      
      // ตรวจสอบ slave_id ในข้อมูลที่ได้
      const uniqueSlaveIds = [...new Set(allRows.map(row => row.slave_id))];
      console.log('🔍 Unique Slave IDs in result:', uniqueSlaveIds);
      console.log('🔍 Expected Slave IDs:', slaveIdArray);
    }

    // Debug: ตรวจสอบคอลัมน์ที่มีในตาราง
    try {
      const columnCheckQuery = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'parameters_value'
        ORDER BY ordinal_position
      `;
      const columnCheck = await parametersPool.query(columnCheckQuery);
      console.log('🔧 Available columns in parameters_value table:', columnCheck.rows.map(row => row.column_name));
    } catch (error) {
      console.log('⚠️ Error checking table columns:', error.message);
    }

    // แปลงข้อมูลให้อยู่ในรูปแบบที่ frontend ต้องการ
    const formattedData = allRows.map(row => {
      const formattedRow = {
        time: row.reading_timestamp,
        reading_timestamp: row.reading_timestamp, // เพิ่ม reading_timestamp สำหรับ compatibility
        slave_id: row.slave_id // เพิ่ม slave_id เพื่อให้ frontend แยกข้อมูลตามมิเตอร์
      };

      // แปลงชื่อคอลัมน์จาก database กลับเป็นชื่อใน UI
      Object.keys(columnMapping).forEach(uiColumn => {
        const dbColumn = columnMapping[uiColumn];
        if (row.hasOwnProperty(dbColumn)) {
          formattedRow[uiColumn] = row[dbColumn];
          // เพิ่ม database column name ด้วยเพื่อให้ frontend เข้าถึงได้
          formattedRow[dbColumn] = row[dbColumn];
        }
      });

      // เพิ่มข้อมูลดิบจาก database columns ทั้งหมด
      Object.keys(row).forEach(key => {
        if (!formattedRow.hasOwnProperty(key)) {
          formattedRow[key] = row[key];
        }
      });

      return formattedRow;
    });

    console.log('🔄 Data formatting completed');
    console.log('📊 Total formatted rows:', formattedData.length);
    if (formattedData.length > 0) {
      console.log('🔄 Formatted data sample (first row):', formattedData[0]);
      console.log('🔄 Available keys in formatted data:', Object.keys(formattedData[0]));
      
      // ตรวจสอบว่ามีข้อมูล parameters หรือไม่
      const hasParameterData = Object.keys(formattedData[0]).some(key => 
        key.startsWith('param_') || Object.keys(columnMapping).includes(key)
      );
      console.log('🔄 Has parameter data:', hasParameterData);
      
      if (!hasParameterData) {
        console.log('⚠️ WARNING: No parameter data found in formatted response!');
        console.log('⚠️ This might be why export shows no data values');
      }
    }

    res.json({
      success: true,
      data: formattedData,
      count: formattedData.length,
      columns: selectedColumns,
      dateRange: {
        from: startDateTime,
        to: endDateTime
      },
      slaveIds: slaveIdArray
    });

  } catch (error) {
    console.error('❌ Error fetching table data:', error);
    res.status(500).json({
      error: 'Database error',
      message: error.message
    });
  }
});


// GET /api/dashboard/current-values - ดึงค่าปัจจุบัน
router.get('/dashboard/current-values', async (req, res) => {
  try {
    const { meterId } = req.query;
    
    const query = `
      SELECT 
        param_18_power_total_system as watt,
        param_22_reactive_power_total as var,
        param_26_apparent_power_total as va,
        param_30_power_factor_total as power_factor,
        param_05_voltage_avg_phase as volt_ln,
        param_09_voltage_avg_line as volt_ll,
        param_13_current_avg_phase as current_avg,
        param_01_freqency as frequency,
        reading_timestamp as timestamp
      FROM parameters_value
      ORDER BY reading_timestamp DESC
      LIMIT 1
    `;

    const result = await parametersPool.query(query);
    const data = result.rows[0] || {
      watt: 4200, var: 1200, va: 4400, power_factor: 0.95,
      volt_ln: 228, volt_ll: 395, current_avg: 32, frequency: 49.98,
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: {
        watt: data.watt,
        var: data.var,
        va: data.va,
        powerFactor: data.power_factor,
        voltLN: data.volt_ln,
        voltLL: data.volt_ll,
        currentAvg: data.current_avg,
        frequency: data.frequency,
        timestamp: data.timestamp
      }
    });

  } catch (error) {
    console.error('❌ Error fetching current values:', error);
    res.status(500).json({
      error: 'Database error',
      message: error.message
    });
  }
});

// Test endpoint for charge API
router.get('/charge-test', (req, res) => {
  res.json({
    success: true,
    message: 'Charge API endpoint is working!',
    timestamp: new Date().toISOString()
  });
});

// GET /api/table-data/charge - ดึงข้อมูล charge ตามช่วงวันเวลาและ slave_id
router.get('/charge', async (req, res) => {
  try {
    const {
      dateFrom,
      dateTo,
      timeFrom = '00:00',
      timeTo = '23:59',
      slaveIds
    } = req.query;

    // ตรวจสอบ required parameters
    if (!dateFrom || !dateTo) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'dateFrom and dateTo are required'
      });
    }

    // สร้าง datetime strings
    const startDateTime = `${dateFrom} ${timeFrom}:00`;
    
    // แก้ไข: เพิ่ม 59 วินาทีให้ endDateTime เพื่อรวมข้อมูลในนาทีสุดท้าย
    const endTime = timeTo.split(':');
    const endHour = parseInt(endTime[0]);
    const endMinute = parseInt(endTime[1]);
    const endDateTime = `${dateTo} ${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}:59`;

    // แปลง slaveIds เป็น array ถ้ามี
    let slaveIdArray = [];
    if (slaveIds) {
      slaveIdArray = Array.isArray(slaveIds) ? slaveIds : [slaveIds];
    }

    console.log('🔧 === CHARGE DATA PROCESSING ===');
    console.log('📅 Date Range:', `${startDateTime} to ${endDateTime}`);
    console.log('🔢 Slave IDs:', slaveIdArray);

    // สร้าง SQL query สำหรับดึงข้อมูล meter readings
    let query = `
      SELECT 
        pv.slave_id,
        'Meter-' || pv.slave_id as meter_name,
        '3.1' as meter_class,
        MAX(pv.param_31_power_demand) as demand_w,
        MAX(pv.param_32_reactive_power_demand) as demand_var,
        MAX(pv.param_33_apparent_power_demand) as demand_va,
        MAX(pv.param_34_import_kwh) - MIN(pv.param_34_import_kwh) as total_kwh,
        MAX(CASE WHEN EXTRACT(HOUR FROM pv.reading_timestamp) BETWEEN 9 AND 22 THEN pv.param_34_import_kwh ELSE 0 END) - 
        MIN(CASE WHEN EXTRACT(HOUR FROM pv.reading_timestamp) BETWEEN 9 AND 22 THEN pv.param_34_import_kwh ELSE 0 END) as on_peak_kwh,
        MAX(CASE WHEN EXTRACT(HOUR FROM pv.reading_timestamp) NOT BETWEEN 9 AND 22 THEN pv.param_34_import_kwh ELSE 0 END) - 
        MIN(CASE WHEN EXTRACT(HOUR FROM pv.reading_timestamp) NOT BETWEEN 9 AND 22 THEN pv.param_34_import_kwh ELSE 0 END) as off_peak_kwh


      FROM parameters_value pv
      WHERE pv.reading_timestamp >= $1 
      AND pv.reading_timestamp <= $2
    `;

    const queryParams = [startDateTime, endDateTime];

    // เพิ่มเงื่อนไข slave_id ถ้ามี
    if (slaveIdArray.length > 0) {
      query += ` AND pv.slave_id = ANY($3)`;
      queryParams.push(slaveIdArray);
    }

    query += `
      GROUP BY pv.slave_id
      ORDER BY pv.slave_id
    `;

    console.log('🔍 Query:', query);
    console.log('🔢 Parameters:', queryParams);

    const result = await parametersPool.query(query, queryParams);

    // คำนวณ charge data
    const chargeData = result.rows.map(row => {
      const demandW = parseFloat(row.demand_w) || 0;
      const demandVar = parseFloat(row.demand_var) || 0;
      const demandVA = parseFloat(row.demand_va) || 0;
      const totalKWh = parseFloat(row.total_kwh) || 0;
      const onPeakKWh = parseFloat(row.on_peak_kwh) || 0;
      const offPeakKWh = parseFloat(row.off_peak_kwh) || 0;

      // คำนวณตามสูตร
      const onPeakDmW = demandW * 0.2;
      const offPeakDmW = demandW * 0.8;
      const onPeakWhCharge = onPeakKWh * 4.1839;
      const offPeakWhCharge = offPeakKWh * 2.6037;
      const totalWhCharge = onPeakWhCharge + offPeakWhCharge;
      const onPeakDemandCharge = onPeakDmW * 132.93;
      const offPeakDemandCharge = offPeakDmW * 132.93;
      const totalDemandCharge = onPeakDemandCharge + offPeakDemandCharge;
      const powerFactor = demandVA / demandW;
      const powerFactorCharge = powerFactor > 728 ? (powerFactor - 728) * 56.07 : 0;
      const ft = (demandW + totalKWh) * -0.147;
      const total = totalWhCharge + totalDemandCharge + powerFactorCharge;
      const vat = (total - ft) * 0.07;
      const grandTotal = vat + (total - ft);

      return {
        meterName: row.meter_name || `Meter-${row.slave_id}`,
        class: row.meter_class || '3.1',
        demandW: Math.round(demandW),
        demandVar: Math.round(demandVar),
        demandVA: Math.round(demandVA),
        offPeakKWh: Math.round(offPeakKWh),
        onPeakKWh: Math.round(onPeakKWh),
        totalKWh: Math.round(totalKWh),
        whCharge: Math.round(totalWhCharge * 100) / 100,
        ft: Math.round(ft * 100) / 100,
        demandCharge: Math.round(totalDemandCharge * 100) / 100,
        surcharge: Math.round(powerFactorCharge * 100) / 100,
        total: Math.round(total * 100) / 100,
        vat: Math.round(vat * 100) / 100,
        grandTotal: Math.round(grandTotal * 100) / 100
      };
    });

    console.log('✅ Charge data calculated:', chargeData.length, 'records');

    res.json({
      success: true,
      data: chargeData,
      message: 'Charge data retrieved successfully'
    });

  } catch (error) {
    console.error('❌ Error fetching charge data:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET /api/table-data/demand-charge-log - ดึงข้อมูล demand charge แบบ log ที่แสดงค่าสูงสุดและต่ำสุด
router.get('/demand-charge-log', async (req, res) => {
  try {
    const {
      dateFrom,
      dateTo,
      timeFrom = '00:00',
      timeTo = '23:59',
      slaveIds
    } = req.query;

    // ตรวจสอบ required parameters
    if (!dateFrom || !dateTo) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'dateFrom and dateTo are required'
      });
    }

    // สร้าง datetime strings
    const startDateTime = `${dateFrom} ${timeFrom}:00`;
    
    // แก้ไข: เพิ่ม 59 วินาทีให้ endDateTime เพื่อรวมข้อมูลในนาทีสุดท้าย
    const endTime = timeTo.split(':');
    const endHour = parseInt(endTime[0]);
    const endMinute = parseInt(endTime[1]);
    const endDateTime = `${dateTo} ${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}:59`;

    // แปลง slaveIds เป็น array ถ้ามี
    let slaveIdArray = [];
    if (slaveIds) {
      slaveIdArray = Array.isArray(slaveIds) ? slaveIds : [slaveIds];
    }

    console.log('🔧 === DEMAND CHARGE LOG DATA PROCESSING ===');
    console.log('📅 Date Range:', `${startDateTime} to ${endDateTime}`);
    console.log('🔢 Slave IDs:', slaveIdArray);

    // สร้าง SQL query สำหรับดึงข้อมูล demand แบบ log (ทุก 15 นาที)
    let query = `
      SELECT 
        pv.slave_id,
        m.name as meter_name,
        m.meter_class,
        pv.reading_timestamp,
        pv.param_31_power_demand as demand_w,
        pv.param_32_reactive_power_demand as demand_var,
        pv.param_33_apparent_power_demand as demand_va,
        pv.param_34_import_kwh as import_kwh,
        pv.param_35_export_kwh as export_kwh,
        pv.param_36_import_kvarh as import_kvarh,
        pv.param_37_export_kvarh as export_kvarh
      FROM parameters_value pv
      LEFT JOIN meters m ON pv.slave_id = m.slave_id
      WHERE pv.reading_timestamp >= $1 
      AND pv.reading_timestamp <= $2
      AND EXTRACT(MINUTE FROM pv.reading_timestamp) % 15 = 0
    `;

    const queryParams = [startDateTime, endDateTime];

    // เพิ่มเงื่อนไข slave_id ถ้ามี
    if (slaveIdArray.length > 0) {
      query += ` AND pv.slave_id = ANY($3)`;
      queryParams.push(slaveIdArray);
    }

    query += `
      ORDER BY pv.slave_id, pv.reading_timestamp
    `;

    console.log('🔍 Query:', query);
    console.log('🔢 Parameters:', queryParams);

    const result = await parametersPool.query(query, queryParams);

    // จัดกลุ่มข้อมูลตาม slave_id และคำนวณค่าสูงสุดและต่ำสุด
    const groupedData = {};
    
    result.rows.forEach(row => {
      const slaveId = row.slave_id;
      const meterName = row.meter_name || `Meter-${slaveId}`;
      const meterClass = row.meter_class || '3.1';
      
      if (!groupedData[slaveId]) {
        groupedData[slaveId] = {
          meterName,
          meterClass,
          slaveId,
          logData: [],
          maxDemand: {
            watt: 0,
            var: 0,
            va: 0,
            timestamp: null
          },
          minDemand: {
            watt: Infinity,
            var: Infinity,
            va: Infinity,
            timestamp: null
          },
          onPeakDemand: {
            watt: 0,
            var: 0,
            va: 0,
            timestamp: null
          },
          offPeakDemand: {
            watt: 0,
            var: 0,
            va: 0,
            timestamp: null
          }
        };
      }

      const demandW = parseFloat(row.demand_w) || 0;
      const demandVar = parseFloat(row.demand_var) || 0;
      const demandVA = parseFloat(row.demand_va) || 0;
      const timestamp = new Date(row.reading_timestamp);
      const hour = timestamp.getHours();
      const isOnPeak = hour >= 9 && hour <= 22;

      // เพิ่มข้อมูล log
      groupedData[slaveId].logData.push({
        timestamp: row.reading_timestamp,
        demandW,
        demandVar,
        demandVA,
        importKwh: parseFloat(row.import_kwh) || 0,
        exportKwh: parseFloat(row.export_kwh) || 0,
        importKvarh: parseFloat(row.import_kvarh) || 0,
        exportKvarh: parseFloat(row.export_kvarh) || 0,
        isOnPeak
      });

      // อัปเดตค่าสูงสุด
      if (demandW > groupedData[slaveId].maxDemand.watt) {
        groupedData[slaveId].maxDemand = {
          watt: demandW,
          var: demandVar,
          va: demandVA,
          timestamp: row.reading_timestamp
        };
      }

      // อัปเดตค่าต่ำสุด
      if (demandW < groupedData[slaveId].minDemand.watt && demandW > 0) {
        groupedData[slaveId].minDemand = {
          watt: demandW,
          var: demandVar,
          va: demandVA,
          timestamp: row.reading_timestamp
        };
      }

      // อัปเดต On Peak Demand (ค่าสูงสุดในช่วง 9:00-22:00)
      if (isOnPeak && demandW > groupedData[slaveId].onPeakDemand.watt) {
        groupedData[slaveId].onPeakDemand = {
          watt: demandW,
          var: demandVar,
          va: demandVA,
          timestamp: row.reading_timestamp
        };
      }

      // อัปเดต Off Peak Demand (ค่าสูงสุดในช่วง 22:00-9:00)
      if (!isOnPeak && demandW > groupedData[slaveId].offPeakDemand.watt) {
        groupedData[slaveId].offPeakDemand = {
          watt: demandW,
          var: demandVar,
          va: demandVA,
          timestamp: row.reading_timestamp
        };
      }
    });

    // แปลงเป็น array และคำนวณค่าเพิ่มเติม
    const demandLogData = Object.values(groupedData).map(meter => {
      // คำนวณค่าเฉลี่ย
      const avgDemandW = meter.logData.reduce((sum, log) => sum + log.demandW, 0) / meter.logData.length;
      const avgDemandVar = meter.logData.reduce((sum, log) => sum + log.demandVar, 0) / meter.logData.length;
      const avgDemandVA = meter.logData.reduce((sum, log) => sum + log.demandVA, 0) / meter.logData.length;

      // คำนวณค่า charge ตามสูตร
      const onPeakDmW = meter.onPeakDemand.watt * 0.2;
      const offPeakDmW = meter.offPeakDemand.watt * 0.8;
      const onPeakDemandCharge = onPeakDmW * 132.93;
      const offPeakDemandCharge = offPeakDmW * 132.93;
      const totalDemandCharge = onPeakDemandCharge + offPeakDemandCharge;

      return {
        meterName: meter.meterName,
        meterClass: meter.meterClass,
        slaveId: meter.slaveId,
        logData: meter.logData,
        maxDemand: meter.maxDemand,
        minDemand: meter.minDemand,
        onPeakDemand: meter.onPeakDemand,
        offPeakDemand: meter.offPeakDemand,
        avgDemand: {
          watt: Math.round(avgDemandW * 100) / 100,
          var: Math.round(avgDemandVar * 100) / 100,
          va: Math.round(avgDemandVA * 100) / 100
        },
        demandCharge: {
          onPeak: {
            dmW: Math.round(onPeakDmW * 100) / 100,
            charge: Math.round(onPeakDemandCharge * 100) / 100
          },
          offPeak: {
            dmW: Math.round(offPeakDmW * 100) / 100,
            charge: Math.round(offPeakDemandCharge * 100) / 100
          },
          total: Math.round(totalDemandCharge * 100) / 100
        }
      };
    });

    console.log('✅ Demand charge log data processed:', demandLogData.length, 'meters');

    res.json({
      success: true,
      data: demandLogData,
      message: 'Demand charge log data retrieved successfully'
    });

  } catch (error) {
    console.error('❌ Error fetching demand charge log data:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET /api/table-data/charge-realtime - ดึงข้อมูล charge แบบ realtime ทุก 1 นาที
router.get('/charge-realtime', async (req, res) => {
  try {
    const {
      dateFrom,
      dateTo,
      timeFrom = '00:00',
      timeTo = '23:59',
      slaveIds
    } = req.query;

    // ตรวจสอบ required parameters
    if (!dateFrom || !dateTo) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'dateFrom and dateTo are required'
      });
    }

    // สร้าง datetime strings
    const startDateTime = `${dateFrom} ${timeFrom}:00`;
    
    // แก้ไข: เพิ่ม 59 วินาทีให้ endDateTime เพื่อรวมข้อมูลในนาทีสุดท้าย
    const endTime = timeTo.split(':');
    const endHour = parseInt(endTime[0]);
    const endMinute = parseInt(endTime[1]);
    const endDateTime = `${dateTo} ${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}:59`;

    // แปลง slaveIds เป็น array ถ้ามี
    let slaveIdArray = [];
    if (slaveIds) {
      slaveIdArray = Array.isArray(slaveIds) ? slaveIds : [slaveIds];
    }

    console.log('🔧 === CHARGE REALTIME DATA PROCESSING ===');
    console.log('📅 Date Range:', `${startDateTime} to ${endDateTime}`);
    console.log('🔢 Slave IDs:', slaveIdArray);

    // สร้าง SQL query สำหรับดึงข้อมูล meter readings ทุก 1 นาที
    let query = `
      SELECT 
        pv.slave_id,
        m.name as meter_name,
        m.meter_class,
        pv.reading_timestamp,
        pv.param_31_power_demand as demand_w,
        pv.param_32_reactive_power_demand as demand_var,
        pv.param_33_apparent_power_demand as demand_va,
        pv.param_34_import_kwh as import_kwh,
        pv.param_35_export_kwh as export_kwh,
        pv.param_36_import_kvarh as import_kvarh,
        pv.param_37_export_kvarh as export_kvarh,
        pv.param_01_freqency as frequency,
        pv.param_05_voltage_avg_phase as voltage_ln,
        pv.param_09_voltage_avg_line as voltage_ll,
        pv.param_13_current_avg_phase as current_avg,
        pv.param_18_power_total_system as power_total,
        pv.param_22_reactive_power_total as reactive_power_total,
        pv.param_26_apparent_power_total as apparent_power_total,
        pv.param_30_power_factor_total as power_factor_total,
        pv.param_38_thdv as thdv,
        pv.param_39_thdi as thdi
      FROM parameters_value pv
      LEFT JOIN meters m ON pv.slave_id = m.slave_id
      WHERE pv.reading_timestamp >= $1 
      AND pv.reading_timestamp <= $2
      AND EXTRACT(MINUTE FROM pv.reading_timestamp) % 1 = 0
    `;

    const queryParams = [startDateTime, endDateTime];

    // เพิ่มเงื่อนไข slave_id ถ้ามี
    if (slaveIdArray.length > 0) {
      query += ` AND pv.slave_id = ANY($3)`;
      queryParams.push(slaveIdArray);
    }

    query += `
      ORDER BY pv.slave_id, pv.reading_timestamp
    `;

    console.log('🔍 Query:', query);
    console.log('🔢 Parameters:', queryParams);

    const result = await parametersPool.query(query, queryParams);

    // จัดกลุ่มข้อมูลตาม slave_id และ timestamp
    const groupedData = {};
    
    result.rows.forEach(row => {
      const slaveId = row.slave_id;
      const meterName = row.meter_name || `Meter-${slaveId}`;
      const meterClass = row.meter_class || '3.1';
      const timestamp = new Date(row.reading_timestamp);
      const hour = timestamp.getHours();
      const isOnPeak = hour >= 9 && hour <= 22;
      
      if (!groupedData[slaveId]) {
        groupedData[slaveId] = {
          meterName,
          meterClass,
          slaveId,
          realtimeData: [],
          summary: {
            maxDemand: { watt: 0, var: 0, va: 0, timestamp: null },
            minDemand: { watt: Infinity, var: Infinity, va: Infinity, timestamp: null },
            onPeakDemand: { watt: 0, var: 0, va: 0, timestamp: null },
            offPeakDemand: { watt: 0, var: 0, va: 0, timestamp: null },
            avgDemand: { watt: 0, var: 0, va: 0 },
            totalEnergy: { import: 0, export: 0, importVar: 0, exportVar: 0 }
          }
        };
      }

      const demandW = parseFloat(row.demand_w) || 0;
      const demandVar = parseFloat(row.demand_var) || 0;
      const demandVA = parseFloat(row.demand_va) || 0;

      // เพิ่มข้อมูล realtime
      groupedData[slaveId].realtimeData.push({
        timestamp: row.reading_timestamp,
        demandW,
        demandVar,
        demandVA,
        importKwh: parseFloat(row.import_kwh) || 0,
        exportKwh: parseFloat(row.export_kwh) || 0,
        importKvarh: parseFloat(row.import_kvarh) || 0,
        exportKvarh: parseFloat(row.export_kvarh) || 0,
        frequency: parseFloat(row.frequency) || 0,
        voltageLN: parseFloat(row.voltage_ln) || 0,
        voltageLL: parseFloat(row.voltage_ll) || 0,
        currentAvg: parseFloat(row.current_avg) || 0,
        powerTotal: parseFloat(row.power_total) || 0,
        reactivePowerTotal: parseFloat(row.reactive_power_total) || 0,
        apparentPowerTotal: parseFloat(row.apparent_power_total) || 0,
        powerFactorTotal: parseFloat(row.power_factor_total) || 0,
        thdv: parseFloat(row.thdv) || 0,
        thdi: parseFloat(row.thdi) || 0,
        isOnPeak
      });

      // อัปเดตค่าสูงสุด
      if (demandW > groupedData[slaveId].summary.maxDemand.watt) {
        groupedData[slaveId].summary.maxDemand = {
          watt: demandW,
          var: demandVar,
          va: demandVA,
          timestamp: row.reading_timestamp
        };
      }

      // อัปเดตค่าต่ำสุด
      if (demandW < groupedData[slaveId].summary.minDemand.watt && demandW > 0) {
        groupedData[slaveId].summary.minDemand = {
          watt: demandW,
          var: demandVar,
          va: demandVA,
          timestamp: row.reading_timestamp
        };
      }

      // อัปเดต On Peak Demand
      if (isOnPeak && demandW > groupedData[slaveId].summary.onPeakDemand.watt) {
        groupedData[slaveId].summary.onPeakDemand = {
          watt: demandW,
          var: demandVar,
          va: demandVA,
          timestamp: row.reading_timestamp
        };
      }

      // อัปเดต Off Peak Demand
      if (!isOnPeak && demandW > groupedData[slaveId].summary.offPeakDemand.watt) {
        groupedData[slaveId].summary.offPeakDemand = {
          watt: demandW,
          var: demandVar,
          va: demandVA,
          timestamp: row.reading_timestamp
        };
      }
    });

    // คำนวณค่าเฉลี่ยและสรุปข้อมูล
    const realtimeData = Object.values(groupedData).map(meter => {
      const realtimeCount = meter.realtimeData.length;
      
      // คำนวณค่าเฉลี่ย
      const avgDemandW = meter.realtimeData.reduce((sum, data) => sum + data.demandW, 0) / realtimeCount;
      const avgDemandVar = meter.realtimeData.reduce((sum, data) => sum + data.demandVar, 0) / realtimeCount;
      const avgDemandVA = meter.realtimeData.reduce((sum, data) => sum + data.demandVA, 0) / realtimeCount;

      // คำนวณพลังงานรวม
      const totalImportKwh = Math.max(...meter.realtimeData.map(d => d.importKwh)) - Math.min(...meter.realtimeData.map(d => d.importKwh));
      const totalExportKwh = Math.max(...meter.realtimeData.map(d => d.exportKwh)) - Math.min(...meter.realtimeData.map(d => d.exportKwh));
      const totalImportKvarh = Math.max(...meter.realtimeData.map(d => d.importKvarh)) - Math.min(...meter.realtimeData.map(d => d.importKvarh));
      const totalExportKvarh = Math.max(...meter.realtimeData.map(d => d.exportKvarh)) - Math.min(...meter.realtimeData.map(d => d.exportKvarh));

      // คำนวณค่า charge ตามสูตร
      const onPeakDmW = meter.summary.onPeakDemand.watt * 0.2;
      const offPeakDmW = meter.summary.offPeakDemand.watt * 0.8;
      const onPeakDemandCharge = onPeakDmW * 132.93;
      const offPeakDemandCharge = offPeakDmW * 132.93;
      const totalDemandCharge = onPeakDemandCharge + offPeakDemandCharge;

      // คำนวณ TOU charge
      const onPeakKwh = meter.realtimeData
        .filter(d => d.isOnPeak)
        .reduce((sum, d) => sum + (d.importKwh - (d.exportKwh || 0)), 0);
      const offPeakKwh = meter.realtimeData
        .filter(d => !d.isOnPeak)
        .reduce((sum, d) => sum + (d.importKwh - (d.exportKwh || 0)), 0);
      
      const onPeakWhCharge = onPeakKwh * 4.1839;
      const offPeakWhCharge = offPeakKwh * 2.6037;
      const totalWhCharge = onPeakWhCharge + offPeakWhCharge;

      // คำนวณ Power Factor Charge
      const avgPowerFactor = meter.realtimeData.reduce((sum, d) => sum + d.powerFactorTotal, 0) / realtimeCount;
      const powerFactorCharge = avgPowerFactor > 728 ? (avgPowerFactor - 728) * 56.07 : 0;

      // คำนวณ FT
      const ft = (meter.summary.maxDemand.watt + totalImportKwh) * -0.147;

      // คำนวณ Total
      const total = totalWhCharge + totalDemandCharge + powerFactorCharge;
      const vat = (total - ft) * 0.07;
      const grandTotal = vat + (total - ft);

      return {
        meterName: meter.meterName,
        meterClass: meter.meterClass,
        slaveId: meter.slaveId,
        realtimeData: meter.realtimeData,
        summary: {
          maxDemand: meter.summary.maxDemand,
          minDemand: meter.summary.minDemand,
          onPeakDemand: meter.summary.onPeakDemand,
          offPeakDemand: meter.summary.offPeakDemand,
          avgDemand: {
            watt: Math.round(avgDemandW * 100) / 100,
            var: Math.round(avgDemandVar * 100) / 100,
            va: Math.round(avgDemandVA * 100) / 100
          },
          totalEnergy: {
            import: Math.round(totalImportKwh * 100) / 100,
            export: Math.round(totalExportKwh * 100) / 100,
            importVar: Math.round(totalImportKvarh * 100) / 100,
            exportVar: Math.round(totalExportKvarh * 100) / 100
          }
        },
        charge: {
          onPeakWh: Math.round(onPeakKwh * 100) / 100,
          offPeakWh: Math.round(offPeakKwh * 100) / 100,
          onPeakWhCharge: Math.round(onPeakWhCharge * 100) / 100,
          offPeakWhCharge: Math.round(offPeakWhCharge * 100) / 100,
          totalWhCharge: Math.round(totalWhCharge * 100) / 100,
          onPeakDemandCharge: Math.round(onPeakDemandCharge * 100) / 100,
          offPeakDemandCharge: Math.round(offPeakDemandCharge * 100) / 100,
          totalDemandCharge: Math.round(totalDemandCharge * 100) / 100,
          powerFactorCharge: Math.round(powerFactorCharge * 100) / 100,
          ft: Math.round(ft * 100) / 100,
          total: Math.round(total * 100) / 100,
          vat: Math.round(vat * 100) / 100,
          grandTotal: Math.round(grandTotal * 100) / 100
        }
      };
    });

    console.log('✅ Charge realtime data processed:', realtimeData.length, 'meters');

    res.json({
      success: true,
      data: realtimeData,
      message: 'Charge realtime data retrieved successfully',
      interval: '1 minute',
      totalRecords: result.rows.length
    });

  } catch (error) {
    console.error('❌ Error fetching charge realtime data:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

module.exports = router;
