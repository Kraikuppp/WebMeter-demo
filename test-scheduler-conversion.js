// Test the meter ID to slave_id conversion logic from exportScheduler.js
// This simulates the exact logic used in the export scheduler

async function testMeterIdConversion() {
  console.log('🧪 === TESTING METER ID CONVERSION LOGIC ===');
  
  // Simulate the schedule data that causes the problem
  const testSchedule = {
    id: 33,
    export_type: 'daily',
    export_format: 'excel',
    meters: ['meter-114'],  // This is what's stored in the database
    parameters: [
      'frequency', 'volt_an', 'volt_bn', 'volt_cn', 'volt_ln_avg',
      'volt_ab', 'volt_bc', 'volt_ca', 'volt_ll_avg',
      'current_a', 'current_b', 'current_c', 'current_avg', 'current_in',
      'watt_a', 'watt_b', 'watt_c', 'watt_total',
      'var_a', 'var_b', 'var_c', 'var_total',
      'va_a', 'va_b', 'va_c', 'va_total',
      'pf_a', 'pf_b', 'pf_c', 'pf_total',
      'demand_w', 'demand_var', 'demand_va',
      'import_kwh', 'export_kwh', 'import_kvarh', 'export_kvarh',
      'thdv', 'thdi'
    ]
  };
  
  // Simulate the meter list that should be returned from the API
  const mockMeterList = [
    {
      id: "meter-107",
      name: "Main Incomming",
      slave_id: 1,
      location: "Main Building > Building A > Floor 1"
    },
    {
      id: "meter-108", 
      name: "Car Charger 1rd",
      slave_id: 2,
      location: "Main Building > Building A > Floor 1"
    },
    {
      id: "meter-114",
      name: "Supppor Room 3FL NO.10",
      slave_id: 10,  // This is the correct mapping
      location: "Main Building > Building A > Floor 3"
    }
  ];
  
  console.log('📊 Test Schedule:', {
    id: testSchedule.id,
    meters: testSchedule.meters,
    metersType: typeof testSchedule.meters
  });
  
  // Step 1: Parse meters from schedule (same as exportScheduler.js)
  let slaveIds = [];
  
  try {
    console.log(`🔍 Raw meters data:`, testSchedule.meters, typeof testSchedule.meters);
    const parsedMeters = Array.isArray(testSchedule.meters) ? 
      testSchedule.meters : JSON.parse(testSchedule.meters);
    console.log(`🔍 Parsed meters:`, parsedMeters);
    
    if (Array.isArray(parsedMeters) && parsedMeters.length > 0) {
      slaveIds = parsedMeters.map(meter => {
        console.log(`🔍 Processing meter:`, meter, typeof meter);
        if (typeof meter === 'string' && meter.startsWith('meter-')) {
          console.log(`🔍 Keeping ${meter} as meter ID for slave_id lookup`);
          return meter;
        }
        return meter;
      });
      console.log(`🔍 Initial slaveIds:`, slaveIds);
    }
  } catch (parseError) {
    console.error(`❌ Error parsing schedule data:`, parseError);
  }
  
  // Step 2: Check if conversion is needed
  console.log(`🔍 === CHECKING IF CONVERSION IS NEEDED ===`);
  console.log(`🔍 slaveIds before conversion check:`, slaveIds);
  slaveIds.forEach((id, index) => {
    console.log(`🔍 slaveId[${index}]: "${id}" (type: ${typeof id}, startsWith meter-: ${typeof id === 'string' && id.startsWith('meter-')})`);
  });
  
  const needsConversion = slaveIds.some(id => typeof id === 'string' && id.startsWith('meter-'));
  console.log(`🔍 Needs conversion: ${needsConversion}`);
  
  // Step 3: Perform conversion using mock data
  if (needsConversion) {
    console.log(`🔍 === METER ID TO SLAVE_ID CONVERSION ===`);
    console.log(`🔍 Using mock meter list for conversion...`);
    console.log(`🔍 Available meters:`, mockMeterList);
    
    // Convert meter IDs to slave_ids (same logic as exportScheduler.js)
    const originalSlaveIds = [...slaveIds];
    slaveIds = slaveIds.map(meterId => {
      if (typeof meterId === 'string' && meterId.startsWith('meter-')) {
        const meter = mockMeterList.find(m => m.id === meterId);
        if (meter && meter.slave_id) {
          console.log(`🔍 Converting ${meterId} -> slave_id: ${meter.slave_id}`);
          return parseInt(meter.slave_id);
        } else {
          console.log(`❌ Meter ${meterId} not found in meterList, keeping as-is`);
          return meterId;
        }
      }
      return meterId;
    });
    
    console.log(`🔍 Conversion results:`);
    console.log(`  Before: ${originalSlaveIds}`);
    console.log(`  After:  ${slaveIds}`);
    
    // Show final conversion results
    console.log(`🎯 === FINAL SLAVE_ID MAPPING RESULTS ===`);
    slaveIds.forEach((slaveId, index) => {
      console.log(`🎯 Meter ${index + 1} -> slave_id: ${slaveId} (type: ${typeof slaveId})`);
    });
    console.log(`🎯 Ready to query database with these slave_ids`);
  }
  
  // Step 4: Test the final API call parameters
  console.log(`\n🚀 === FINAL API CALL PARAMETERS ===`);
  const apiParams = {
    dateFrom: '2025-09-26',
    dateTo: '2025-09-26', 
    timeFrom: '00:00',
    timeTo: '23:59',
    columns: ['Frequency', 'Volt AN', 'Demand W', 'Import kWh'],
    slaveIds: slaveIds
  };
  
  console.log('🚀 API Parameters:', apiParams);
  
  // Build the actual query string that would be sent
  const queryParams = new URLSearchParams({
    dateFrom: apiParams.dateFrom,
    dateTo: apiParams.dateTo,
    timeFrom: apiParams.timeFrom,
    timeTo: apiParams.timeTo,
  });
  
  apiParams.columns.forEach(col => {
    queryParams.append('columns', col);
  });
  
  apiParams.slaveIds.forEach(slaveId => {
    queryParams.append('slaveIds', slaveId.toString());
  });
  
  const finalUrl = `http://localhost:3001/api/table-data?${queryParams.toString()}`;
  console.log('🔗 Final API URL:', finalUrl);
  
  // Check the results
  console.log(`\n✅ === CONVERSION TEST RESULTS ===`);
  if (slaveIds.includes(10)) {
    console.log('✅ SUCCESS: meter-114 was correctly converted to slave_id: 10');
    console.log('✅ The export scheduler should now find data for this meter');
  } else {
    console.log('❌ FAILED: meter-114 was not converted to slave_id: 10');
    console.log('❌ Current slaveIds:', slaveIds);
  }
  
  console.log('🧪 === TEST COMPLETED ===');
}

// Run the test
testMeterIdConversion().catch(console.error);
