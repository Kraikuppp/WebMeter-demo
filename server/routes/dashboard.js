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
  // SSL configuration for Render PostgreSQL
  ssl: {
    rejectUnauthorized: false,
    require: true
  }
});

// Test connection
parametersPool.on('connect', () => {
  console.log('✅ Connected to parameters_db database for dashboard API');
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

// GET /api/dashboard - ดึงข้อมูลทั้งหมดสำหรับ dashboard
router.get('/', async (req, res) => {
  try {
    // ใช้เวลาปัจจุบันเสมอ ไม่ใช้ date parameter
    const currentDate = new Date();
    const date = currentDate.toISOString().split('T')[0];
    
    // รับ time range และ slave ID จาก query parameters (ถ้ามี)
    const fromTime = req.query.from || '00:00';
    const toTime = req.query.to || `${currentDate.getHours().toString().padStart(2, '0')}:${currentDate.getMinutes().toString().padStart(2, '0')}`;
    const slaveId = req.query.slaveId ? parseInt(req.query.slaveId) : null;
    
    console.log('📊 Dashboard API called for current time:', currentDate.toISOString());
    console.log('⏰ Time range requested:', fromTime, 'to', toTime);
    console.log('🔌 Slave ID requested:', slaveId || 'All meters');
    
    // สร้าง datetime strings จาก time range ที่เลือก
    const startDateTime = `${date} ${fromTime}:00`;
    const endDateTime = `${date} ${toTime}:00`;
    
         // ดึงข้อมูลทั้งหมด 39 columns สำหรับวันนั้น
     let query = `
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
       WHERE reading_timestamp >= $1 
       AND reading_timestamp <= $2
     `;
     
     let queryParams = [startDateTime, endDateTime];
     
     // เพิ่ม slave ID filter ถ้ามี
     if (slaveId) {
       query += ` AND slave_id = $${queryParams.length + 1}`;
       queryParams.push(slaveId);
     }
     
     query += ` ORDER BY reading_timestamp ASC`;
    
    console.log('🔍 Executing dashboard query for date:', date);
    console.log('⏰ Time range:', startDateTime, 'to', endDateTime);
    console.log('🔌 Slave ID filter:', slaveId || 'None (all meters)');
    
    // Execute query
    const result = await parametersPool.query(query, queryParams);
    
    console.log('✅ Dashboard query executed successfully');
    console.log('📈 Number of rows returned:', result.rows.length);
    
    // Log sample data to debug
    if (result.rows.length > 0) {
      console.log('📅 First row timestamp:', result.rows[0].reading_timestamp);
      console.log('📅 Last row timestamp:', result.rows[result.rows.length - 1].reading_timestamp);
      console.log('📊 Sample demand data:', {
        hour: new Date(result.rows[0].reading_timestamp).getHours(),
        minute: new Date(result.rows[0].reading_timestamp).getMinutes(),
        demand: result.rows[0].param_31_power_demand
      });
    }
    
         if (result.rows.length === 0) {
       return res.json({
         success: true,
         data: {
           currentValues: {
             watt: 0,
             var: 0,
             va: 0,
             powerFactor: 0,
             voltLN: 0,
             voltLL: 0,
             currentAvg: 0,
             frequency: 0,
             voltAN: 0,
             voltBN: 0,
             voltCN: 0,
             voltAB: 0,
             voltBC: 0,
             voltCA: 0,
             currentA: 0,
             currentB: 0,
             currentC: 0,
             currentN: 0,
             wattA: 0,
             wattB: 0,
             wattC: 0,
             varA: 0,
             varB: 0,
             varC: 0,
             vaA: 0,
             vaB: 0,
             vaC: 0,
             pfA: 0,
             pfB: 0,
             pfC: 0,
             thdv: 0,
             thdi: 0
           },
           energyData: {
             importKwh: 0,
             exportKwh: 0,
             importKvarh: 0,
             exportKvarh: 0
           },
           demandData: [],
                  touData: Array.from({ length: 25 }, (_, hour) => ({
         hour,
         demandW: 0,
         demandVar: 0,
         demandVA: 0,
         importKwh: 0,
         exportKwh: 0,
         importKvarh: 0,
         exportKvarh: 0
       })),
           chartData: {
             watt: [0, 0, 0, 0, 0, 0],
             var: [0, 0, 0, 0, 0, 0],
             va: [0, 0, 0, 0, 0, 0],
             powerFactor: [0, 0, 0, 0, 0, 0]
           },
           yesterdayData: {
             watt: 0,
             var: 0,
             va: 0,
             powerFactor: 0
           }
         },
         message: 'No data available'
       });
     }
    
    // ประมวลผลข้อมูล
    const processedData = processDashboardData(result.rows, date, fromTime, toTime);
    
    res.json({
      success: true,
      data: processedData
    });
    
  } catch (error) {
    console.error('❌ Dashboard API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ฟังก์ชันประมวลผลข้อมูลสำหรับ dashboard
function processDashboardData(rows, date, fromTime, toTime) {
  try {
         // ข้อมูลล่าสุด (current values) - ใช้ข้อมูลจาก 39 columns
     const latestRow = rows[rows.length - 1];
     const currentValues = {
       watt: Number(latestRow.param_18_power_total_system) || 0,
       var: Number(latestRow.param_22_reactive_power_total) || 0,
       va: Number(latestRow.param_26_apparent_power_total) || 0,
       powerFactor: Number(latestRow.param_30_power_factor_total) || 0,
       voltLN: Number(latestRow.param_05_voltage_avg_phase) || 0,
       voltLL: Number(latestRow.param_09_voltage_avg_line) || 0,
       currentAvg: Number(latestRow.param_13_current_avg_phase) || 0,
       frequency: Number(latestRow.param_01_freqency) || 0,
       // เพิ่มข้อมูลเพิ่มเติมจาก 39 columns
       voltAN: Number(latestRow.param_02_voltage_phase_1) || 0,
       voltBN: Number(latestRow.param_03_voltage_phase_2) || 0,
       voltCN: Number(latestRow.param_04_voltage_phase_3) || 0,
       voltAB: Number(latestRow.param_06_voltage_line_1_2) || 0,
       voltBC: Number(latestRow.param_07_voltage_line_2_3) || 0,
       voltCA: Number(latestRow.param_08_voltage_line_3_1) || 0,
       currentA: Number(latestRow.param_10_current_phase_a) || 0,
       currentB: Number(latestRow.param_11_current_phase_b) || 0,
       currentC: Number(latestRow.param_12_current_phase_c) || 0,
       currentN: Number(latestRow.param_14_current_neutral) || 0,
       wattA: Number(latestRow.param_15_power_phase_a) || 0,
       wattB: Number(latestRow.param_16_power_phase_b) || 0,
       wattC: Number(latestRow.param_17_power_phase_c) || 0,
       varA: Number(latestRow.param_19_reactive_power_phase_a) || 0,
       varB: Number(latestRow.param_20_reactive_power_phase_b) || 0,
       varC: Number(latestRow.param_21_reactive_power_phase_c) || 0,
       vaA: Number(latestRow.param_23_apparent_power_phase_a) || 0,
       vaB: Number(latestRow.param_24_apparent_power_phase_b) || 0,
       vaC: Number(latestRow.param_25_apparent_power_phase_c) || 0,
       pfA: Number(latestRow.param_27_power_factor_phase_a) || 0,
       pfB: Number(latestRow.param_28_power_factor_phase_b) || 0,
       pfC: Number(latestRow.param_29_power_factor_phase_c) || 0,
       thdv: Number(latestRow.param_38_thdv) || 0,
       thdi: Number(latestRow.param_39_thdi) || 0
     };
     
     // ข้อมูลพลังงาน (energy data)
     const energyData = {
       importKwh: Number(latestRow.param_34_import_kwh) || 0,
       exportKwh: Number(latestRow.param_35_export_kwh) || 0,
       importKvarh: Number(latestRow.param_36_import_kvarh) || 0,
       exportKvarh: Number(latestRow.param_37_export_kvarh) || 0
     };
    
         // สร้างข้อมูล Demand แบบต่อเนื่องตาม time range ที่เลือก (ความถี่ 1 นาที)
     const [fromHour, fromMinute] = fromTime.split(':').map(Number);
     const [toHour, toMinute] = toTime.split(':').map(Number);
     
     // สร้างข้อมูล Demand จาก time range ที่เลือก (ความถี่ 1 นาที)
     const demandData = [];
     
     // สร้างข้อมูลสำหรับทุกนาทีจาก fromTime ถึง toTime
     const fromTotalMinutes = fromHour * 60 + fromMinute;
     const toTotalMinutes = toHour * 60 + toMinute;
     console.log(`🕐 Time range: ${fromTime} to ${toTime}, Minutes: ${fromTotalMinutes} to ${toTotalMinutes}`);
     
     for (let minute = fromTotalMinutes; minute <= toTotalMinutes; minute++) {
       const hour = Math.floor(minute / 60);
       const minuteOfHour = minute % 60;
       
       // หาข้อมูลที่ตรงกับเวลานี้
       const timeData = rows.filter(row => {
         const timestamp = new Date(row.reading_timestamp);
         return timestamp.getHours() === hour && timestamp.getMinutes() === minuteOfHour;
       });
       
       if (timeData.length > 0) {
         const latest = timeData[timeData.length - 1];
         demandData.push({
           hour: hour + (minuteOfHour / 60), // แสดงเป็นทศนิยม เช่น 14.5 = 14:30
           watt: Number(latest.param_31_power_demand) || 0,
           var: Number(latest.param_32_reactive_power_demand) || 0,
           va: Number(latest.param_33_apparent_power_demand) || 0
         });
       } else {
         // ถ้าไม่มีข้อมูลสำหรับนาทีนี้ ให้ใช้ข้อมูลล่าสุดที่มี
         const previousData = demandData.length > 0 ? demandData[demandData.length - 1] : { watt: 0, var: 0, va: 0 };
         demandData.push({
           hour: hour + (minuteOfHour / 60),
           watt: previousData.watt,
           var: previousData.var,
           va: previousData.va
         });
       }
     }
     
     console.log(`📊 Demand data points created: ${demandData.length}, Last hour: ${demandData[demandData.length - 1]?.hour}`);
     
     // เพิ่มข้อมูลสำหรับชั่วโมงที่เหลือ (จนถึง 24) เพื่อให้กราฟแสดงเต็มแกน X
     for (let hour = toHour + 1; hour <= 24; hour++) {
       demandData.push({
         hour: hour,
         watt: 0,
         var: 0,
         va: 0
       });
     }
    
    // สร้างข้อมูล TOU 24 ชั่วโมง (7 ค่า)
    const touData = Array.from({ length: 25 }, (_, hour) => {
      const hourData = rows.filter(row => {
        const timestamp = new Date(row.reading_timestamp);
        return timestamp.getHours() === hour;
      });
      
      if (hourData.length > 0) {
        const latest = hourData[hourData.length - 1];
        const demandW = Number(latest.param_31_power_demand) || 0;
        const demandVar = Number(latest.param_32_reactive_power_demand) || 0;
        const demandVA = Math.sqrt(Math.pow(demandW, 2) + Math.pow(demandVar, 2)); // สูตรคำนวณ SQR2(Demand W^2 + Demand Var^2)
        
        return {
          hour,
          demandW: demandW,
          demandVar: demandVar,
          demandVA: demandVA,
          importKwh: Number(latest.param_34_import_kwh) || 0,
          exportKwh: Number(latest.param_35_export_kwh) || 0,
          importKvarh: Number(latest.param_36_import_kvarh) || 0,
          exportKvarh: Number(latest.param_37_export_kvarh) || 0
        };
      } else {
        return {
          hour,
          demandW: 0,
          demandVar: 0,
          demandVA: 0,
          importKwh: 0,
          exportKwh: 0,
          importKvarh: 0,
          exportKvarh: 0
        };
      }
    });
    
    // Debug log สำหรับ TOU data
    console.log(`📊 TOU data created: ${touData.length} hours`);
    if (touData.length > 0) {
      console.log('📊 Sample TOU data (hour 0):', touData[0]);
      console.log('📊 Sample TOU data (hour 12):', touData[12]);
    }
    
         // สร้างข้อมูล Chart (sparkline) - ใช้ข้อมูล 6 จุดล่าสุด
     const recentRows = rows.slice(-6);
     const chartData = {
       watt: recentRows.map(row => Number(row.param_18_power_total_system) || 0),
       var: recentRows.map(row => Number(row.param_22_reactive_power_total) || 0),
       va: recentRows.map(row => Number(row.param_26_apparent_power_total) || 0),
       powerFactor: recentRows.map(row => Number(row.param_30_power_factor_total) || 0)
     };
     
     // ข้อมูลเมื่อวาน (fallback)
     const yesterdayData = {
       watt: 0,
       var: 0,
       va: 0,
       powerFactor: 0
     };
    
    return {
      currentValues,
      energyData,
      demandData,
      touData,
      chartData,
      yesterdayData
    };
    
  } catch (error) {
    console.error('❌ Error processing dashboard data:', error);
         // Return empty data
     return {
       currentValues: {
         watt: 0,
         var: 0,
         va: 0,
         powerFactor: 0,
         voltLN: 0,
         voltLL: 0,
         currentAvg: 0,
         frequency: 0,
         voltAN: 0,
         voltBN: 0,
         voltCN: 0,
         voltAB: 0,
         voltBC: 0,
         voltCA: 0,
         currentA: 0,
         currentB: 0,
         currentC: 0,
         currentN: 0,
         wattA: 0,
         wattB: 0,
         wattC: 0,
         varA: 0,
         varB: 0,
         varC: 0,
         vaA: 0,
         vaB: 0,
         vaC: 0,
         pfA: 0,
         pfB: 0,
         pfC: 0,
         thdv: 0,
         thdi: 0
       },
       energyData: {
         importKwh: 0,
         exportKwh: 0,
         importKvarh: 0,
         exportKvarh: 0
       },
       demandData: (() => {
         // สร้าง demandData ตาม time range แม้ไม่มีข้อมูล
         const [fromHour, fromMinute] = fromTime.split(':').map(Number);
         const [toHour, toMinute] = toTime.split(':').map(Number);
         const fromTotalMinutes = fromHour * 60 + fromMinute;
         const toTotalMinutes = toHour * 60 + toMinute;
         
         const demandData = [];
         for (let minute = fromTotalMinutes; minute <= toTotalMinutes; minute++) {
           const hour = Math.floor(minute / 60);
           const minuteOfHour = minute % 60;
           demandData.push({
             hour: hour + (minuteOfHour / 60),
             watt: 0,
             var: 0,
             va: 0
           });
         }
         
         // เพิ่มข้อมูลสำหรับชั่วโมงที่เหลือ
         for (let hour = toHour + 1; hour <= 24; hour++) {
           demandData.push({
             hour: hour,
             watt: 0,
             var: 0,
             va: 0
           });
         }
         
         return demandData;
       })(),
       touData: Array.from({ length: 25 }, (_, hour) => ({
         hour,
         demandW: 0,
         demandVar: 0,
         demandVA: 0,
         importKwh: 0,
         exportKwh: 0,
         importKvarh: 0,
         exportKvarh: 0
       })),
       chartData: {
         watt: [0, 0, 0, 0, 0, 0],
         var: [0, 0, 0, 0, 0, 0],
         va: [0, 0, 0, 0, 0, 0],
         powerFactor: [0, 0, 0, 0, 0, 0]
       },
       yesterdayData: {
         watt: 0,
         var: 0,
         va: 0,
         powerFactor: 0
       }
     };
  }
}

module.exports = router;
