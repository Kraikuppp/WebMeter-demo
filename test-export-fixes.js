// Test the export scheduler fixes
const ExportScheduler = require('./server/services/exportScheduler.js');

async function testExportFixes() {
  console.log('🧪 === TESTING EXPORT SCHEDULER FIXES ===');
  
  // Mock schedule data (similar to what's in database)
  const mockSchedule = {
    id: 33,
    export_type: 'daily',
    export_format: 'excel',
    meters: ['meter-114'],
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
    ],
    read_time: 15 // 15 minutes interval
  };
  
  // Mock data similar to what API returns
  const mockApiData = [
    {
      time: '2025-09-25T17:00:03.423Z',
      reading_timestamp: '2025-09-25T17:00:03.423Z',
      slave_id: 10,
      Frequency: 49.95,
      'Volt AN': 422.8339,
      'Volt BN': 418.3985,
      'Volt CN': 427.8221,
      'Volt LN Avg': 423.0181,
      'Volt AB': 731.9867,
      'Volt BC': 733.6198,
      'Volt CA': 735.5898,
      'Volt LL Avg': 733.7321,
      'Current A': 0,
      'Current B': 1.3964,
      'Current C': 0,
      'Current Avg': 0.4655,
      'Current IN': 1.6127,
      'Watt A': 0,
      'Watt B': -0.0599,
      'Watt C': 0,
      'Watt Total': -0.0599,
      'Var A': 0,
      'Var B': -0.5553,
      'Var C': 0,
      'Var total': -0.5553,
      'VA A': 0,
      'VA B': 0.5846,
      'VA C': 0,
      'VA Total': 0.5846,
      'PF A': 1,
      'PF B': -0.1024,
      'PF C': 1,
      'PF Total': -0.1024,
      'Demand W': -0.0602,
      'Demand Var': -0.557,
      'Demand VA': 0.5845,
      'Import kWh': 16354.4,
      'Export kWh': 24.3,
      'Import kVarh': 1.6,
      'Export kVarh': 4287.6,
      THDV: 1.45,
      THDI: 0
    },
    // Add more records with different timestamps for Read Time testing
    {
      time: '2025-09-25T17:05:03.423Z',
      reading_timestamp: '2025-09-25T17:05:03.423Z',
      slave_id: 10,
      Frequency: 50.01,
      'Volt AN': 423.1,
      'Demand W': -0.0650,
      'Import kWh': 16354.5
    },
    {
      time: '2025-09-25T17:10:03.423Z',
      reading_timestamp: '2025-09-25T17:10:03.423Z',
      slave_id: 10,
      Frequency: 49.98,
      'Volt AN': 422.9,
      'Demand W': -0.0580,
      'Import kWh': 16354.6
    },
    {
      time: '2025-09-25T17:15:03.423Z',
      reading_timestamp: '2025-09-25T17:15:03.423Z',
      slave_id: 10,
      Frequency: 50.02,
      'Volt AN': 423.2,
      'Demand W': -0.0620,
      'Import kWh': 16354.7
    }
  ];
  
  console.log('📊 Mock schedule:', {
    id: mockSchedule.id,
    parameters: mockSchedule.parameters.slice(0, 5) + '... (total: ' + mockSchedule.parameters.length + ')',
    read_time: mockSchedule.read_time
  });
  
  console.log('📊 Mock data:', {
    count: mockApiData.length,
    timeRange: `${mockApiData[0].time} - ${mockApiData[mockApiData.length-1].time}`,
    sampleKeys: Object.keys(mockApiData[0]).slice(0, 10) + '...'
  });
  
  // Test 1: Column matching
  console.log('\n🧪 Test 1: Column Matching');
  console.log('Testing parameter to column mapping:');
  
  const testParameters = ['frequency', 'volt_an', 'demand_w', 'import_kwh'];
  const sampleRow = mockApiData[0];
  
  testParameters.forEach(param => {
    // Simulate the column matching logic
    let value = sampleRow[param];
    let matchedKey = param;
    
    if (value === undefined || value === null) {
      const keys = Object.keys(sampleRow);
      const matchingKey = keys.find(key => 
        key.toLowerCase() === param.toLowerCase() ||
        key.replace(/\s+/g, '_').toLowerCase() === param.replace(/\s+/g, '_').toLowerCase() ||
        key.replace(/_/g, ' ').toLowerCase() === param.replace(/_/g, ' ').toLowerCase()
      );
      
      if (matchingKey) {
        value = sampleRow[matchingKey];
        matchedKey = matchingKey;
      }
    }
    
    console.log(`  "${param}" -> "${matchedKey}" -> ${value}`);
  });
  
  // Test 2: Read Time filtering
  console.log('\n🧪 Test 2: Read Time Filtering');
  
  const scheduler = new ExportScheduler();
  const filteredData = scheduler.filterDataByReadTime(mockApiData, 15);
  
  console.log(`Original data: ${mockApiData.length} records`);
  console.log(`Filtered data: ${filteredData.length} records`);
  console.log('Filtered timestamps:');
  filteredData.forEach((record, index) => {
    console.log(`  ${index + 1}. ${record.reading_timestamp}`);
  });
  
  // Test 3: Excel generation simulation
  console.log('\n🧪 Test 3: Excel Generation Simulation');
  
  try {
    // Test the column mapping for Excel generation
    const excelHeaders = ['Time'];
    if (mockSchedule.parameters && Array.isArray(mockSchedule.parameters)) {
      excelHeaders.push(...mockSchedule.parameters);
    }
    
    console.log(`Excel headers: ${excelHeaders.slice(0, 5).join(', ')}... (total: ${excelHeaders.length})`);
    
    // Test data row generation
    const testRow = filteredData[0];
    const dataRow = [testRow.reading_timestamp];
    
    let successfulMappings = 0;
    let failedMappings = 0;
    
    mockSchedule.parameters.forEach(param => {
      let value = testRow[param];
      let matchedKey = param;
      
      if (value === undefined || value === null) {
        const keys = Object.keys(testRow);
        const matchingKey = keys.find(key => 
          key.toLowerCase() === param.toLowerCase() ||
          key.replace(/\s+/g, '_').toLowerCase() === param.replace(/\s+/g, '_').toLowerCase() ||
          key.replace(/_/g, ' ').toLowerCase() === param.replace(/_/g, ' ').toLowerCase()
        );
        
        if (matchingKey) {
          value = testRow[matchingKey];
          matchedKey = matchingKey;
          successfulMappings++;
        } else {
          failedMappings++;
          value = 'N/A';
        }
      } else {
        successfulMappings++;
      }
      
      dataRow.push(value);
    });
    
    console.log(`Column mapping results:`);
    console.log(`  ✅ Successful: ${successfulMappings}/${mockSchedule.parameters.length}`);
    console.log(`  ❌ Failed: ${failedMappings}/${mockSchedule.parameters.length}`);
    console.log(`  📊 Sample values: [${dataRow.slice(1, 6).join(', ')}...]`);
    
    if (failedMappings === 0) {
      console.log('🎉 All parameters should map correctly - no more N/A values!');
    } else {
      console.log(`⚠️  ${failedMappings} parameters will still show as N/A`);
    }
    
  } catch (error) {
    console.error('❌ Excel generation test failed:', error.message);
  }
  
  console.log('\n🧪 === TEST COMPLETED ===');
  console.log('Expected improvements:');
  console.log('✅ Column names should map correctly (frequency -> Frequency, volt_an -> Volt AN, etc.)');
  console.log('✅ Read Time filtering should reduce data from 1439 to ~96 records (every 15 min)');
  console.log('✅ Excel export should show actual values instead of N/A');
}

// Run the test
testExportFixes().catch(console.error);
