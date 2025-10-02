const fetch = require('node-fetch');

// Test function to check export scheduler functionality
async function testExportScheduler() {
  console.log('🧪 === TESTING EXPORT SCHEDULER ===');
  
  try {
    // Test 1: Check available meters API
    console.log('📋 Test 1: Checking available meters API...');
    const metersResponse = await fetch('http://localhost:3001/api/meter-tree/available-meters');
    console.log('📊 API Response status:', metersResponse.status, metersResponse.statusText);
    
    if (metersResponse.ok) {
      const metersData = await metersResponse.json();
      console.log('✅ Available meters API working');
      console.log('📊 Found meters:', metersData.data?.count || 0);
      
      if (metersData.data?.meters) {
        // Find meter-114 to check slave_id mapping
        const meter114 = metersData.data.meters.find(m => m.id === 'meter-114');
        if (meter114) {
          console.log('🔍 Found meter-114:', {
            id: meter114.id,
            name: meter114.name,
            slave_id: meter114.slave_id,
            location: meter114.location
          });
          
          if (meter114.slave_id === 10) {
            console.log('✅ meter-114 correctly mapped to slave_id: 10');
          } else {
            console.log('❌ meter-114 has wrong slave_id:', meter114.slave_id, 'expected: 10');
          }
        } else {
          console.log('❌ meter-114 not found in available meters');
        }
        
        // Show sample meters
        console.log('📊 Sample meters:');
        metersData.data.meters.slice(0, 3).forEach(meter => {
          console.log(`  - ${meter.id} (${meter.name}) -> slave_id: ${meter.slave_id}`);
        });
      }
    } else {
      console.log('❌ Available meters API failed');
    }
    
    // Test 2: Test meter ID to slave_id conversion logic
    console.log('\n📋 Test 2: Testing meter ID conversion logic...');
    const testMeterIds = ['meter-114', 'meter-107', 'meter-108'];
    
    if (metersResponse.ok) {
      const metersData = await metersResponse.json();
      if (metersData.success && metersData.data?.meters) {
        const meterList = metersData.data.meters;
        
        console.log('🔄 Converting meter IDs to slave_ids:');
        const convertedSlaveIds = testMeterIds.map(meterId => {
          const meter = meterList.find(m => m.id === meterId);
          if (meter && meter.slave_id) {
            console.log(`  ✅ ${meterId} -> slave_id: ${meter.slave_id}`);
            return parseInt(meter.slave_id);
          } else {
            console.log(`  ❌ ${meterId} not found or no slave_id`);
            return meterId;
          }
        });
        
        console.log('📊 Final converted slave_ids:', convertedSlaveIds);
        
        // Check if meter-114 was converted to 10
        const meter114Index = testMeterIds.indexOf('meter-114');
        if (meter114Index !== -1 && convertedSlaveIds[meter114Index] === 10) {
          console.log('✅ meter-114 successfully converted to slave_id: 10');
        } else {
          console.log('❌ meter-114 conversion failed');
        }
      }
    }
    
    // Test 3: Test table-data API with slave_id 10
    console.log('\n📋 Test 3: Testing table-data API with slave_id 10...');
    const testParams = new URLSearchParams({
      dateFrom: '2025-09-26',
      dateTo: '2025-09-26',
      timeFrom: '00:00',
      timeTo: '23:59',
      columns: 'Frequency',
      columns: 'Volt AN',
      columns: 'Demand W',
      columns: 'Import kWh',
      slaveIds: '10'  // Use slave_id 10 instead of meter-114
    });
    
    const tableDataUrl = `http://localhost:3001/api/table-data?${testParams.toString()}`;
    console.log('🔗 Testing URL:', tableDataUrl);
    
    const tableDataResponse = await fetch(tableDataUrl);
    console.log('📊 Table-data API status:', tableDataResponse.status, tableDataResponse.statusText);
    
    if (tableDataResponse.ok) {
      const tableData = await tableDataResponse.json();
      console.log('✅ Table-data API working');
      console.log('📊 Data count:', tableData.data ? tableData.data.length : 0);
      
      if (tableData.data && tableData.data.length > 0) {
        console.log('✅ Found data for slave_id 10');
        console.log('📊 Sample record:', tableData.data[0]);
      } else {
        console.log('⚠️ No data found for slave_id 10 on 2025-09-26');
        console.log('💡 This might be normal if there\'s no data for that date');
      }
    } else {
      console.log('❌ Table-data API failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  console.log('\n🧪 === TEST COMPLETED ===');
}

// Run the test if server is available
testExportScheduler().catch(console.error);
