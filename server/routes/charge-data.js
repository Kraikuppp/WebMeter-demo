const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/charge-data - Get charge data with maximum Demand W for each meter
router.get('/', async (req, res) => {
  try {
    console.log('🔍 === CHARGE DATA API REQUEST ===');
    
    const { 
      slaveIds, 
      dateFrom, 
      dateTo, 
      timeFrom = '00:00', 
      timeTo = '23:59' 
    } = req.query;

    console.log('📊 Request Parameters:');
    console.log('   - slaveIds:', slaveIds);
    console.log('   - dateFrom:', dateFrom);
    console.log('   - dateTo:', dateTo);
    console.log('   - timeFrom:', timeFrom);
    console.log('   - timeTo:', timeTo);

    // Validate required parameters
    if (!slaveIds || !dateFrom || !dateTo) {
      console.log('❌ Missing required parameters');
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: slaveIds, dateFrom, dateTo'
      });
    }

    // Parse slaveIds
    let slaveIdArray;
    try {
      if (typeof slaveIds === 'string') {
        // Handle both comma-separated string and JSON array string
        if (slaveIds.startsWith('[')) {
          slaveIdArray = JSON.parse(slaveIds);
        } else {
          slaveIdArray = slaveIds.split(',').map(id => parseInt(id.trim()));
        }
      } else if (Array.isArray(slaveIds)) {
        slaveIdArray = slaveIds.map(id => parseInt(id));
      } else {
        slaveIdArray = [parseInt(slaveIds)];
      }
    } catch (error) {
      console.log('❌ Error parsing slaveIds:', error);
      return res.status(400).json({
        success: false,
        error: 'Invalid slaveIds format'
      });
    }

    console.log('🔢 Parsed Slave IDs:', slaveIdArray);

    // Create date range with proper timezone handling
    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);
    
    // Set time components
    const [startHour, startMinute] = timeFrom.split(':').map(Number);
    const [endHour, endMinute] = timeTo.split(':').map(Number);
    
    startDate.setHours(startHour, startMinute, 0, 0);
    endDate.setHours(endHour, endMinute, 59, 999);

    // Convert to ISO string for PostgreSQL (removes timezone issues)
    const startTimestamp = startDate.toISOString();
    const endTimestamp = endDate.toISOString();

    console.log('📅 Date Range (ISO):');
    console.log('   - Start:', startTimestamp);
    console.log('   - End:', endTimestamp);

    const chargeDataResults = [];

    // Process each slave ID
    for (const slaveId of slaveIdArray) {
      console.log(`\n🔍 Processing Slave ID: ${slaveId}`);
      
      try {
        // Query to get maximum Demand W and Import kWh for this slave ID
        const query = `
          SELECT 
            slave_id,
            MAX(param_31_power_demand) as max_demand_w,
            MAX(param_34_import_kwh) as max_import_kwh,
            COUNT(*) as record_count,
            MIN(reading_timestamp) as first_reading,
            MAX(reading_timestamp) as last_reading
          FROM parameters_value 
          WHERE reading_timestamp >= $1 
            AND reading_timestamp <= $2 
            AND slave_id = $3
            AND param_31_power_demand IS NOT NULL
          GROUP BY slave_id
        `;

        console.log('📊 Executing query for slave ID:', slaveId);
        console.log('📊 Query parameters:', [startTimestamp, endTimestamp, slaveId]);

        const result = await db.query(query, [startTimestamp, endTimestamp, slaveId]);

        if (result.rows.length > 0) {
          const row = result.rows[0];
          
          console.log(`✅ Results for Slave ID ${slaveId}:`);
          console.log(`   - Max Demand W: ${row.max_demand_w}`);
          console.log(`   - Max Import kWh: ${row.max_import_kwh}`);
          console.log(`   - Record Count: ${row.record_count}`);
          console.log(`   - First Reading: ${row.first_reading}`);
          console.log(`   - Last Reading: ${row.last_reading}`);

          chargeDataResults.push({
            slaveId: parseInt(row.slave_id),
            maxDemandW: parseFloat(row.max_demand_w) || 0,
            maxImportKWh: parseFloat(row.max_import_kwh) || 0,
            recordCount: parseInt(row.record_count),
            firstReading: row.first_reading,
            lastReading: row.last_reading,
            dateRange: {
              from: startTimestamp,
              to: endTimestamp
            }
          });
        } else {
          console.log(`⚠️ No data found for Slave ID ${slaveId}`);
          
          chargeDataResults.push({
            slaveId: slaveId,
            maxDemandW: 0,
            maxImportKWh: 0,
            recordCount: 0,
            firstReading: null,
            lastReading: null,
            dateRange: {
              from: startTimestamp,
              to: endTimestamp
            }
          });
        }
      } catch (slaveError) {
        console.log(`❌ Error processing Slave ID ${slaveId}:`, slaveError.message);
        
        chargeDataResults.push({
          slaveId: slaveId,
          maxDemandW: 0,
          maxImportKWh: 0,
          recordCount: 0,
          error: slaveError.message,
          dateRange: {
            from: startTimestamp,
            to: endTimestamp
            }
        });
      }
    }

    // Summary statistics
    const totalMeters = chargeDataResults.length;
    const metersWithData = chargeDataResults.filter(r => r.recordCount > 0).length;
    const totalRecords = chargeDataResults.reduce((sum, r) => sum + r.recordCount, 0);
    const maxDemandWOverall = Math.max(...chargeDataResults.map(r => r.maxDemandW));
    const maxImportKWhOverall = Math.max(...chargeDataResults.map(r => r.maxImportKWh));

    console.log('\n📊 === CHARGE DATA SUMMARY ===');
    console.log(`📊 Total Meters Processed: ${totalMeters}`);
    console.log(`📊 Meters with Data: ${metersWithData}`);
    console.log(`📊 Total Records Found: ${totalRecords}`);
    console.log(`📊 Overall Max Demand W: ${maxDemandWOverall}`);
    console.log(`📊 Overall Max Import kWh: ${maxImportKWhOverall}`);
    console.log('================================');

    res.json({
      success: true,
      data: chargeDataResults,
      summary: {
        totalMeters,
        metersWithData,
        totalRecords,
        maxDemandWOverall,
        maxImportKWhOverall,
        dateRange: {
          from: startTimestamp,
          to: endTimestamp
        },
        requestedSlaveIds: slaveIdArray
      },
      message: `Successfully processed ${totalMeters} meters, found data for ${metersWithData} meters`
    });

  } catch (error) {
    console.error('❌ Error in charge data API:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: 'Internal server error while fetching charge data'
    });
  }
});

// GET /api/charge-data/test - Test endpoint
router.get('/test', async (req, res) => {
  try {
    console.log('🧪 === CHARGE DATA API TEST ===');
    
    // First, let's check what tables exist
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    console.log('🧪 Checking available tables...');
    const tablesResult = await db.query(tablesQuery);
    
    console.log('🧪 Available tables:');
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    // Try to find the correct table name
    const possibleTableNames = ['parameters_value', 'parameter_values', 'meter_data', 'readings'];
    let correctTableName = null;
    
    for (const tableName of possibleTableNames) {
      const tableExists = tablesResult.rows.some(row => row.table_name === tableName);
      if (tableExists) {
        correctTableName = tableName;
        console.log(`✅ Found table: ${tableName}`);
        break;
      }
    }
    
    if (!correctTableName) {
      console.log('❌ No suitable table found');
      return res.json({
        success: false,
        error: 'No suitable data table found',
        availableTables: tablesResult.rows.map(row => row.table_name)
      });
    }
    
    const testQuery = `
      SELECT 
        slave_id,
        COUNT(*) as total_records,
        MIN(reading_timestamp) as earliest_record,
        MAX(reading_timestamp) as latest_record
      FROM ${correctTableName}
      GROUP BY slave_id 
      ORDER BY slave_id
      LIMIT 10
    `;

    const result = await db.query(testQuery);
    
    console.log('🧪 Test Results:');
    result.rows.forEach(row => {
      console.log(`   Slave ID ${row.slave_id}: ${row.total_records} records`);
    });

    res.json({
      success: true,
      message: 'Charge data API test successful',
      availableMeters: result.rows,
      testQuery
    });

  } catch (error) {
    console.error('❌ Error in charge data test:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
