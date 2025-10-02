const cron = require('node-cron');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');

// Database connections
const parametersPool = new Pool({
  host: '49.0.87.9',
  port: 5432,
  database: 'parameters_db',
  user: 'postgres',
  password: 'orangepi123',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Main database connection for users (same as manual export)
const mainDb = new Pool({
  host: process.env.DB_HOST || '49.0.87.9',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'webmeter_db',
  user: process.env.DB_USER || 'webmeter_app',
  password: process.env.DB_PASSWORD || 'WebMeter2024!',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Create required tables if not exist
const createTablesQuery = `
  -- Email list table
  CREATE TABLE IF NOT EXISTS email_list (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    groups TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Line list table  
  CREATE TABLE IF NOT EXISTS line_list (
    id SERIAL PRIMARY KEY,
    line_messaging_id VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255),
    line_groups TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

// Initialize tables
parametersPool.query(createTablesQuery).then(() => {
  console.log('✅ Tables created successfully');
  
  // Insert sample email data if table is empty
  parametersPool.query('SELECT COUNT(*) as count FROM email_list')
    .then(result => {
      const count = parseInt(result.rows[0].count);
      console.log(`📧 Current emails in email_list table: ${count}`);
      
      if (count === 0) {
        console.log('📧 Inserting sample email data...');
        const insertEmailsQuery = `
          INSERT INTO email_list (id, email, name) VALUES 
          (22, 'sup06.amptronth@gmail.com', 'Jakkrit'),
          (1, 'test@example.com', 'Test User'),
          (2, 'admin@webmeter.com', 'Admin User')
          ON CONFLICT (id) DO UPDATE SET 
            email = EXCLUDED.email,
            name = EXCLUDED.name;
        `;
        
        return parametersPool.query(insertEmailsQuery);
      }
    })
    .then(() => {
      console.log('✅ Email list initialized successfully');
      
      // Also initialize LINE list if empty
      return parametersPool.query('SELECT COUNT(*) as count FROM line_list');
    })
    .then(result => {
      const count = parseInt(result.rows[0].count);
      console.log(`📱 Current LINE users in line_list table: ${count}`);
      
      if (count === 0) {
        console.log('📱 Inserting sample LINE user data...');
        const insertLineUsersQuery = `
          INSERT INTO line_list (id, line_messaging_id, display_name) VALUES 
          (1, 'U1234567890abcdef1234567890abcdef', 'Test LINE User 1'),
          (2, 'U2345678901bcdef12345678901bcdef1', 'Test LINE User 2'),
          (3, 'U3456789012cdef123456789012cdef12', 'Jakkrit LINE')
          ON CONFLICT (id) DO UPDATE SET 
            line_messaging_id = EXCLUDED.line_messaging_id,
            display_name = EXCLUDED.display_name;
        `;
        
        return parametersPool.query(insertLineUsersQuery);
      }
    })
    .then(() => {
      console.log('✅ LINE list initialized successfully');
    })
    .catch(error => {
      console.error('❌ Error initializing LINE list:', error);
    });
}).catch(console.error);

// Email transporter configuration (same as manual export)
const createEmailTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD // Use EMAIL_APP_PASSWORD like manual export
    }
  });
};

const emailTransporter = createEmailTransporter();

class ExportScheduler {
  constructor() {
    this.isRunning = false;
    this.scheduledTasks = new Map();
  }

  // Start the scheduler
  start() {
    if (this.isRunning) {
      console.log('📅 Export scheduler is already running');
      return;
    }

    console.log('🚀 Starting Export Scheduler...');
    
    // Check for due schedules every minute
    this.scheduledTasks.set('main', cron.schedule('* * * * *', async () => {
      await this.checkAndRunDueSchedules();
    }, {
      scheduled: true,
      timezone: 'Asia/Bangkok'
    }));

    this.isRunning = true;
    console.log('✅ Export Scheduler started successfully');
  }

  // Stop the scheduler
  stop() {
    if (!this.isRunning) {
      console.log('📅 Export scheduler is not running');
      return;
    }

    console.log('🛑 Stopping Export Scheduler...');
    
    // Stop all scheduled tasks
    this.scheduledTasks.forEach((task, name) => {
      task.destroy();
      console.log(`📅 Stopped task: ${name}`);
    });
    
    this.scheduledTasks.clear();
    this.isRunning = false;
    console.log('✅ Export Scheduler stopped successfully');
  }

  // Check for due schedules and run them
  async checkAndRunDueSchedules() {
    try {
      // Get all due schedules
      const result = await parametersPool.query(`
        SELECT * FROM export_schedules 
        WHERE enabled = true 
        AND next_run <= NOW()
        ORDER BY next_run ASC
      `);

      if (result.rows.length > 0) {
        console.log(`⏰ Found ${result.rows.length} due export schedules`);
        
        for (const schedule of result.rows) {
          await this.runExportSchedule(schedule);
        }
      }
    } catch (error) {
      console.error('❌ Error checking due schedules:', error);
    }
  }

  // Run a specific export schedule
  async runExportSchedule(schedule) {
    try {
      console.log(`🏃 Running export schedule ${schedule.id}: ${schedule.export_type} - ${schedule.export_format}`);
      
      // Fetch meter data
      const meterData = await this.fetchMeterData(schedule);
      
      // Check if we have data before proceeding
      if (!meterData.data || meterData.data.length === 0) {
        console.log(`❌ No data available for export schedule ${schedule.id}`);
        console.log(`📅 Requested: ${schedule.date_from} ${schedule.time_from} - ${schedule.date_to} ${schedule.time_to}`);
        
        // Send notification about no data instead of empty export
        if (schedule.export_format === 'line') {
          await this.sendNoDataLineNotification(schedule);
        }
        
        // Mark as run but with warning
        await this.markScheduleAsRun(schedule.id);
        console.log(`⚠️ Schedule ${schedule.id} marked as run with no data warning`);
        return;
      }
      
      // Generate export based on format
      let exportResult;
      switch (schedule.export_format) {
        case 'email':
          exportResult = await this.sendEmailExport(schedule, meterData.data, meterData);
          break;
        case 'line':
          // ✅ แก้ไข: ใช้ค่าจาก schedule โดยตรงแทน meterData เพื่อให้ได้เวลาที่ผู้ใช้เลือกจริง
          // ✅ แก้ไข: จัดการทั้ง Date object และ string สำหรับ dateTimeInfo
          const dateFromForInfo = schedule.date_from instanceof Date ? schedule.date_from.toISOString() : schedule.date_from;
          const dateToForInfo = schedule.date_to instanceof Date ? schedule.date_to.toISOString() : schedule.date_to;
          
          const dateTimeInfo = {
            dateFromStr: dateFromForInfo && typeof dateFromForInfo === 'string' ? dateFromForInfo.split('T')[0] : null,
            dateToStr: dateToForInfo && typeof dateToForInfo === 'string' ? dateToForInfo.split('T')[0] : null,
            timeFromStr: schedule.time_from || '00:00',
            timeToStr: schedule.time_to || '23:59'
          };
          console.log(`📱 === SENDING USER SELECTED DATETIME TO LINE ===`);
          console.log(`📱 schedule.date_from: ${schedule.date_from}`);
          console.log(`📱 schedule.date_to: ${schedule.date_to}`);
          console.log(`📱 schedule.time_from: ${schedule.time_from}`);
          console.log(`📱 schedule.time_to: ${schedule.time_to}`);
          console.log(`📱 dateTimeInfo.dateFromStr: ${dateTimeInfo.dateFromStr}`);
          console.log(`📱 dateTimeInfo.dateToStr: ${dateTimeInfo.dateToStr}`);
          console.log(`📱 dateTimeInfo.timeFromStr: ${dateTimeInfo.timeFromStr}`);
          console.log(`📱 dateTimeInfo.timeToStr: ${dateTimeInfo.timeToStr}`);
          console.log(`📱 Expected: This should match user selection from UI`);
          console.log(`================================`);
          exportResult = await this.sendLineExport(schedule, meterData.data, dateTimeInfo);
          break;
        case 'excel':
          exportResult = await this.generateExcelExport(schedule, meterData.data, meterData);
          break;
        case 'pdf':
          exportResult = await this.generatePdfExport(schedule, meterData.data, meterData);
          break;
        default:
          throw new Error(`Unsupported export format: ${schedule.export_format}`);
      }

      // Mark schedule as run and calculate next run time
      await this.markScheduleAsRun(schedule.id, true, null);
      
      console.log(`✅ Export schedule ${schedule.id} completed successfully`);
      
    } catch (error) {
      console.error(`❌ Error running export schedule ${schedule.id}:`, error);
      
      // Mark schedule as run with error
    }
  }
  // Fetch meter data for the schedule
  async fetchMeterData(schedule) {
    try {
      console.log(`📊 Processing schedule ${schedule.id}: ${schedule.export_type} export`);
    console.log(`📊 === SCHEDULE FROM DATABASE DEBUG ===`);
    console.log(`📊 Schedule details:`, {
      frequency: schedule.frequency,
      export_type: schedule.export_type,
      export_format: schedule.export_format,
      meters: schedule.meters,
      parameters: schedule.parameters,
      read_time: schedule.read_time
    });
    console.log(`📅 Date/Time fields from database:`, {
      date_from: schedule.date_from,
      date_to: schedule.date_to,
      time_from: schedule.time_from,
      time_to: schedule.time_to
    });
    console.log(`======================================`);
    console.log(`🔍 === METER SELECTION DEBUG ===`);
      console.log(`📊 Selected meters from schedule:`, schedule.meters);
      if (Array.isArray(schedule.meters)) {
        schedule.meters.forEach((meter, index) => {
          console.log(`📊 Meter ${index + 1}: ${meter} (type: ${typeof meter})`);
        });
      }
      console.log(`================================`);
      
      // Use the same logic as manual export - use user selected date/time if available
      const now = new Date();
      let dateFrom, dateTo, timeFromStr, timeToStr;
      
      // Check if schedule has custom date/time from user selection
      if (schedule.date_from && schedule.date_to && schedule.time_from && schedule.time_to) {
        // ✅ แก้ไข: จัดการทั้ง Date object และ string
        // แปลงเป็น ISO string ก่อนแล้วดึงส่วนวันที่
        const dateFromISO = schedule.date_from instanceof Date ? schedule.date_from.toISOString() : schedule.date_from;
        const dateToISO = schedule.date_to instanceof Date ? schedule.date_to.toISOString() : schedule.date_to;
        
        console.log(`📅 === DATE CONVERSION DEBUG ===`);
        console.log(`📅 Original schedule.date_from:`, schedule.date_from, `(type: ${typeof schedule.date_from})`);
        console.log(`📅 Original schedule.date_to:`, schedule.date_to, `(type: ${typeof schedule.date_to})`);
        console.log(`📅 Converted dateFromISO:`, dateFromISO);
        console.log(`📅 Converted dateToISO:`, dateToISO);
        
        // ✅ ดึงเฉพาะส่วนวันที่จาก ISO string (YYYY-MM-DD)
        const dateFromStr_temp = dateFromISO && typeof dateFromISO === 'string' ? dateFromISO.split('T')[0] : null;
        const dateToStr_temp = dateToISO && typeof dateToISO === 'string' ? dateToISO.split('T')[0] : null;
        
        // ✅ สร้าง Date object จาก date string และเวลาที่ผู้ใช้เลือก (เฉพาะเมื่อมีข้อมูลครบ)
        if (dateFromStr_temp && dateToStr_temp && schedule.time_from && schedule.time_to) {
          dateFrom = new Date(dateFromStr_temp + 'T' + schedule.time_from + ':00'); // ใช้เวลาที่ผู้ใช้เลือก
          dateTo = new Date(dateToStr_temp + 'T' + schedule.time_to + ':00');       // ใช้เวลาที่ผู้ใช้เลือก
        } else {
          console.log(`❌ Invalid date/time data in schedule:`, {
            dateFromStr_temp,
            dateToStr_temp,
            time_from: schedule.time_from,
            time_to: schedule.time_to
          });
          // Fallback to current date/time
          dateFrom = new Date();
          dateFrom.setHours(0, 0, 0, 0);
          dateTo = new Date();
          timeFromStr = '00:00';
          timeToStr = '23:59';
        }
        
        // ✅ ใช้เวลาที่ผู้ใช้เลือกโดยตรง
        timeFromStr = schedule.time_from;
        timeToStr = schedule.time_to;
        
        console.log(`📅 === USER INPUT ANALYSIS ===`);
        console.log(`📅 Raw schedule.date_from: ${schedule.date_from}`);
        console.log(`📅 Raw schedule.date_to: ${schedule.date_to}`);
        console.log(`📅 Raw schedule.time_from: ${schedule.time_from}`);
        console.log(`📅 Raw schedule.time_to: ${schedule.time_to}`);
        console.log(`📅 === FIXED DATE OBJECT CREATION ===`);
        console.log(`📅 dateFrom object: ${dateFrom.toString()}`);
        console.log(`📅 dateTo object: ${dateTo.toString()}`);
        console.log(`📅 Expected time range: ${schedule.time_from} - ${schedule.time_to}`);
        console.log(`📅 Actual time range: ${timeFromStr} - ${timeToStr}`);
        
        console.log(`📅 === NEW DIRECT STRING EXTRACTION ===`);
        console.log(`📅 Original ISO dateFrom: ${dateFromISO}`);
        console.log(`📅 Original ISO dateTo: ${dateToISO}`);
        console.log(`📅 Extracted dateFromStr_temp: ${dateFromStr_temp}`);
        console.log(`📅 Extracted dateToStr_temp: ${dateToStr_temp}`);
        console.log(`📅 Final dateFrom object: ${dateFrom.toString()}`);
        console.log(`📅 Final dateTo object: ${dateTo.toString()}`);
        console.log(`📅 === EXPECTED vs ACTUAL ===`);
        console.log(`📅 Expected date: 2025-09-29`);
        console.log(`📅 Actual dateFromStr_temp: ${dateFromStr_temp}`);
        console.log(`📅 Actual dateToStr_temp: ${dateToStr_temp}`);
        console.log(`📅 Date extraction correct: ${dateFromStr_temp === '2025-09-29' && dateToStr_temp === '2025-09-29' ? '✅ YES' : '❌ NO'}`);
        console.log(`================================`);
      } else {
        // Fallback: use current date with time from start of day to now
        dateFrom = new Date(now);
        dateFrom.setHours(0, 0, 0, 0); // Start of today
        dateTo = new Date(now);
        dateTo.setHours(0, 0, 0, 0); // Same day
        timeFromStr = '00:00';
        timeToStr = now.toTimeString().slice(0, 5); // Current time
        console.log(`📅 Using current date/time (fallback): ${dateFrom.toISOString().split('T')[0]} ${timeFromStr} - ${dateTo.toISOString().split('T')[0]} ${timeToStr}`);
      }
      
      // Format dates for API - use extracted date strings directly if available
      let dateFromStr, dateToStr;
      if (schedule.date_from && schedule.date_to) {
        // ✅ แก้ไข: จัดการทั้ง Date object และ string (เหมือนที่แก้ไขข้างบน)
        const dateFromForAPI = schedule.date_from instanceof Date ? schedule.date_from.toISOString() : schedule.date_from;
        const dateToForAPI = schedule.date_to instanceof Date ? schedule.date_to.toISOString() : schedule.date_to;
        
        dateFromStr = dateFromForAPI && typeof dateFromForAPI === 'string' ? dateFromForAPI.split('T')[0] : null;
        dateToStr = dateToForAPI && typeof dateToForAPI === 'string' ? dateToForAPI.split('T')[0] : null;
        
        // ✅ ไม่ต้อง override timeFromStr และ timeToStr เพราะได้ set ไว้แล้วที่บรรทัด 310-311
        // timeFromStr และ timeToStr ได้ถูก set แล้วจาก schedule.time_from และ schedule.time_to
        
        console.log(`📅 === USING SCHEDULE DATE/TIME DIRECTLY ===`);
        console.log(`📅 schedule.date_from: ${schedule.date_from}`);
        console.log(`📅 schedule.date_to: ${schedule.date_to}`);
        console.log(`📅 schedule.time_from: ${schedule.time_from}`);
        console.log(`📅 schedule.time_to: ${schedule.time_to}`);
        console.log(`📅 Final dateFromStr: ${dateFromStr}`);
        console.log(`📅 Final dateToStr: ${dateToStr}`);
        console.log(`📅 Final timeFromStr: ${timeFromStr}`);
        console.log(`📅 Final timeToStr: ${timeToStr}`);
        console.log(`================================`);
      } else {
        // Fallback: format from Date object
        dateFromStr = dateFrom.getFullYear() + '-' + 
          String(dateFrom.getMonth() + 1).padStart(2, '0') + '-' + 
          String(dateFrom.getDate()).padStart(2, '0');
        dateToStr = dateTo.getFullYear() + '-' + 
          String(dateTo.getMonth() + 1).padStart(2, '0') + '-' + 
          String(dateTo.getDate()).padStart(2, '0');
      }
      
      console.log(`📅 === DATE CONVERSION DEBUG ===`);
      console.log(`📅 Original dateFrom: ${dateFrom.toString()}`);
      console.log(`📅 Original dateTo: ${dateTo.toString()}`);
      console.log(`📅 UTC dateFrom: ${dateFrom.toISOString()}`);
      console.log(`📅 UTC dateTo: ${dateTo.toISOString()}`);
      console.log(`📅 Local dateFromStr: ${dateFromStr}`);
      console.log(`📅 Local dateToStr: ${dateToStr}`);
      
      console.log(`📅 === FINAL QUERY PARAMETERS ===`);
      console.log(`📅 Will query database for: ${dateFromStr} ${timeFromStr} - ${dateToStr} ${timeToStr}`);
      console.log(`📅 Expected user selection: 29 Sep 2025 00:00 - 29 Sep 2025 13:25`);
      console.log(`📅 === PARAMETER VERIFICATION ===`);
      console.log(`📅 Date range: ${dateFromStr} to ${dateToStr}`);
      console.log(`📅 Time range: ${timeFromStr} to ${timeToStr}`);
      console.log(`📅 Date correct: ${dateFromStr === '2025-09-29' && dateToStr === '2025-09-29' ? '✅ YES' : '❌ NO'}`);
      console.log(`📅 Time correct: ${timeFromStr === '00:00' && timeToStr === '13:25' ? '✅ YES' : '❌ NO'}`);
      console.log(`📅 Overall: ${dateFromStr === '2025-09-29' && dateToStr === '2025-09-29' && timeFromStr === '00:00' && timeToStr === '13:25' ? '🎯 PERFECT MATCH' : '❌ MISMATCH'}`);
      console.log(`📅 This should return data from 29 Sep 2025 00:00 to 13:25 (NOT 28 Sep)`);
      console.log(`================================`);
      
      console.log(`📅 Final API parameters: ${dateFromStr} ${timeFromStr} - ${dateToStr} ${timeToStr}`);
      
      console.log(`📊 === FINAL EXPORT PARAMETERS ===`);
      console.log(`📅 Date: ${dateFromStr} to ${dateToStr}`);
      console.log(`⏰ Time: ${timeFromStr} to ${timeToStr}`);
      console.log(`================================`);
      
      // Parse meters and parameters from JSON strings (stored in database as JSON)
      let slaveIds = [1]; // Default - use slave ID 1 as requested
      let columns = ['Demand W', 'Import kWh']; // Default - use simple columns to avoid mapping issues
      
      try {
        // Parse meters from JSON string
        if (schedule.meters) {
          console.log(`🔍 Raw meters data:`, schedule.meters, typeof schedule.meters);
          const parsedMeters = typeof schedule.meters === 'string' ? 
            JSON.parse(schedule.meters) : schedule.meters;
          console.log(`🔍 Parsed meters:`, parsedMeters);
          
          if (Array.isArray(parsedMeters) && parsedMeters.length > 0) {
            // Convert meter IDs to actual slave_ids by looking up in meterList
            // Need to get meterList first to map meter.id to meter.slave_id
            console.log(`🔍 Need to convert meter IDs to slave_ids...`);
            console.log(`🔍 Parsed meters from schedule:`, parsedMeters);
            
            // For now, use the meter IDs as-is and let the lookup happen in the API call
            // The actual conversion should happen where we have access to meterList
            slaveIds = parsedMeters.map(meter => {
              console.log(`🔍 Processing meter:`, meter, typeof meter);
              if (typeof meter === 'string' && meter.startsWith('meter-')) {
                // Don't convert to number yet - keep as meter ID for lookup
                console.log(`🔍 Keeping ${meter} as meter ID for slave_id lookup`);
                return meter;
              }
              // If it's already a number, use it as is
              if (typeof meter === 'number') {
                return meter;
              }
              // If it's a string number, convert it
              const numericMeter = parseInt(meter);
              return isNaN(numericMeter) ? meter : numericMeter;
            });
            console.log(`🔍 Final slaveIds:`, slaveIds);
            
            // Show initial meter ID mapping (before conversion)
            console.log(`🎯 === INITIAL METER ID MAPPING ===`);
            slaveIds.forEach((meterId, index) => {
              console.log(`🎯 Meter ${index + 1}: ${meterId} (type: ${typeof meterId}) - needs slave_id lookup`);
            });
            console.log(`🎯 Total meters selected: ${slaveIds.length}`);
            console.log(`================================`);
          }
        }
        
        // Parse parameters from JSON string and map to UI column names
        if (schedule.parameters) {
          console.log(`🔍 Raw parameters data:`, schedule.parameters, typeof schedule.parameters);
          const parsedParameters = typeof schedule.parameters === 'string' ? 
            JSON.parse(schedule.parameters) : schedule.parameters;
          console.log(`🔍 Parsed parameters:`, parsedParameters);
          
          if (Array.isArray(parsedParameters) && parsedParameters.length > 0) {
            // Map database field names to UI column names (same as Manual Export)
            const columnMapping = {
              'frequency': 'Frequency',
              'volt_an': 'Volt AN',
              'volt_bn': 'Volt BN', 
              'volt_cn': 'Volt CN',
              'volt_ln_avg': 'Volt LN Avg',
              'volt_ab': 'Volt AB',
              'volt_bc': 'Volt BC',
              'volt_ca': 'Volt CA',
              'volt_ll_avg': 'Volt LL Avg',
              'current_a': 'Current A',
              'current_b': 'Current B',
              'current_c': 'Current C',
              'current_avg': 'Current Avg',
              'current_in': 'Current IN',
              'watt_a': 'Watt A',
              'watt_b': 'Watt B',
              'watt_c': 'Watt C',
              'watt_total': 'Watt Total',
              'var_a': 'Var A',
              'var_b': 'Var B',
              'var_c': 'Var C',
              'var_total': 'Var total',
              'va_a': 'VA A',
              'va_b': 'VA B',
              'va_c': 'VA C',
              'va_total': 'VA Total',
              'pf_a': 'PF A',
              'pf_b': 'PF B',
              'pf_c': 'PF C',
              'pf_total': 'PF Total',
              'demand_w': 'Demand W',
              'demand_var': 'Demand Var',
              'demand_va': 'Demand VA',
              'import_kwh': 'Import kWh',
              'export_kwh': 'Export kWh',
              'import_kvarh': 'Import kVarh',
              'export_kvarh': 'Export kVarh',
              'thdv': 'THDV',
              'thdi': 'THDI'
            };
            
            console.log(`🔍 Column mapping available for:`, Object.keys(columnMapping));
            
            // Map database field names to UI column names (same as table-data.js)
            columns = parsedParameters.map(param => {
              const mappedColumn = columnMapping[param] || param;
              console.log(`🔍 Mapping ${param} -> ${mappedColumn}`);
              return mappedColumn;
            });
            console.log(`🔍 Final columns:`, columns);
          }
        }
      } catch (parseError) {
        console.error(`❌ Error parsing schedule data:`, parseError);
        console.log(`📊 Using default values - slaveIds: [1], columns: default set`);
      }
      
      console.log(`📊 Fetching data from ${dateFromStr} to ${dateToStr} for meters:`, slaveIds);
      console.log(`📊 Meter types:`, slaveIds.map(id => typeof id));
      console.log(`📊 Parameters:`, columns);
      
      // Show API call details
      console.log(`🚀 === API CALL DETAILS ===`);
      console.log(`🚀 Date Range: ${dateFromStr} to ${dateToStr}`);
      console.log(`🚀 Time Range: ${timeFromStr} to ${timeToStr}`);
      console.log(`🚀 Slave IDs to query:`, slaveIds);
      console.log(`🚀 Columns to fetch:`, columns);
      console.log(`🚀 Expected to find data for slave_id(s):`, slaveIds.join(', '));
      console.log(`🚀 USER SELECTED: ${dateFromStr} ${timeFromStr} - ${dateToStr} ${timeToStr}`);
      console.log(`================================`);
      
      // Convert meter IDs to slave_ids using available meters API
      console.log(`🔍 === CHECKING IF CONVERSION IS NEEDED ===`);
      console.log(`🔍 slaveIds before conversion check:`, slaveIds);
      slaveIds.forEach((id, index) => {
        console.log(`🔍 slaveId[${index}]: "${id}" (type: ${typeof id}, startsWith meter-: ${typeof id === 'string' && id.startsWith('meter-')})`);
      });
      
      const needsConversion = slaveIds.some(id => typeof id === 'string' && id.startsWith('meter-'));
      console.log(`🔍 Needs conversion: ${needsConversion}`);
      console.log(`================================`);
      
      // Initialize meterListCache if not exists
      if (!this.meterListCache) {
        this.meterListCache = [];
      }
      
      if (needsConversion) {
        console.log(`🔍 === METER ID TO SLAVE_ID CONVERSION ===`);
        try {
          // Fetch available meters to get the mapping
          console.log(`🔍 Importing node-fetch...`);
          const fetch = (await import('node-fetch')).default;
          console.log(`🔍 Fetching available meters from API...`);
          const metersResponse = await fetch('http://localhost:3001/api/meter-tree/available-meters');
          console.log(`🔍 API Response status:`, metersResponse.status, metersResponse.statusText);
          
          if (metersResponse.ok) {
            console.log(`🔍 Parsing JSON response...`);
            const metersData = await metersResponse.json();
            console.log(`🔍 Available meters from API:`, metersData);
            
            if (metersData.success && metersData.data && metersData.data.meters) {
              const meterList = metersData.data.meters;
              
              // Store meterList for later use in meter name mapping
              this.meterListCache = meterList;
              console.log(`🔍 Cached meterList for name mapping:`, this.meterListCache.length, 'meters');
              
              // Convert meter IDs to slave_ids
              slaveIds = slaveIds.map(meterId => {
                if (typeof meterId === 'string' && meterId.startsWith('meter-')) {
                  const meter = meterList.find(m => m.id === meterId);
                  if (meter && meter.slave_id) {
                    console.log(`🔍 Converting ${meterId} -> slave_id: ${meter.slave_id} (name: ${meter.name})`);
                    return parseInt(meter.slave_id);
                  } else {
                    console.log(`❌ Meter ${meterId} not found in meterList, keeping as-is`);
                    return meterId;
                  }
                }
                return meterId;
              });
              
              console.log(`🔍 Final converted slaveIds:`, slaveIds);
              
              // Show final conversion results
              console.log(`🎯 === FINAL SLAVE_ID MAPPING RESULTS ===`);
              slaveIds.forEach((slaveId, index) => {
                console.log(`🎯 Meter ${index + 1} -> slave_id: ${slaveId} (type: ${typeof slaveId})`);
              });
              console.log(`🎯 Ready to query database with these slave_ids`);
              console.log(`================================`);
            } else {
              console.log(`❌ Meter data structure invalid:`, metersData);
            }
          } else {
            console.log(`❌ API Response not OK:`, metersResponse.status, metersResponse.statusText);
          }
        } catch (error) {
          console.error(`❌ Error fetching meter list for conversion:`, error);
          console.error(`❌ Error details:`, error.message);
          console.error(`❌ Error stack:`, error.stack);
        }
        console.log(`================================`);
      } else {
        // Even if no conversion needed, fetch meterList for name mapping
        console.log(`🔍 === FETCHING METER LIST FOR NAME MAPPING ===`);
        try {
          const fetch = (await import('node-fetch')).default;
          const metersResponse = await fetch('http://localhost:3001/api/meter-tree/available-meters');
          
          if (metersResponse.ok) {
            const metersData = await metersResponse.json();
            if (metersData.success && metersData.data && metersData.data.meters) {
              this.meterListCache = metersData.data.meters;
              console.log(`🔍 Cached meterList for name mapping:`, this.meterListCache.length, 'meters');
            }
          }
        } catch (error) {
          console.error(`❌ Error fetching meter list for name mapping:`, error);
        }
        console.log(`================================`);
      }
      
      // Use the same API as manual export - direct HTTP call
      const fetch = (await import('node-fetch')).default;
      
      // Build query parameters like frontend apiClient.getTableData()
      const queryParams = new URLSearchParams({
        dateFrom: dateFromStr,
        dateTo: dateToStr,
        timeFrom: timeFromStr,
        timeTo: timeToStr,
        interval: (parseInt(schedule.read_time) || 15).toString()
      });

      // Add columns
      if (columns && columns.length > 0) {
        columns.forEach(col => {
          queryParams.append('columns', col);
        });
      }

      // Add slaveIds
      if (slaveIds && slaveIds.length > 0) {
        slaveIds.forEach(slaveId => {
          queryParams.append('slaveIds', slaveId.toString());
        });
      }

      const apiUrl = `http://localhost:3001/api/table-data?${queryParams.toString()}`;
      console.log(`📊 === API CALL DEBUG ===`);
      console.log(`📊 API URL:`, apiUrl);
      console.log(`📊 Query Parameters:`, Object.fromEntries(queryParams.entries()));
      console.log(`📊 Date Range: ${dateFromStr} ${timeFromStr} - ${dateToStr} ${timeToStr}`);
      console.log(`📊 Slave IDs:`, slaveIds);
      console.log(`📊 Columns:`, columns);
      console.log(`================================`);
      
      const apiResponse = await fetch(apiUrl);
      console.log(`📊 API Response Status:`, apiResponse.status);
      
      const response = await apiResponse.json();
      console.log(`📊 API Response:`, {
        success: response.success,
        dataLength: response.data ? response.data.length : 0,
        message: response.message,
        error: response.error
      });
      
      // ✅ เพิ่ม debug เพื่อดูว่าทำไมข้อมูลเป็น 0.00 หรือ N/A
      if (response.data && response.data.length > 0) {
        console.log(`📊 === SAMPLE DATA DEBUG ===`);
        console.log(`📊 First record:`, response.data[0]);
        console.log(`📊 Last record:`, response.data[response.data.length - 1]);
        console.log(`📊 Available columns in data:`, Object.keys(response.data[0]));
        console.log(`📊 Requested columns:`, columns);
        
        // ตรวจสอบค่าในแต่ละ column
        columns.forEach(col => {
          const sampleValues = response.data.slice(0, 3).map(row => row[col]);
          console.log(`📊 Column "${col}" sample values:`, sampleValues);
        });
        console.log(`================================`);
      } else {
        console.log(`❌ === NO DATA FOUND ===`);
        console.log(`❌ Query parameters used:`);
        console.log(`❌ Date: ${dateFromStr} to ${dateToStr}`);
        console.log(`❌ Time: ${timeFromStr} to ${timeToStr}`);
        console.log(`❌ Slave IDs: ${slaveIds.join(', ')}`);
        console.log(`❌ Columns: ${columns.join(', ')}`);
        console.log(`❌ This might indicate:`);
        console.log(`❌ 1. No data exists for this time range`);
        console.log(`❌ 2. Slave IDs are incorrect`);
        console.log(`❌ 3. Date/time range is outside available data`);
        console.log(`================================`);
      }
      
      if (response && response.data && Array.isArray(response.data)) {
        console.log(`📊 Fetched ${response.data.length} records from table-data API`);
        
        console.log(`📊 === API QUERY vs RESPONSE ANALYSIS ===`);
        console.log(`📊 API Query Date Range: ${dateFromStr} ${timeFromStr} - ${dateToStr} ${timeToStr}`);
        if (response.data && response.data.length > 0) {
          const firstRecord = response.data[0];
          const lastRecord = response.data[response.data.length - 1];
          const firstTimestamp = firstRecord.reading_timestamp || firstRecord.time;
          const lastTimestamp = lastRecord.reading_timestamp || lastRecord.time;
          
          console.log(`📊 First record timestamp: ${firstTimestamp}`);
          console.log(`📊 Last record timestamp: ${lastTimestamp}`);
          console.log(`📊 First record Thai time: ${new Date(firstTimestamp).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`);
          console.log(`📊 Last record Thai time: ${new Date(lastTimestamp).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`);
          console.log(`📊 First record date only: ${new Date(firstTimestamp).toLocaleDateString('th-TH')}`);
          console.log(`📊 Last record date only: ${new Date(lastTimestamp).toLocaleDateString('th-TH')}`);
        }
        console.log(`================================`);
        
        // Show data analysis
        console.log(`📈 === DATA ANALYSIS ===`);
        if (response.data.length > 0) {
          const uniqueSlaveIds = [...new Set(response.data.map(row => row.slave_id))];
          console.log(`📈 Found data for slave_id(s):`, uniqueSlaveIds);
          console.log(`📈 Date range in data:`, {
            first: response.data[0]?.reading_timestamp,
            last: response.data[response.data.length - 1]?.reading_timestamp
          });
          console.log(`📈 Sample record:`, response.data[0]);
          
          // Debug: Check if we're getting the right date
          const firstDate = new Date(response.data[0]?.reading_timestamp);
          const lastDate = new Date(response.data[response.data.length - 1]?.reading_timestamp);
          console.log(`📈 === DATE VERIFICATION ===`);
          console.log(`📈 First record date: ${firstDate.toISOString().split('T')[0]} (${firstDate.toLocaleDateString('th-TH')})`);
          console.log(`📈 Last record date: ${lastDate.toISOString().split('T')[0]} (${lastDate.toLocaleDateString('th-TH')})`);
          console.log(`📈 Expected date: ${dateFromStr} (today)`);
          console.log(`📈 Date match: ${firstDate.toISOString().split('T')[0] === dateFromStr ? '✅ YES' : '❌ NO'}`);
          console.log(`================================`);
        } else {
          console.log(`📈 No records found for the specified criteria`);
          console.log(`📈 Possible reasons:`);
          console.log(`   - No data exists for slave_id(s): ${slaveIds.join(', ')}`);
          console.log(`   - No data exists for date range: ${dateFromStr} to ${dateToStr}`);
          console.log(`   - Database connection issues`);
          console.log(`📈 ❌ No fallback search will be performed - respecting user's exact date/time selection`);
          console.log(`📈 💡 User specifically chose: ${dateFromStr} ${timeFromStr} - ${dateToStr} ${timeToStr}`);
        }
        console.log(`================================`);
        
        // Add meter names to the data using cached meterList and sort by timestamp then by slave_id
        const dataWithNames = response.data.map(row => {
          // Find meter name from cached meterList
          let meterName = `Meter ${row.slave_id}`; // Default fallback
          
          if (this.meterListCache && this.meterListCache.length > 0) {
            const meter = this.meterListCache.find(m => parseInt(m.slave_id) === parseInt(row.slave_id));
            if (meter && meter.name) {
              meterName = meter.name;
              console.log(`🏷️ Mapped slave_id ${row.slave_id} -> "${meterName}"`);
            } else {
              console.log(`⚠️ No meter found for slave_id ${row.slave_id} in cached meterList`);
            }
          } else {
            console.log(`⚠️ No meterListCache available for name mapping`);
          }
          
          return {
            ...row,
            meter_name: meterName,
            reading_timestamp: row.reading_timestamp || row.timestamp || row.time
          };
        }).sort((a, b) => {
          // First sort by timestamp
          const timeA = new Date(a.reading_timestamp);
          const timeB = new Date(b.reading_timestamp);
          const timeDiff = timeA.getTime() - timeB.getTime();
          
          // If timestamps are the same, sort by slave_id
          if (timeDiff === 0) {
            return a.slave_id - b.slave_id;
          }
          
          return timeDiff;
        });
        
        console.log(`📊 Data sorted by timestamp and meter. Sample order:`, 
          dataWithNames.slice(0, 5).map(row => `${row.reading_timestamp} - ${row.meter_name}`));
        
        return {
          data: dataWithNames,
          dateFromStr,
          dateToStr,
          timeFromStr,
          timeToStr,
          dateFrom,
          dateTo
        };
      } else {
        console.log(`📊 No data returned from API, using sample data`);
        console.log(`❌ === API RESPONSE ANALYSIS ===`);
        console.log(`❌ Response structure:`, {
          success: response?.success,
          hasData: !!response?.data,
          dataType: typeof response?.data,
          isArray: Array.isArray(response?.data)
        });
        console.log(`================================`);
        // Fallback to sample data with proper meter name
        const fallbackSlaveId = slaveIds[0] || 1;
        let fallbackMeterName = `Meter ${fallbackSlaveId}`;
        
        // Try to get meter name from cache
        if (this.meterListCache && this.meterListCache.length > 0) {
          const meter = this.meterListCache.find(m => parseInt(m.slave_id) === parseInt(fallbackSlaveId));
          if (meter && meter.name) {
            fallbackMeterName = meter.name;
            console.log(`🏷️ Fallback: Using meter name "${fallbackMeterName}" for slave_id ${fallbackSlaveId}`);
          }
        }
        
        return {
          data: [{
            slave_id: fallbackSlaveId,
            meter_name: fallbackMeterName,
            reading_timestamp: new Date().toISOString(),
            'Demand W': 0,
            'Import kWh': 0,
            'Voltage': 0,
            'Current': 0,
            'Power Factor': 0
          }],
          dateFromStr: new Date().toISOString().split('T')[0],
          dateToStr: new Date().toISOString().split('T')[0],
          timeFromStr: '00:00',
          timeToStr: '23:59',
          dateFrom: new Date(),
          dateTo: new Date()
        };
      }
      
    } catch (error) {
      console.error(`❌ Error fetching meter data:`, error);
      
      // Try to get meter name from cache for error fallback
      let errorFallbackMeterName = 'Meter 1';
      if (this.meterListCache && this.meterListCache.length > 0) {
        const meter = this.meterListCache.find(m => parseInt(m.slave_id) === 1);
        if (meter && meter.name) {
          errorFallbackMeterName = meter.name;
          console.log(`🏷️ Error fallback: Using meter name "${errorFallbackMeterName}" for slave_id 1`);
        }
      }
      
      // Return sample data as fallback
      return {
        data: [{
          slave_id: 1,
          meter_name: errorFallbackMeterName,
          reading_timestamp: new Date().toISOString(),
          'Demand W': 0,
          'Import kWh': 0,
          'Voltage': 0,
          'Current': 0,
          'Power Factor': 0
        }],
        dateFromStr: new Date().toISOString().split('T')[0],
        dateToStr: new Date().toISOString().split('T')[0],
        timeFromStr: '00:00',
        timeToStr: '23:59',
        dateFrom: new Date(),
        dateTo: new Date()
      };
    }
  }


  // Filter data by Read Time interval (synchronized across all meters)
  filterDataByReadTime(data, readTimeMinutes) {
    if (!data || data.length === 0 || !readTimeMinutes || readTimeMinutes <= 0) {
      return data;
    }

    console.log(`📊 Filtering data by Read Time: ${readTimeMinutes} minutes interval (synchronized)`);
    
    // Group data by slave_id first
    const groupedByMeter = {};
    data.forEach(row => {
      const slaveId = row.slave_id;
      if (!groupedByMeter[slaveId]) {
        groupedByMeter[slaveId] = [];
      }
      groupedByMeter[slaveId].push(row);
    });

    console.log(`📊 Meters found:`, Object.keys(groupedByMeter).map(id => `Meter ${id}: ${groupedByMeter[id].length} records`));

    // Get all unique timestamps across all meters
    const allTimestamps = [...new Set(data.map(row => {
      const timestamp = new Date(row.reading_timestamp || row.timestamp || row.time);
      return timestamp.getTime();
    }))].sort((a, b) => a - b);

    console.log(`📊 Total unique timestamps: ${allTimestamps.length}`);
    console.log(`📊 Time range: ${new Date(allTimestamps[0]).toISOString()} - ${new Date(allTimestamps[allTimestamps.length-1]).toISOString()}`);

    // Filter timestamps by interval
    const filteredTimestamps = [];
    let lastTimestamp = null;
    const intervalMs = readTimeMinutes * 60 * 1000;

    allTimestamps.forEach((timestamp, index) => {
      if (lastTimestamp === null) {
        // Always include first timestamp
        filteredTimestamps.push(timestamp);
        lastTimestamp = timestamp;
        console.log(`📊 First timestamp: ${new Date(timestamp).toISOString()}`);
      } else {
        const timeDiff = timestamp - lastTimestamp;
        
        if (timeDiff >= intervalMs) {
          // Include this timestamp if enough time has passed
          filteredTimestamps.push(timestamp);
          lastTimestamp = timestamp;
          
          if (filteredTimestamps.length <= 5) { // Log first few filtered timestamps
            console.log(`📊 Filtered timestamp ${filteredTimestamps.length}: ${new Date(timestamp).toISOString()} (${Math.round(timeDiff/60000)} min gap)`);
          }
        }
      }
    });

    console.log(`📊 Filtered timestamps: ${allTimestamps.length} -> ${filteredTimestamps.length} timestamps`);

    // Now get data for each meter at each filtered timestamp
    const synchronizedData = [];
    const meterIds = Object.keys(groupedByMeter);

    filteredTimestamps.forEach(targetTimestamp => {
      meterIds.forEach(meterId => {
        const meterData = groupedByMeter[meterId];
        
        // Find the closest record for this meter at this timestamp
        let closestRecord = null;
        let minTimeDiff = Infinity;
        
        meterData.forEach(record => {
          const recordTimestamp = new Date(record.reading_timestamp || record.timestamp || record.time).getTime();
          const timeDiff = Math.abs(recordTimestamp - targetTimestamp);
          
          // Accept records within 5 minutes of target timestamp
          if (timeDiff <= 5 * 60 * 1000 && timeDiff < minTimeDiff) {
            minTimeDiff = timeDiff;
            closestRecord = record;
          }
        });

        if (closestRecord) {
          // Use the closest record but update timestamp to be synchronized
          synchronizedData.push({
            ...closestRecord,
            reading_timestamp: new Date(targetTimestamp).toISOString(),
            timestamp: new Date(targetTimestamp).toISOString(),
            time: new Date(targetTimestamp).toISOString(),
            _original_timestamp: closestRecord.reading_timestamp || closestRecord.timestamp || closestRecord.time,
            _time_diff_minutes: Math.round(minTimeDiff / 60000)
          });
        }
      });
    });

    // Sort final data by timestamp then by slave_id
    synchronizedData.sort((a, b) => {
      const timeA = new Date(a.reading_timestamp).getTime();
      const timeB = new Date(b.reading_timestamp).getTime();
      const timeDiff = timeA - timeB;
      
      if (timeDiff === 0) {
        return a.slave_id - b.slave_id;
      }
      
      return timeDiff;
    });

    console.log(`📊 Synchronized filtering completed: ${data.length} -> ${synchronizedData.length} records`);
    console.log(`📊 Records per timestamp: ${synchronizedData.length / filteredTimestamps.length} (should be ${meterIds.length})`);
    
    // Log sample of synchronized data
    if (synchronizedData.length > 0) {
      console.log(`📊 Sample synchronized data:`, synchronizedData.slice(0, Math.min(6, synchronizedData.length)).map(row => 
        `${row.reading_timestamp} - Meter ${row.slave_id} (orig: ${row._original_timestamp}, diff: ${row._time_diff_minutes}min)`
      ));
    }

    return synchronizedData;
  }

  // Send email export with file attachment (like manual export)
  async sendEmailExport(schedule, meterData, dateTimeInfo) {
    try {
      console.log(`📧 === SENDING EMAIL EXPORT ===`);
      console.log(`📧 Schedule ID: ${schedule.id}`);
      console.log(`📧 Export type: ${schedule.export_type}`);
      console.log(`📧 Schedule email_list:`, schedule.email_list, typeof schedule.email_list);
      console.log(`📧 Schedule object:`, JSON.stringify(schedule, null, 2));
      console.log(`================================`);
      
      // Get email recipients
      const recipients = await this.getEmailRecipients(schedule.email_list);
      if (recipients.length === 0) {
        console.log(`⚠️ No email recipients found for schedule ${schedule.id}`);
        return { success: false, error: 'No email recipients found' };
      }
      
      // Generate file attachment based on export type
      let attachment = null;
      let filename = '';
      let contentType = '';
      
      // Format date as DDMMYYYY (e.g., 29092025)
      const today = new Date();
      const day = String(today.getDate()).padStart(2, '0');
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = today.getFullYear();
      const dateStr = `${day}${month}${year}`;

      if (schedule.export_type === 'pdf') {
        // Generate PDF using the same method as generatePdfContent
        attachment = await this.generatePdfContent(schedule, meterData, dateTimeInfo);
        filename = `export_${dateStr}.pdf`;
        contentType = 'application/pdf';
        console.log(`📄 Generated PDF attachment: ${filename}`);
        
      } else if (schedule.export_type === 'excel') {
        // Generate Excel using the same method as generateExcelContent
        attachment = await this.generateExcelContent(schedule, meterData, dateTimeInfo);
        filename = `export_${dateStr}.xlsx`;
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        console.log(`📊 Generated Excel attachment: ${filename}`);
        
      } else if (schedule.export_type === 'tou_pe') {
        // Generate TOU PE report as Excel format
        console.log(`📊 Generating TOU PE report as Excel format`);
        attachment = await this.generateExcelContent(schedule, meterData, dateTimeInfo);
        filename = `export_${dateStr}.xlsx`;
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        console.log(`📊 Generated TOU PE Excel attachment: ${filename}`);
        
      } else {
        console.log(`❌ Unsupported export type: ${schedule.export_type}`);
        return { success: false, error: `Unsupported export type: ${schedule.export_type}` };
      }
      
      // Prepare email content (simple HTML)
      const dateRange = `${dateTimeInfo.dateFromStr} ${dateTimeInfo.timeFromStr} - ${dateTimeInfo.dateToStr} ${dateTimeInfo.timeToStr}`;
      const meterNames = meterData && meterData.length > 0 ? 
        [...new Set(meterData.map(row => row.meter_name || `Meter ${row.slave_id}`))].join(', ') :
        'No meters';
      
      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
            WebMeter Auto Report
          </h2>
          
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #374151; margin-top: 0;">Report Details</h3>
            <p><strong>Export Type:</strong> ${schedule.export_type.toUpperCase()}</p>
            <p><strong>Date Range:</strong> ${dateRange}</p>
            <p><strong>Meters:</strong> ${meterNames}</p>
            <p><strong>Generated:</strong> ${new Date().toLocaleString('en-GB')}</p>
          </div>
          
          <p style="color: #6b7280;">
            This is an automated report generated by WebMeter system. 
            Please find the attached ${schedule.export_type.toUpperCase()} file with the detailed data.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #9ca3af; font-size: 12px;">
            WebMeter by Amptron Thailand Co.,Ltd.<br>
            Generated automatically on ${new Date().toLocaleString('en-GB')}
          </p>
        </div>
      `;
      
      // Send emails to all recipients
      let successCount = 0;
      let failCount = 0;
      
      for (const recipient of recipients) {
        try {
          const mailOptions = {
            from: process.env.EMAIL_USER,
            to: recipient.email,
            subject: `WebMeter Auto Report - (${new Date().toLocaleDateString('en-GB')})`,
            html: emailContent,
            attachments: [{
              filename: filename,
              content: attachment,
              contentType: contentType
            }]
          };

          await emailTransporter.sendMail(mailOptions);
          console.log(`📧 Email sent successfully to ${recipient.email}`);
          successCount++;
          
        } catch (emailError) {
          console.error(`❌ Failed to send email to ${recipient.email}:`, emailError);
          failCount++;
        }
      }
      
      console.log(`📧 Email sending completed: ${successCount} success, ${failCount} failed`);
      
      return { 
        success: successCount > 0, 
        recipients: recipients.length,
        successCount,
        failCount,
        attachment: attachment ? 'Generated' : 'Failed'
      };
      
    } catch (error) {
      console.error(`❌ Error sending email export:`, error);
      throw error;
    }
  }

  // Send LINE export
  async sendLineExport(schedule, meterData, dateTimeInfo) {
    try {
      console.log(`📱 === SENDING LINE EXPORT ===`);
      console.log(`📱 Schedule ID: ${schedule.id}`);
      console.log(`📱 Schedule export_format:`, schedule.export_format);
      console.log(`📱 Schedule line_list:`, schedule.line_list, typeof schedule.line_list);
      console.log(`📱 Schedule object:`, JSON.stringify(schedule, null, 2));
      console.log(`================================`);
      
      // Format data for LINE (same as manual export)
      const lineContent = this.formatDataForLine(schedule, meterData, dateTimeInfo);
      console.log(`📱 LINE content length: ${lineContent.length} characters`);
      
      // Get LINE recipients using same logic as manual export
      let recipients = [];
      
      if (schedule.line_list && Array.isArray(schedule.line_list) && schedule.line_list.length > 0) {
        // Use line_list array (multiple recipients)
        console.log(`📱 Using line_list array:`, schedule.line_list);
        recipients = await this.getLineRecipients(schedule.line_list);
      } else {
        // Fallback: Use all active LINE users (same as manual export default behavior)
        console.log(`📱 No specific line_list provided, using all active LINE users`);
        recipients = await this.getAllActiveLineUsers();
      }
      
      console.log(`📱 Found ${recipients.length} LINE recipients`);
      
      if (recipients.length === 0) {
        console.log(`⚠️ No LINE recipients found for schedule ${schedule.id}`);
        return { success: false, error: 'No LINE recipients found' };
      }
      
      // Send LINE messages
      let sentCount = 0;
      let failedCount = 0;
      
      for (const recipient of recipients) {
        try {
          console.log(`📱 Attempting to send LINE message to ${recipient.displayName} (${recipient.line_messaging_id})`);
          await this.sendLineMessage(recipient.line_messaging_id, lineContent);
          sentCount++;
          console.log(`✅ LINE message sent successfully to ${recipient.displayName}`);
        } catch (error) {
          failedCount++;
          console.error(`❌ Failed to send LINE message to ${recipient.displayName}:`, error.message);
        }
      }
      
      console.log(`📱 LINE sending completed: ${sentCount} success, ${failedCount} failed`);
      return { success: sentCount > 0, recipients: sentCount, failed: failedCount };
      
    } catch (error) {
      console.error(`❌ Error sending LINE export:`, error);
      throw error;
    }
  }

  // Generate Excel export
  async generateExcelExport(schedule, meterData, dateTimeInfo) {
    try {
      console.log(`📊 Generating Excel export for schedule ${schedule.id}`);
      
      // Generate Excel file with date-based filename
      const today = new Date();
      const dateStr = today.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      }).replace(/\//g, '');
      const filePath = path.join(process.cwd(), 'exports', `export_${dateStr}.xlsx`);
      
      // Ensure exports directory exists
      const exportsDir = path.dirname(filePath);
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
      }
      
      // Generate Excel content (placeholder)
      const excelContent = this.generateExcelContent(schedule, meterData, dateTimeInfo);
      
      // Check if file is locked and generate unique filename if needed
      let finalFilePath = filePath;
      let counter = 1;
      while (fs.existsSync(finalFilePath)) {
        try {
          // Try to access the file
          const fd = fs.openSync(finalFilePath, 'r+');
          fs.closeSync(fd);
          break; // File is not locked, we can use it
        } catch (error) {
          if (error.code === 'EBUSY' || error.code === 'ENOENT') {
            // File is locked or doesn't exist, try with counter
            const ext = path.extname(filePath);
            const base = path.basename(filePath, ext);
            const dir = path.dirname(filePath);
            finalFilePath = path.join(dir, `${base}_${counter}${ext}`);
            counter++;
          } else {
            throw error;
          }
        }
      }
      
      fs.writeFileSync(finalFilePath, excelContent);
      console.log(`📊 Excel file generated: ${finalFilePath}`);
      
      return { success: true, filePath: finalFilePath };
      
    } catch (error) {
      console.error(`❌ Error generating Excel export:`, error);
      throw error;
    }
  }

  // Generate PDF export
  async generatePdfExport(schedule, meterData, dateTimeInfo) {
    try {
      console.log(`📄 Generating PDF export for schedule ${schedule.id}`);
      
      // Generate PDF file with date-based filename
      const today = new Date();
      const dateStr = today.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      }).replace(/\//g, '');
      const filePath = path.join(process.cwd(), 'exports', `export_${dateStr}.pdf`);
      
      // Ensure exports directory exists
      const exportsDir = path.dirname(filePath);
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
      }
      
      // Generate PDF content using PDFKit
      const pdfContent = await this.generatePdfContent(schedule, meterData, dateTimeInfo);
      fs.writeFileSync(filePath, pdfContent);
      
      console.log(`📄 PDF file generated: ${filePath}`);
      return { success: true, filePath };
      
    } catch (error) {
      console.error(`❌ Error generating PDF export:`, error);
      throw error;
    }
  }

  // Format data for email (like manual export)
  formatDataForEmail(schedule, meterData, dateTimeInfo) {
    // ✅ แก้ไข: ใช้ช่วงเวลาที่ผู้ใช้เลือก และ format เป็นรูปแบบไทย
    const userDateFrom = new Date(`${dateTimeInfo.dateFromStr}T${dateTimeInfo.timeFromStr}:00`);
    const userDateTo = new Date(`${dateTimeInfo.dateToStr}T${dateTimeInfo.timeToStr}:00`);
    
    // ✅ แก้ไข: Format วันที่และเวลาแบบ ค.ศ. เหมือนกับหน้า Export Manual
    const formatThaiDateTime = (date) => {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear(); // ใช้ปี ค.ศ.
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    };
    
    const dateRange = `${formatThaiDateTime(userDateFrom)} - ${formatThaiDateTime(userDateTo)}`;
    
    // Format actual data like manual export
    let formattedData = '';
    if (meterData && meterData.length > 0) {
      // Group data by meter
      const groupedByMeter = {};
      meterData.forEach(row => {
        const meterName = row.meter_name || `Meter ${row.slave_id}`;
        if (!groupedByMeter[meterName]) {
          groupedByMeter[meterName] = [];
        }
        groupedByMeter[meterName].push(row);
      });

      // Format data for each meter
      Object.keys(groupedByMeter).forEach(meterName => {
        formattedData += `<h4>${meterName}</h4>\n<table border="1" style="border-collapse: collapse; width: 100%;">\n`;
        formattedData += '<tr><th>Time</th>';
        
        // Add parameter headers
        if (schedule.parameters && Array.isArray(schedule.parameters)) {
          schedule.parameters.forEach(param => {
            formattedData += `<th>${param}</th>`;
          });
        }
        formattedData += '</tr>\n';

        // Add data rows
        groupedByMeter[meterName].slice(0, 10).forEach(row => { // Limit to 10 rows per meter
          const timestamp = row.reading_timestamp || row.timestamp || row.time;
          const formattedTime = new Date(timestamp).toLocaleString();
          formattedData += `<tr><td>${formattedTime}</td>`;
          
          if (schedule.parameters && Array.isArray(schedule.parameters)) {
            schedule.parameters.forEach(param => {
              const value = this.getParameterValue(row, param);
              formattedData += `<td>${value}</td>`;
            });
          }
          formattedData += '</tr>\n';
        });
        
        formattedData += '</table><br>\n';
      });
    }
    
    return `
      <h2>WebMeter Auto Export Report</h2>
      <p><strong>Export Type:</strong> ${schedule.export_type}</p>
      <p><strong>Date Range:</strong> ${dateRange}</p>
      <p><strong>Meters:</strong> ${schedule.meters.length} selected</p>
      <p><strong>Parameters:</strong> ${schedule.parameters.length} selected</p>
      <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
      
      <h3>Data</h3>
      ${formattedData}
      
      <hr>
      <p><small>WebMeter by Amptron Thailand Co.,Ltd.</small></p>
    `;
  }

  // Helper function to get parameter value from row (same as generateExcelContent)
  getParameterValue(row, param) {
    // Use the same parameter mapping as Email Export for consistency
    const parameterMapping = {
      'frequency': 'Frequency',
      'volt_an': 'Volt AN',
      'volt_bn': 'Volt BN', 
      'volt_cn': 'Volt CN',
      'volt_ln_avg': 'Volt LN Avg',
      'volt_ab': 'Volt AB',
      'volt_bc': 'Volt BC',
      'volt_ca': 'Volt CA',
      'volt_ll_avg': 'Volt LL Avg',
      'current_a': 'Current A',
      'current_b': 'Current B',
      'current_c': 'Current C',
      'current_avg': 'Current Avg',
      'current_in': 'Current IN',
      'watt_a': 'Watt A',
      'watt_b': 'Watt B',
      'watt_c': 'Watt C',
      'watt_total': 'Watt Total',
      'var_a': 'Var A',
      'var_b': 'Var B',
      'var_c': 'Var C',
      'var_total': 'Var total',
      'va_a': 'VA A',
      'va_b': 'VA B',
      'va_c': 'VA C',
      'va_total': 'VA Total',
      'pf_a': 'PF A',
      'pf_b': 'PF B',
      'pf_c': 'PF C',
      'pf_total': 'PF Total',
      'demand_w': 'Demand W',
      'demand_var': 'Demand Var',
      'demand_va': 'Demand VA',
      'import_kwh': 'Import kWh',
      'export_kwh': 'Export kWh',
      'import_kvarh': 'Import kVarh',
      'export_kvarh': 'Export kVarh',
      'thdv': 'THDV',
      'thdi': 'THDI'
    };
    
    // Try direct parameter mapping first (same as Email Export)
    let value = row[param];
    let matchedKey = param;
    
    if (value === undefined || value === null) {
      // Try parameter mapping
      const mappedKey = parameterMapping[param];
      if (mappedKey && row[mappedKey] !== undefined && row[mappedKey] !== null) {
        value = row[mappedKey];
        matchedKey = mappedKey;
        console.log(`✅ Found ${param} -> ${matchedKey} = ${value}`);
      }
    }
    
    if (value !== undefined && value !== null) {
      if (typeof value === 'number') {
        return value.toFixed(2);
      }
      return value.toString();
    }
    
    // Try different column name formats
    const possibleKeys = [
      param,
      param.charAt(0).toUpperCase() + param.slice(1),
      param.replace(/_/g, ' '),
      param.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      `param_${param}`,
      // Add more mappings as needed
    ];

    for (const key of possibleKeys) {
      if (row[key] !== undefined && row[key] !== null) {
        const value = row[key];
        console.log(`✅ Found ${param} -> ${key} = ${value} (fallback)`);
        if (typeof value === 'number') {
          return value.toFixed(2);
        }
        return value.toString();
      }
    }
    
    // Debug: show what keys are available for this parameter
    console.log(`❌ Parameter ${param} not found. Available keys containing "${param}":`, 
      Object.keys(row).filter(k => k.toLowerCase().includes(param.toLowerCase())));
    
    return 'N/A';
  }

  // Send LINE notification when no data is available
  async sendNoDataLineNotification(schedule) {
    try {
      console.log(`📱 === SENDING NO DATA LINE NOTIFICATION ===`);
      
      // Get LINE recipients
      const lineRecipients = await this.getLineRecipients(schedule);
      
      if (lineRecipients.length === 0) {
        console.log(`📱 No LINE recipients found for schedule ${schedule.id}`);
        return;
      }
      
      // Create no data message
      // ✅ แก้ไข: Format วันที่แบบ ค.ศ. เหมือนกับหน้า Export Manual
      let requestedDateStr = 'N/A';
      if (schedule.date_from) {
        const date = new Date(schedule.date_from);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear(); // ใช้ปี ค.ศ.
        requestedDateStr = `${day}/${month}/${year}`;
      }
      
      const message = `⚠️ WebMeter Auto Export - No Data Available

📋 Export Type: ${schedule.export_type}
📅 Requested Date: ${requestedDateStr}
⏰ Requested Time: ${schedule.time_from} - ${schedule.time_to}
🏭 Meters: ${schedule.meters ? schedule.meters.length : 0} selected
📊 Parameters: ${schedule.parameters ? schedule.parameters.length : 0} selected

❌ No data found for the specified date and time range.

💡 Possible reasons:
• Data collection was not active during this period
• Meter communication issues
• Database maintenance

Please check the system status or try a different time range.

WebMeter by Amptron Thailand Co.,Ltd.`;

      console.log(`📱 Sending no-data notification to ${lineRecipients.length} LINE recipients`);
      
      // Send to each recipient
      for (const recipient of lineRecipients) {
        try {
          await this.sendLineMessage(recipient.line_messaging_id, message);
          console.log(`✅ No-data notification sent to ${recipient.displayName}`);
        } catch (error) {
          console.log(`❌ Failed to send no-data notification to ${recipient.displayName}:`, error.message);
        }
      }
      
    } catch (error) {
      console.log(`❌ Error sending no-data LINE notification:`, error.message);
    }
  }

  // Format data for LINE (like manual export)
  formatDataForLine(schedule, meterData, dateTimeInfo) {
    console.log(`📱 === formatDataForLine DEBUG ===`);
    console.log(`📱 dateTimeInfo:`, dateTimeInfo);
    console.log(`📱 dateTimeInfo type:`, typeof dateTimeInfo);
    console.log(`📱 dateTimeInfo keys:`, dateTimeInfo ? Object.keys(dateTimeInfo) : 'undefined');
    console.log(`================================`);
    
    console.log(`📱 === LINE DISPLAY DATE ANALYSIS ===`);
    console.log(`📱 Requested dateTimeInfo.dateFromStr: ${dateTimeInfo.dateFromStr}`);
    console.log(`📱 Requested dateTimeInfo.dateToStr: ${dateTimeInfo.dateToStr}`);
    console.log(`📱 Requested dateTimeInfo.timeFromStr: ${dateTimeInfo.timeFromStr}`);
    console.log(`📱 Requested dateTimeInfo.timeToStr: ${dateTimeInfo.timeToStr}`);
    
    // ✅ แก้ไข: ใช้ช่วงเวลาที่ผู้ใช้เลือก แทนที่จะใช้ช่วงเวลาจากข้อมูลจริง
    console.log(`📱 === USER SELECTED DATE RANGE ===`);
    console.log(`📱 User selected dateFromStr: ${dateTimeInfo.dateFromStr}`);
    console.log(`📱 User selected dateToStr: ${dateTimeInfo.dateToStr}`);
    console.log(`📱 User selected timeFromStr: ${dateTimeInfo.timeFromStr}`);
    console.log(`📱 User selected timeToStr: ${dateTimeInfo.timeToStr}`);
    
    // ✅ สร้าง Date objects จากช่วงเวลาที่ผู้ใช้เลือก
    const userDateFrom = new Date(`${dateTimeInfo.dateFromStr}T${dateTimeInfo.timeFromStr}:00`);
    const userDateTo = new Date(`${dateTimeInfo.dateToStr}T${dateTimeInfo.timeToStr}:00`);
    
    console.log(`📱 User dateFrom object: ${userDateFrom.toString()}`);
    console.log(`📱 User dateTo object: ${userDateTo.toString()}`);
    
    // ✅ แก้ไข: Format วันที่แบบ ค.ศ. เหมือนกับหน้า Export Manual
    const formatThaiDate = (date) => {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear(); // ใช้ปี ค.ศ. แทน พ.ศ.
      return `${day}/${month}/${year}`;
    };
    
    const formatTime = (date) => {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    };
    
    const fromThaiDate = formatThaiDate(userDateFrom);
    const fromThaiTime = formatTime(userDateFrom);
    const toThaiDate = formatThaiDate(userDateTo);
    const toThaiTime = formatTime(userDateTo);
    
    console.log(`📱 Formatted from: ${fromThaiDate} ${fromThaiTime}`);
    console.log(`📱 Formatted to: ${toThaiDate} ${toThaiTime}`);
    
    // ✅ ใช้ช่วงเวลาที่ผู้ใช้เลือก (ไม่ใช่ข้อมูลจากฐานข้อมูล)
    const actualDateRange = `${fromThaiDate} ${fromThaiTime} - ${toThaiDate} ${toThaiTime}`;
    console.log(`📱 Final LINE date range (user selected): ${actualDateRange}`);
    
    // Debug: แสดงข้อมูลจริงที่ได้จากฐานข้อมูล (เพื่อเปรียบเทียบ)
    if (meterData && meterData.length > 0) {
      const firstRecord = meterData[0];
      const lastRecord = meterData[meterData.length - 1];
      const firstDate = new Date(firstRecord.reading_timestamp || firstRecord.time);
      const lastDate = new Date(lastRecord.reading_timestamp || lastRecord.time);
      
      console.log(`📱 === ACTUAL DATA RANGE (for comparison) ===`);
      console.log(`📱 First record: ${formatThaiDate(firstDate)} ${formatTime(firstDate)}`);
      console.log(`📱 Last record: ${formatThaiDate(lastDate)} ${formatTime(lastDate)}`);
      console.log(`📱 Data count: ${meterData.length} records`);
      console.log(`📱 Note: Using USER SELECTED range in report, not actual data range`);
    }
    console.log(`================================`);
    
    const dateRange = actualDateRange;
    
    // Format actual data like manual export
    let formattedData = '';
    if (meterData && meterData.length > 0) {
      // Group data by meter
      const groupedByMeter = {};
      meterData.forEach(row => {
        const meterName = row.meter_name || `Meter ${row.slave_id}`;
        if (!groupedByMeter[meterName]) {
          groupedByMeter[meterName] = [];
        }
        groupedByMeter[meterName].push(row);
      });

      // Format data for each meter (show more data but still reasonable for LINE)
      Object.keys(groupedByMeter).slice(0, 3).forEach(meterName => { // Max 3 meters
        formattedData += `\n=== ${meterName} ===\n`;
        
        // ✅ เพิ่ม header สำหรับ parameters
        if (schedule.parameters && Array.isArray(schedule.parameters) && schedule.parameters.length > 0) {
          const headerParams = schedule.parameters.slice(0, 4).join(' | ');
          formattedData += `Time | ${headerParams}\n`;
          formattedData += `${'-'.repeat(50)}\n`;
        }
        
        // ✅ แก้ไข: แสดงข้อมูลทั้งหมดไม่จำกัดจำนวนแถว
        const totalRows = groupedByMeter[meterName].length;
        console.log(`📱 Formatting ALL ${totalRows} rows for meter ${meterName}`);
        
        groupedByMeter[meterName].forEach((row, index) => {
          const timestamp = row.reading_timestamp || row.timestamp || row.time;
          const dateObj = new Date(timestamp);
          // ✅ แก้ไข: Format วันที่และเวลาแบบ ค.ศ. เหมือนกับหน้า Export Manual
          const day = dateObj.getDate().toString().padStart(2, '0');
          const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
          const year = dateObj.getFullYear(); // ใช้ปี ค.ศ.
          const hours = dateObj.getHours().toString().padStart(2, '0');
          const minutes = dateObj.getMinutes().toString().padStart(2, '0');
          const seconds = dateObj.getSeconds().toString().padStart(2, '0');
          const formattedTime = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
          
          // Debug first few rows
          if (index < 3) {
            console.log(`📱 === ROW ${index + 1} TIMESTAMP DEBUG ===`);
            console.log(`📱 Raw timestamp: ${timestamp}`);
            console.log(`📱 Date object: ${dateObj.toString()}`);
            console.log(`📱 Date object UTC: ${dateObj.toISOString()}`);
            console.log(`📱 Date object Thai time: ${dateObj.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`);
            console.log(`📱 Formatted for LINE: ${formattedTime}`);
            console.log(`📱 Expected date from user: ${dateTimeInfo.dateFromStr}`);
            console.log(`📱 Actual date from data: ${dateObj.toISOString().split('T')[0]}`);
            console.log(`📱 Date match: ${dateObj.toISOString().split('T')[0] === dateTimeInfo.dateFromStr ? '✅ YES' : '❌ NO'}`);
            console.log(`================================`);
          }
          
          // ✅ ปรับรูปแบบให้อ่านง่ายขึ้น - แสดงเป็นบรรทัดเดียว
          let rowData = `${formattedTime}`;
          
          if (schedule.parameters && Array.isArray(schedule.parameters)) {
            // Show parameters in same line, separated by | for better readability
            const maxParams = Math.min(schedule.parameters.length, 4); // Max 4 parameters per row
            const paramValues = schedule.parameters.slice(0, maxParams).map(param => {
              const value = this.getParameterValue(row, param);
              return `${param}:${value}`;
            });
            
            if (paramValues.length > 0) {
              rowData += ` | ${paramValues.join(' | ')}`;
            }
          }
          
          formattedData += `${rowData}\n`;
        });
        
        // ✅ ลบการแสดง "และอีก X รายการ" เพราะแสดงข้อมูลทั้งหมดแล้ว
        // ไม่ต้องแสดง summary เพราะแสดงข้อมูลครบทั้งหมดแล้ว
      });
    }
    
    // ✅ แก้ไข: ใช้รูปแบบวันที่แบบ ค.ศ. เหมือนกับที่ผู้ใช้เลือกในหน้า Export Manual
    const now = new Date();
    const generatedTime = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    return `WebMeter Auto Export Report

Export Type: ${schedule.export_type}
Date Range: ${dateRange}
Meters: ${schedule.meters.length} selected
Parameters: ${schedule.parameters.length} selected
Generated: ${generatedTime}

${formattedData}

WebMeter by Amptron Thailand Co.,Ltd.`;
  }

  // Get email recipients from database
  async getEmailRecipients(emailListIds) {
    console.log(`🔍 === EMAIL RECIPIENTS DEBUG ===`);
    console.log(`📧 Input emailListIds:`, emailListIds, typeof emailListIds);
    
    if (!emailListIds || emailListIds.length === 0) {
      console.log(`⚠️ No emailListIds provided`);
      return [];
    }

    try {
      // Parse emailListIds if it's a JSON string
      let parsedEmailListIds = emailListIds;
      if (typeof emailListIds === 'string') {
        try {
          parsedEmailListIds = JSON.parse(emailListIds);
          console.log(`📧 Parsed emailListIds:`, parsedEmailListIds);
        } catch (parseError) {
          console.log(`❌ Failed to parse emailListIds as JSON:`, parseError);
          // Try to use as array if it's comma-separated
          parsedEmailListIds = emailListIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
          console.log(`📧 Converted to array:`, parsedEmailListIds);
        }
      }
      
      if (!Array.isArray(parsedEmailListIds) || parsedEmailListIds.length === 0) {
        console.log(`⚠️ No valid email list IDs after parsing`);
        return [];
      }

      console.log(`📧 Querying email_list table with IDs:`, parsedEmailListIds);
      
      // First check if email_list table exists and has data
      const tableCheckResult = await parametersPool.query(
        `SELECT COUNT(*) as count FROM email_list`
      );
      console.log(`📧 Total emails in email_list table:`, tableCheckResult.rows[0].count);
      
      if (parseInt(tableCheckResult.rows[0].count) === 0) {
        console.log(`⚠️ email_list table is empty, using fallback emails`);
        // Fallback: create sample email recipients for testing
        const fallbackEmails = parsedEmailListIds.map((id, index) => ({
          id: id,
          email: `test${index + 1}@example.com`,
          name: `Test User ${index + 1}`
        }));
        console.log(`📧 Using fallback emails:`, fallbackEmails);
        console.log(`================================`);
        return fallbackEmails;
      }
      
      const result = await parametersPool.query(
        'SELECT id, email, name FROM email_list WHERE id = ANY($1)',
        [parsedEmailListIds]
      );
      
      console.log(`📧 Found ${result.rows.length} email recipients:`, result.rows);
      
      if (result.rows.length === 0) {
        console.log(`⚠️ No matching emails found for IDs: ${parsedEmailListIds.join(', ')}`);
        // Show all available emails for debugging
        const allEmailsResult = await parametersPool.query('SELECT id, email, name FROM email_list LIMIT 10');
        console.log(`📧 Available emails in table:`, allEmailsResult.rows);
      }
      
      console.log(`================================`);
      return result.rows;
    } catch (error) {
      console.error('❌ Error fetching email recipients:', error);
      console.log(`================================`);
      return [];
    }
  }

  // Get LINE recipients from database
  async getLineRecipients(lineListIds) {
    console.log(`🔍 === LINE RECIPIENTS DEBUG ===`);
    console.log(`📱 Input lineListIds:`, lineListIds, typeof lineListIds);
    
    if (!lineListIds || lineListIds.length === 0) {
      console.log(`⚠️ No lineListIds provided`);
      return [];
    }

    try {
      // Parse lineListIds if it's a JSON string
      let parsedLineListIds = lineListIds;
      if (typeof lineListIds === 'string') {
        try {
          parsedLineListIds = JSON.parse(lineListIds);
          console.log(`📱 Parsed lineListIds:`, parsedLineListIds);
        } catch (parseError) {
          console.log(`❌ Failed to parse lineListIds as JSON:`, parseError);
          // Try to use as array if it's comma-separated
          parsedLineListIds = lineListIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
          console.log(`📱 Converted to array:`, parsedLineListIds);
        }
      }
      
      if (!Array.isArray(parsedLineListIds) || parsedLineListIds.length === 0) {
        console.log(`⚠️ No valid line list IDs after parsing`);
        return [];
      }

      console.log(`📱 Querying users.users table for LINE users with IDs:`, parsedLineListIds);
      
      // Query from users.users table instead of line_list table (use mainDb)
      const result = await mainDb.query(
        `SELECT 
          id, 
          line_messaging_id, 
          line_id,
          name as "displayName",
          username
        FROM users.users 
        WHERE id = ANY($1) 
        AND (line_messaging_id IS NOT NULL OR line_id IS NOT NULL)
        AND status = 'active'`,
        [parsedLineListIds]
      );
      
      console.log(`📱 Found ${result.rows.length} LINE users from users.users table:`, result.rows);
      
      // Transform the result to match expected format
      const lineRecipients = result.rows.map(user => ({
        id: user.id,
        line_messaging_id: user.line_messaging_id || user.line_id, // Use line_messaging_id first, fallback to line_id
        displayName: user.displayName || user.username || `User ${user.id}`
      }));
      
      console.log(`📱 Transformed LINE recipients:`, lineRecipients);
      
      if (lineRecipients.length === 0) {
        console.log(`⚠️ No LINE users found for IDs: ${parsedLineListIds.join(', ')}`);
        // Show all available LINE users for debugging
        const allLineUsersResult = await mainDb.query(`
          SELECT id, name, username, line_id, line_messaging_id, status 
          FROM users.users 
          WHERE (line_messaging_id IS NOT NULL OR line_id IS NOT NULL) 
          AND status = 'active'
          LIMIT 10
        `);
        console.log(`📱 Available LINE users in users.users table:`, allLineUsersResult.rows);
      }
      
      console.log(`================================`);
      return lineRecipients;
    } catch (error) {
      console.error('❌ Error fetching LINE recipients:', error);
      console.log(`================================`);
      return [];
    }
  }

  // Get all active LINE users (same as manual export fallback)
  async getAllActiveLineUsers() {
    console.log(`🔍 === GET ALL ACTIVE LINE USERS ===`);
    
    try {
      // Test database connection first
      await mainDb.query('SELECT 1');
      console.log(`✅ Main database connection successful`);
      const result = await mainDb.query(
        `SELECT 
          id, 
          line_messaging_id, 
          line_id,
          name as "displayName",
          username
        FROM users.users 
        WHERE (line_messaging_id IS NOT NULL OR line_id IS NOT NULL)
        AND status = 'active'
        ORDER BY id ASC`
      );
      
      console.log(`📱 Found ${result.rows.length} active LINE users:`, result.rows);
      
      // Transform the result to match expected format
      const lineRecipients = result.rows.map(user => ({
        id: user.id,
        line_messaging_id: user.line_messaging_id || user.line_id,
        displayName: user.displayName || user.username || `User ${user.id}`
      }));
      
      console.log(`📱 Transformed active LINE recipients:`, lineRecipients);
      console.log(`================================`);
      return lineRecipients;
    } catch (error) {
      console.error('❌ Error fetching all active LINE users:', error);
      console.log(`================================`);
      return [];
    }
  }

  // Send LINE message (using same API as manual export)
  async sendLineMessage(lineMessagingId, message) {
    try {
      console.log(`📱 Sending LINE message to ${lineMessagingId}`);
      console.log(`📱 Message content: ${message.substring(0, 100)}...`);
      
      // Use the same API endpoint as manual export
      const fetch = (await import('node-fetch')).default;
      
      const payload = {
        lineId: lineMessagingId,
        message: message
      };
      
      console.log(`📱 Sending payload to LINE API:`, payload);
      console.log(`📱 JSON payload:`, JSON.stringify(payload));
      console.log(`📱 Payload size:`, JSON.stringify(payload).length, 'bytes');
      
      // Test if server is running first
      try {
        const healthCheck = await fetch('http://localhost:3001/api/health');
        console.log(`📱 Health check status:`, healthCheck.status);
      } catch (healthError) {
        console.error(`❌ Server health check failed:`, healthError.message);
        throw new Error('Server is not reachable');
      }
      
      // Test body parsing with test endpoint
      try {
        const testResponse = await fetch('http://localhost:3001/api/test-body', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ test: 'data', lineId: 'test123' })
        });
        const testResult = await testResponse.text();
        console.log(`📱 Test endpoint response:`, testResult);
      } catch (testError) {
        console.error(`❌ Test endpoint failed:`, testError.message);
      }
      
      const response = await fetch('http://localhost:3002/send-line', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      console.log(`📱 Response status:`, response.status);
      console.log(`📱 Response ok:`, response.ok);
      console.log(`📱 Response headers:`, response.headers.raw());
      
      const responseText = await response.text();
      console.log(`📱 Response text:`, responseText);
      console.log(`📱 Response text length:`, responseText.length);
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error(`❌ Failed to parse response as JSON:`, parseError);
        throw new Error(`Invalid JSON response: ${responseText}`);
      }
      
      if (result.success) {
        console.log(`✅ LINE message sent successfully to ${lineMessagingId}`);
        return { success: true };
      } else {
        console.error(`❌ Failed to send LINE message:`, result.error);
        throw new Error(result.error || 'Failed to send LINE message');
      }
      
    } catch (error) {
      console.error(`❌ Error sending LINE message:`, error);
      throw error;
    }
  }



  // Generate Excel content using XLSX library (same format as manual export)
  generateExcelContent(schedule, meterData, dateTimeInfo) {
    try {
      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      
      // Prepare data for Excel (same format as exportUtils.ts)
      const excelData = [];
      
      // Calculate date range for metadata
      const now = new Date();
      let dateFrom, dateTo;
      if (schedule.export_type === 'daily') {
        dateFrom = new Date(now);
        dateFrom.setDate(dateFrom.getDate() - 1);
        dateTo = new Date(dateFrom);
      } else if (schedule.export_type === 'weekly') {
        dateFrom = new Date(now);
        dateFrom.setDate(dateFrom.getDate() - 7);
        dateTo = new Date(now);
        dateTo.setDate(dateTo.getDate() - 1);
      } else {
        dateFrom = new Date(now);
        dateFrom.setDate(dateFrom.getDate() - 1);
        dateTo = new Date(dateFrom);
      }
      
      const formatDateWithFullMonth = (date) => {
        const day = date.getDate().toString().padStart(2, '0');
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'];
        const month = monthNames[date.getMonth()];
        const year = date.getFullYear();
        return `${day} ${month} ${year}`;
      };
      
      // Add metadata headers (same as exportUtils.ts)
      const meterNames = meterData && meterData.length > 0 ? 
        [...new Set(meterData.map(row => row.meter_name || `Meter ${row.slave_id}`))].join(', ') :
        'No meters';
      
      excelData.push([`Meter: ${meterNames}`]);
      excelData.push([`Date: ${formatDateWithFullMonth(dateTimeInfo.dateFrom)} ${dateTimeInfo.timeFromStr} - ${formatDateWithFullMonth(dateTimeInfo.dateTo)} ${dateTimeInfo.timeToStr}`]);
      excelData.push([`Generated: ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB')}`]);
      excelData.push([]); // Empty row
      
      // Group data by slave_id for multiple meters
      const groupedData = {};
      if (meterData && Array.isArray(meterData)) {
        meterData.forEach(row => {
          const slaveId = row.slave_id;
          if (!groupedData[slaveId]) {
            groupedData[slaveId] = [];
          }
          groupedData[slaveId].push(row);
        });
      }
      
      console.log(`📊 Grouped data by meters:`, Object.keys(groupedData).map(id => `Meter ${id}: ${groupedData[id].length} records`));
      
      // Add column headers (same as exportUtils.ts)
      const headers = ['Time', 'Meter'];
      if (schedule.parameters && Array.isArray(schedule.parameters)) {
        headers.push(...schedule.parameters);
      } else {
        headers.push('Demand W', 'Import kWh', 'Voltage', 'Current', 'Power Factor');
      }
      excelData.push(headers);
      
      // Add data rows (same format as exportUtils.ts)
      if (meterData && Array.isArray(meterData)) {
        console.log(`📊 Processing ${meterData.length} data rows for Excel export`);
        console.log(`📊 Sample row keys:`, Object.keys(meterData[0] || {}));
        console.log(`📊 Schedule parameters:`, schedule.parameters);
        
        meterData.forEach((row, index) => {
          const formatDateTime = (dateTimeString) => {
            if (!dateTimeString) return '--/--/---- --:--';
            try {
              const date = new Date(dateTimeString);
              const day = date.getDate().toString().padStart(2, '0');
              const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];
              const month = monthNames[date.getMonth()];
              const year = date.getFullYear();
              const hours = date.getHours().toString().padStart(2, '0');
              const minutes = date.getMinutes().toString().padStart(2, '0');
              return `${hours}:${minutes} ${day} ${month} ${year}`;
            } catch {
              return dateTimeString;
            }
          };
          
          const dataRow = [
            formatDateTime(row.reading_timestamp || row.timestamp || row.time),
            row.meter_name || `Meter ${row.slave_id}`
          ];
          
          // Add parameter values (improved column matching)
          if (schedule.parameters && Array.isArray(schedule.parameters)) {
            schedule.parameters.forEach(param => {
              // Try multiple ways to find the column value
              let value = row[param];
              let matchedKey = param;
              
              if (value === undefined || value === null) {
                // Enhanced column mapping with specific parameter mappings
                const parameterMapping = {
                  'frequency': 'Frequency',
                  'volt_an': 'Volt AN',
                  'volt_bn': 'Volt BN', 
                  'volt_cn': 'Volt CN',
                  'volt_ln_avg': 'Volt LN Avg',
                  'volt_ab': 'Volt AB',
                  'volt_bc': 'Volt BC',
                  'volt_ca': 'Volt CA',
                  'volt_ll_avg': 'Volt LL Avg',
                  'current_a': 'Current A',
                  'current_b': 'Current B',
                  'current_c': 'Current C',
                  'current_avg': 'Current Avg',
                  'current_in': 'Current IN',
                  'watt_a': 'Watt A',
                  'watt_b': 'Watt B',
                  'watt_c': 'Watt C',
                  'watt_total': 'Watt Total',
                  'var_a': 'Var A',
                  'var_b': 'Var B',
                  'var_c': 'Var C',
                  'var_total': 'Var total',
                  'va_a': 'VA A',
                  'va_b': 'VA B',
                  'va_c': 'VA C',
                  'va_total': 'VA Total',
                  'pf_a': 'PF A',
                  'pf_b': 'PF B',
                  'pf_c': 'PF C',
                  'pf_total': 'PF Total',
                  'demand_w': 'Demand W',
                  'demand_var': 'Demand Var',
                  'demand_va': 'Demand VA',
                  'import_kwh': 'Import kWh',
                  'export_kwh': 'Export kWh',
                  'import_kvarh': 'Import kVarh',
                  'export_kvarh': 'Export kVarh',
                  'thdv': 'THDV',
                  'thdi': 'THDI'
                };
                
                // Try specific mapping first
                const mappedColumnName = parameterMapping[param.toLowerCase()];
                if (mappedColumnName && row[mappedColumnName] !== undefined) {
                  value = row[mappedColumnName];
                  matchedKey = mappedColumnName;
                } else {
                  // Try general matching patterns
                  const keys = Object.keys(row);
                  const matchingKey = keys.find(key => 
                    key.toLowerCase() === param.toLowerCase() ||
                    key.replace(/\s+/g, '_').toLowerCase() === param.replace(/\s+/g, '_').toLowerCase() ||
                    key.replace(/_/g, ' ').toLowerCase() === param.replace(/_/g, ' ').toLowerCase()
                  );
                  
                  if (matchingKey) {
                    value = row[matchingKey];
                    matchedKey = matchingKey;
                  }
                }
              }
              
              // Debug logging for first row only
              if (index === 0) {
                console.log(`📊 Parameter "${param}" -> Key "${matchedKey}" -> Value: ${value}`);
              }
              
              if (value !== undefined && value !== null && value !== '') {
                const numValue = parseFloat(value);
                dataRow.push(!isNaN(numValue) ? numValue : value);
              } else {
                dataRow.push('N/A');
              }
            });
          } else {
            // Default parameter values with proper column name mapping
            const getColumnValue = (columnName) => {
              // Map common column names to actual API response keys
              const columnMapping = {
                'Voltage': 'Volt AN',
                'Current': 'Current Avg', 
                'Power Factor': 'PF Total',
                'Demand W': 'Demand W',
                'Import kWh': 'Import kWh',
                'Frequency': 'Frequency'
              };
              
              const actualColumnName = columnMapping[columnName] || columnName;
              let value = row[actualColumnName];
              let matchedKey = actualColumnName;
              
              if (value === undefined || value === null) {
                // Try to find similar column names
                const keys = Object.keys(row);
                const matchingKey = keys.find(key => 
                  key.toLowerCase().includes(columnName.toLowerCase()) ||
                  columnName.toLowerCase().includes(key.toLowerCase())
                );
                
                if (matchingKey) {
                  value = row[matchingKey];
                  matchedKey = matchingKey;
                }
              }
              
              // Debug logging for first row only
              if (index === 0) {
                console.log(`📊 Default column "${columnName}" -> Mapped to "${actualColumnName}" -> Key "${matchedKey}" -> Value: ${value}`);
              }
              
              if (value === undefined || value === null) return 'N/A';
              if (typeof value === 'number') {
                if (actualColumnName === 'Demand W' || actualColumnName === 'Import kWh') {
                  return Math.round(value);
                }
                return parseFloat(value.toFixed(2));
              }
              return value;
            };
            
            dataRow.push(
              getColumnValue('Demand W'),
              getColumnValue('Import kWh'),
              getColumnValue('Voltage'),
              getColumnValue('Current'),
              getColumnValue('Power Factor')
            );
          }
          
          excelData.push(dataRow);
        });
      } else {
        // Add "No data available" row
        const noDataRow = ['No data available', ...Array(headers.length - 1).fill('N/A')];
        excelData.push(noDataRow);
      }
      
      // Create worksheet from data
      const worksheet = XLSX.utils.aoa_to_sheet(excelData);
      
      // Auto-fit columns (same as exportUtils.ts)
      const colWidths = headers.map((header, index) => {
        let maxLength = header.length;
        excelData.slice(5).forEach(row => { // Skip metadata rows
          const cellValue = row[index];
          if (cellValue) {
            const cellLength = cellValue.toString().length;
            if (cellLength > maxLength) {
              maxLength = cellLength;
            }
          }
        });
        return { wch: Math.min(maxLength + 2, 50) };
      });
      worksheet['!cols'] = colWidths;
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Export Data');
      
      // Generate Excel buffer
      const excelBuffer = XLSX.write(workbook, { 
        bookType: 'xlsx', 
        type: 'buffer' 
      });
      
      return excelBuffer;
      
    } catch (error) {
      console.error('❌ Error generating Excel content:', error);
      // Fallback to simple text content
      return Buffer.from(`Excel generation failed for schedule ${schedule.id}\nError: ${error.message}`, 'utf8');
    }
  }

  // Generate PDF content using PDFKit library (same format as manual export)
  generatePdfContent(schedule, meterData, dateTimeInfo) {
    return new Promise((resolve, reject) => {
      try {
        // Create PDF document (same as exportUtils.ts)
        const doc = new PDFDocument({ 
          layout: 'landscape',
          size: 'A4',
          margins: { top: 55, bottom: 20, left: 14, right: 14 }
        });
        
        // Collect PDF data in chunks
        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve(pdfBuffer);
        });
        doc.on('error', reject);
        
        // Use dateTimeInfo from parameter
        
        const formatDateWithFullMonth = (date) => {
          const day = date.getDate().toString().padStart(2, '0');
          const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
          const month = monthNames[date.getMonth()];
          const year = date.getFullYear();
          return `${day} ${month} ${year}`;
        };
        
        // Add title and metadata with better spacing
        doc.fontSize(18).fillColor('#1f2937').text('WebMeter - Table Data Report', 20, 25);
        
        // Add separator line
        doc.moveTo(20, 50).lineTo(doc.page.width - 20, 50).stroke('#e5e7eb');
        
        doc.fontSize(10).fillColor('#374151');
        const meterNames = meterData && meterData.length > 0 ? 
          [...new Set(meterData.map(row => row.meter_name || `Meter ${row.slave_id}`))].join(', ') :
          'No meters';
        
        // ✅ แก้ไข: ใช้ช่วงเวลาที่ผู้ใช้เลือก
        const userDateFrom = new Date(`${dateTimeInfo.dateFromStr}T${dateTimeInfo.timeFromStr}:00`);
        const userDateTo = new Date(`${dateTimeInfo.dateToStr}T${dateTimeInfo.timeToStr}:00`);
        
        // Better spacing for metadata
        doc.text(`Date Range: ${formatDateWithFullMonth(userDateFrom)} ${dateTimeInfo.timeFromStr} - ${formatDateWithFullMonth(userDateTo)} ${dateTimeInfo.timeToStr}`, 20, 60);
        doc.text(`Meters: ${meterNames}`, 20, 75);
        doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB')}`, 20, 90);
        
        // Add another separator line
        doc.moveTo(20, 105).lineTo(doc.page.width - 20, 105).stroke('#e5e7eb');
        
        // Prepare table headers (same as exportUtils.ts)
        const headers = ['Time', 'Meter'];
        if (schedule.parameters && Array.isArray(schedule.parameters)) {
          headers.push(...schedule.parameters);
        } else {
          headers.push('Demand W', 'Import kWh', 'Voltage', 'Current', 'Power Factor');
        }
        
        // Prepare table data (same format as exportUtils.ts)
        const tableData = [];
        if (meterData && Array.isArray(meterData)) {
          console.log(`📄 Processing ${meterData.length} data rows for PDF export`);
          console.log(`📄 Sample row keys:`, Object.keys(meterData[0] || {}));
          console.log(`📄 Schedule parameters:`, schedule.parameters);
          
          meterData.forEach((row, index) => {
            const formatDateTime = (dateTimeString) => {
              if (!dateTimeString) return '--/--/---- --:--';
              try {
                const date = new Date(dateTimeString);
                const day = date.getDate().toString().padStart(2, '0');
                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
                const month = monthNames[date.getMonth()];
                const year = date.getFullYear();
                const hours = date.getHours().toString().padStart(2, '0');
                const minutes = date.getMinutes().toString().padStart(2, '0');
                return `${hours}:${minutes} ${day} ${month} ${year}`;
              } catch {
                return dateTimeString;
              }
            };
            
            const dataRow = [
              formatDateTime(row.reading_timestamp || row.timestamp || row.time),
              row.meter_name || `Meter ${row.slave_id}`
            ];
            
            // Add parameter values (enhanced column matching - same as Excel)
            if (schedule.parameters && Array.isArray(schedule.parameters)) {
              schedule.parameters.forEach(param => {
                // Try multiple ways to find the column value
                let value = row[param];
                let matchedKey = param;
                
                if (value === undefined || value === null) {
                  // Enhanced column mapping with specific parameter mappings
                  const parameterMapping = {
                    'frequency': 'Frequency',
                    'volt_an': 'Volt AN',
                    'volt_bn': 'Volt BN', 
                    'volt_cn': 'Volt CN',
                    'volt_ln_avg': 'Volt LN Avg',
                    'volt_ab': 'Volt AB',
                    'volt_bc': 'Volt BC',
                    'volt_ca': 'Volt CA',
                    'volt_ll_avg': 'Volt LL Avg',
                    'current_a': 'Current A',
                    'current_b': 'Current B',
                    'current_c': 'Current C',
                    'current_avg': 'Current Avg',
                    'current_in': 'Current IN',
                    'watt_a': 'Watt A',
                    'watt_b': 'Watt B',
                    'watt_c': 'Watt C',
                    'watt_total': 'Watt Total',
                    'var_a': 'Var A',
                    'var_b': 'Var B',
                    'var_c': 'Var C',
                    'var_total': 'Var total',
                    'va_a': 'VA A',
                    'va_b': 'VA B',
                    'va_c': 'VA C',
                    'va_total': 'VA Total',
                    'pf_a': 'PF A',
                    'pf_b': 'PF B',
                    'pf_c': 'PF C',
                    'pf_total': 'PF Total',
                    'demand_w': 'Demand W',
                    'demand_var': 'Demand Var',
                    'demand_va': 'Demand VA',
                    'import_kwh': 'Import kWh',
                    'export_kwh': 'Export kWh',
                    'import_kvarh': 'Import kVarh',
                    'export_kvarh': 'Export kVarh',
                    'thdv': 'THDV',
                    'thdi': 'THDI'
                  };
                  
                  // Try specific mapping first
                  const mappedColumnName = parameterMapping[param.toLowerCase()];
                  if (mappedColumnName && row[mappedColumnName] !== undefined) {
                    value = row[mappedColumnName];
                    matchedKey = mappedColumnName;
                  } else {
                    // Try general matching patterns
                    const keys = Object.keys(row);
                    const matchingKey = keys.find(key => 
                      key.toLowerCase() === param.toLowerCase() ||
                      key.replace(/\s+/g, '_').toLowerCase() === param.replace(/\s+/g, '_').toLowerCase() ||
                      key.replace(/_/g, ' ').toLowerCase() === param.replace(/_/g, ' ').toLowerCase()
                    );
                    
                    if (matchingKey) {
                      value = row[matchingKey];
                      matchedKey = matchingKey;
                    }
                  }
                }
                
                // Debug logging for first row only
                if (index === 0) {
                  console.log(`📄 Parameter "${param}" -> Key "${matchedKey}" -> Value: ${value}`);
                }
                
                if (value !== undefined && value !== null && value !== '') {
                  const numValue = parseFloat(value);
                  dataRow.push(!isNaN(numValue) ? numValue.toString() : value.toString());
                } else {
                  dataRow.push('N/A');
                }
              });
            } else {
              // Default parameter values with proper column name mapping (same as Excel)
              const getColumnValue = (columnName) => {
                // Map common column names to actual API response keys
                const columnMapping = {
                  'Voltage': 'Volt AN',
                  'Current': 'Current Avg', 
                  'Power Factor': 'PF Total',
                  'Demand W': 'Demand W',
                  'Import kWh': 'Import kWh',
                  'Frequency': 'Frequency'
                };
                
                const actualColumnName = columnMapping[columnName] || columnName;
                let value = row[actualColumnName];
                let matchedKey = actualColumnName;
                
                if (value === undefined || value === null) {
                  // Try to find similar column names
                  const keys = Object.keys(row);
                  const matchingKey = keys.find(key => 
                    key.toLowerCase().includes(columnName.toLowerCase()) ||
                    columnName.toLowerCase().includes(key.toLowerCase())
                  );
                  
                  if (matchingKey) {
                    value = row[matchingKey];
                    matchedKey = matchingKey;
                  }
                }
                
                if (value === undefined || value === null) return 'N/A';
                if (typeof value === 'number') {
                  if (actualColumnName === 'Demand W' || actualColumnName === 'Import kWh') {
                    return Math.round(value).toString();
                  }
                  return value.toFixed(2);
                }
                return value.toString();
              };
              
              dataRow.push(
                getColumnValue('Demand W'),
                getColumnValue('Import kWh'),
                getColumnValue('Voltage'),
                getColumnValue('Current'),
                getColumnValue('Power Factor')
              );
            }
            
            tableData.push(dataRow);
          });
        } else {
          // Add "No data available" row
          const noDataRow = ['No data available', ...Array(headers.length - 1).fill('N/A')];
          tableData.push(noDataRow);
        }
        
        // Enhanced table layout with better spacing
        let currentY = 120; // Start after metadata
        const tableStartX = 20;
        const tableWidth = doc.page.width - 40; // More margin
        
        // Calculate dynamic column widths based on content
        const columnWidths = [];
        const minColumnWidth = 60;
        const maxColumnWidth = 120;
        
        // Time column gets more space
        columnWidths[0] = Math.min(140, tableWidth * 0.25);
        // Meter column gets fixed width
        columnWidths[1] = Math.min(80, tableWidth * 0.15);
        
        // Distribute remaining width among parameter columns
        const remainingWidth = tableWidth - columnWidths[0] - columnWidths[1];
        const parameterColumns = headers.length - 2;
        const parameterColumnWidth = parameterColumns > 0 ? 
          Math.max(minColumnWidth, Math.min(maxColumnWidth, remainingWidth / parameterColumns)) : 0;
        
        for (let i = 2; i < headers.length; i++) {
          columnWidths[i] = parameterColumnWidth;
        }
        
        // Draw enhanced table headers
        const headerHeight = 20;
        doc.fontSize(9).fillColor('white');
        
        let currentX = tableStartX;
        headers.forEach((header, index) => {
          const colWidth = columnWidths[index];
          
          // Header background with gradient effect
          doc.rect(currentX, currentY, colWidth, headerHeight)
             .fill('#1f2937')
             .stroke('#374151');
          
          // Header text with better positioning
          doc.fillColor('white')
             .font('Helvetica-Bold')
             .text(header, currentX + 4, currentY + 6, { 
               width: colWidth - 8, 
               align: 'center',
               height: headerHeight - 8,
               ellipsis: true
             });
          
          currentX += colWidth;
        });
        
        currentY += headerHeight;
        
        // Draw enhanced data rows
        const rowHeight = 16; // Increased row height for better readability
        
        tableData.forEach((dataRow, rowIndex) => {
          // Check if we need a new page with more margin
          if (currentY > doc.page.height - 80) {
            doc.addPage();
            currentY = 50;
            
            // Redraw headers on new page
            doc.fontSize(9).fillColor('white');
            let headerX = tableStartX;
            headers.forEach((header, index) => {
              const colWidth = columnWidths[index];
              doc.rect(headerX, currentY, colWidth, headerHeight)
                 .fill('#1f2937')
                 .stroke('#374151');
              doc.fillColor('white')
                 .font('Helvetica-Bold')
                 .text(header, headerX + 4, currentY + 6, { 
                   width: colWidth - 8, 
                   align: 'center',
                   height: headerHeight - 8,
                   ellipsis: true
                 });
              headerX += colWidth;
            });
            currentY += headerHeight;
          }
          
          // Enhanced row styling
          const fillColor = rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc';
          
          let cellX = tableStartX;
          dataRow.forEach((cellData, colIndex) => {
            const colWidth = columnWidths[colIndex];
            
            // Cell background
            doc.rect(cellX, currentY, colWidth, rowHeight)
               .fill(fillColor)
               .stroke('#e2e8f0');
            
            // Cell text with better formatting
            const textAlign = colIndex === 0 ? 'left' : (colIndex === 1 ? 'center' : 'right');
            const textColor = colIndex === 0 ? '#1f2937' : '#374151';
            
            doc.fillColor(textColor)
               .font('Helvetica')
               .fontSize(8)
               .text(String(cellData), cellX + 4, currentY + 4, { 
                 width: colWidth - 8, 
                 align: textAlign,
                 height: rowHeight - 8,
                 ellipsis: true
               });
            
            cellX += colWidth;
          });
          
          currentY += rowHeight;
        });
        
        // Add footer with page info
        const pageCount = doc.bufferedPageRange().count;
        for (let i = 0; i < pageCount; i++) {
          doc.switchToPage(i);
          doc.fontSize(8)
             .fillColor('#6b7280')
             .text(`Page ${i + 1} of ${pageCount}`, 
                   doc.page.width - 100, 
                   doc.page.height - 30, 
                   { align: 'right' });
        }
        
        // Finalize the PDF
        doc.end();
        
      } catch (error) {
        console.error('❌ Error generating PDF content:', error);
        reject(error);
      }
    });
  }

  // Mark schedule as run and update next run time
  async markScheduleAsRun(scheduleId, success, error) {
    try {
      // Get current schedule to calculate next run
      const currentSchedule = await parametersPool.query('SELECT * FROM export_schedules WHERE id = $1', [scheduleId]);
      
      if (currentSchedule.rows.length === 0) {
        console.error(`❌ Schedule ${scheduleId} not found`);
        return;
      }

      const schedule = currentSchedule.rows[0];
      const nextRun = this.calculateNextRun(
        schedule.frequency, 
        schedule.time, 
        schedule.day_of_week, 
        schedule.day_of_month
      );

      await parametersPool.query(`
        UPDATE export_schedules 
        SET last_run = NOW(), 
            next_run = $1, 
            run_count = run_count + 1
        WHERE id = $2
      `, [nextRun, scheduleId]);

      console.log(`✅ Schedule ${scheduleId} marked as run, next run: ${nextRun}`);
      
    } catch (error) {
      console.error(`❌ Error marking schedule ${scheduleId} as run:`, error);
    }
  }

  // Calculate next run time (same logic as in routes)
  calculateNextRun(frequency, time, dayOfWeek, dayOfMonth) {
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    
    let nextRun = new Date();
    nextRun.setHours(hours, minutes, 0, 0);
    
    switch (frequency) {
      case 'daily':
        nextRun.setDate(nextRun.getDate() + 1);
        break;
        
      case 'weekly':
        const dayMap = {
          'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4,
          'friday': 5, 'saturday': 6, 'sunday': 0
        };
        const targetDay = dayMap[dayOfWeek];
        const currentDay = nextRun.getDay();
        
        let daysUntilTarget = (targetDay - currentDay + 7) % 7;
        if (daysUntilTarget === 0) {
          daysUntilTarget = 7; // Next week
        }
        
        nextRun.setDate(nextRun.getDate() + daysUntilTarget);
        break;
        
      case 'monthly':
        nextRun.setMonth(nextRun.getMonth() + 1);
        nextRun.setDate(dayOfMonth);
        
        // Handle months with fewer days
        if (nextRun.getDate() !== dayOfMonth) {
          nextRun.setDate(0); // Last day of previous month
        }
        break;
    }
    
    return nextRun;
  }

  // Get scheduler status
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeTasks: this.scheduledTasks.size,
      uptime: this.isRunning ? Date.now() - this.startTime : 0
    };
  }
}

// Create and export scheduler instance
const exportScheduler = new ExportScheduler();

module.exports = exportScheduler;
