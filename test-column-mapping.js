// Simple test for column mapping logic
console.log('🧪 === TESTING COLUMN MAPPING LOGIC ===');

// Mock data similar to API response
const mockRow = {
  time: '2025-09-25T17:00:03.423Z',
  reading_timestamp: '2025-09-25T17:00:03.423Z',
  slave_id: 10,
  Frequency: 49.95,
  'Volt AN': 422.8339,
  'Volt BN': 418.3985,
  'Volt CN': 427.8221,
  'Volt LN Avg': 423.0181,
  'Current A': 0,
  'Current B': 1.3964,
  'Current C': 0,
  'Current Avg': 0.4655,
  'Demand W': -0.0602,
  'Import kWh': 16354.4,
  'PF Total': -0.1024,
  THDV: 1.45,
  THDI: 0
};

// Schedule parameters that were causing N/A
const scheduleParameters = [
  'frequency', 'volt_an', 'volt_bn', 'volt_cn', 'volt_ln_avg',
  'current_a', 'current_b', 'current_c', 'current_avg',
  'demand_w', 'import_kwh', 'pf_total', 'thdv', 'thdi'
];

console.log('📊 Available columns in data:', Object.keys(mockRow));
console.log('📊 Schedule parameters to map:', scheduleParameters);
console.log('');

console.log('🔍 Testing column mapping:');

let successCount = 0;
let failCount = 0;

scheduleParameters.forEach(param => {
  // Simulate the improved column matching logic
  let value = mockRow[param];
  let matchedKey = param;
  
  if (value === undefined || value === null) {
    // Try exact match with different cases
    const keys = Object.keys(mockRow);
    const matchingKey = keys.find(key => 
      key.toLowerCase() === param.toLowerCase() ||
      key.replace(/\s+/g, '_').toLowerCase() === param.replace(/\s+/g, '_').toLowerCase() ||
      key.replace(/_/g, ' ').toLowerCase() === param.replace(/_/g, ' ').toLowerCase()
    );
    
    if (matchingKey) {
      value = mockRow[matchingKey];
      matchedKey = matchingKey;
    }
  }
  
  if (value !== undefined && value !== null) {
    console.log(`✅ "${param}" -> "${matchedKey}" = ${value}`);
    successCount++;
  } else {
    console.log(`❌ "${param}" -> NOT FOUND -> N/A`);
    failCount++;
  }
});

console.log('');
console.log('📊 === MAPPING RESULTS ===');
console.log(`✅ Successful mappings: ${successCount}/${scheduleParameters.length}`);
console.log(`❌ Failed mappings: ${failCount}/${scheduleParameters.length}`);
console.log(`📈 Success rate: ${Math.round(successCount/scheduleParameters.length*100)}%`);

if (failCount > 0) {
  console.log('');
  console.log('🔍 Failed parameters analysis:');
  scheduleParameters.forEach(param => {
    let value = mockRow[param];
    if (value === undefined || value === null) {
      const keys = Object.keys(mockRow);
      const matchingKey = keys.find(key => 
        key.toLowerCase() === param.toLowerCase() ||
        key.replace(/\s+/g, '_').toLowerCase() === param.replace(/\s+/g, '_').toLowerCase() ||
        key.replace(/_/g, ' ').toLowerCase() === param.replace(/_/g, ' ').toLowerCase()
      );
      
      if (!matchingKey) {
        console.log(`❌ "${param}" - no matching column found`);
        console.log(`   Similar columns: ${keys.filter(k => 
          k.toLowerCase().includes(param.split('_')[0]) || 
          param.split('_')[0].includes(k.toLowerCase().split(' ')[0])
        ).join(', ') || 'none'}`);
      }
    }
  });
}

console.log('');
console.log('🧪 === TEST COMPLETED ===');
