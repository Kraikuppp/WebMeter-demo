// Test the final column mapping fix
console.log('🧪 === TESTING FINAL COLUMN MAPPING FIX ===');

// Mock data from API (exactly like the log shows)
const mockRow = {
  time: '2025-09-25T17:00:03.423Z',
  reading_timestamp: '2025-09-25T17:00:03.423Z',
  slave_id: 10,
  Frequency: 49.95,
  param_01_freqency: 49.95,
  'Volt AN': 422.8339,
  param_02_voltage_phase_1: 422.8339,
  'Volt BN': 418.3985,
  param_03_voltage_phase_2: 418.3985,
  'Volt CN': 427.8221,
  param_04_voltage_phase_3: 427.8221,
  'Volt LN Avg': 423.0181,
  param_05_voltage_avg_phase: 423.0181,
  'Volt AB': 731.9867,
  param_06_voltage_line_1_2: 731.9867,
  'Volt BC': 733.6198,
  param_07_voltage_line_2_3: 733.6198,
  'Volt CA': 735.5898,
  param_08_voltage_line_3_1: 735.5898,
  'Volt LL Avg': 733.7321,
  param_09_voltage_avg_line: 733.7321,
  'Current A': 0,
  param_10_current_phase_a: 0,
  'Current B': 1.3964,
  param_11_current_phase_b: 1.3964,
  'Current C': 0,
  param_12_current_phase_c: 0,
  'Current Avg': 0.4655,
  param_13_current_avg_phase: 0.4655,
  'Current IN': 1.6127,
  param_14_current_neutral: 1.6127,
  'Watt A': 0,
  param_15_power_phase_a: 0,
  'Watt B': -0.0599,
  param_16_power_phase_b: -0.0599,
  'Watt C': 0,
  param_17_power_phase_c: 0,
  'Watt Total': -0.0599,
  param_18_power_total_system: -0.0599,
  'Var A': 0,
  param_19_reactive_power_phase_a: 0,
  'Var B': -0.5553,
  param_20_reactive_power_phase_b: -0.5553,
  'Var C': 0,
  param_21_reactive_power_phase_c: 0,
  'Var total': -0.5553,
  param_22_reactive_power_total: -0.5553,
  'VA A': 0,
  param_23_apparent_power_phase_a: 0,
  'VA B': 0.5846,
  param_24_apparent_power_phase_b: 0.5846,
  'VA C': 0,
  param_25_apparent_power_phase_c: 0,
  'VA Total': 0.5846,
  param_26_apparent_power_total: 0.5846,
  'PF A': 1,
  param_27_power_factor_phase_a: 1,
  'PF B': -0.1024,
  param_28_power_factor_phase_b: -0.1024,
  'PF C': 1,
  param_29_power_factor_phase_c: 1,
  'PF Total': -0.1024,
  param_30_power_factor_total: -0.1024,
  'Demand W': -0.0602,
  param_31_power_demand: -0.0602,
  'Demand Var': -0.557,
  param_32_reactive_power_demand: -0.557,
  'Demand VA': 0.5845,
  param_33_apparent_power_demand: 0.5845,
  'Import kWh': 16354.4,
  param_34_import_kwh: 16354.4,
  'Export kWh': 24.3,
  param_35_export_kwh: 24.3,
  'Import kVarh': 1.6,
  param_36_import_kvarh: 1.6,
  'Export kVarh': 4287.6,
  param_37_export_kvarh: 4287.6,
  THDV: 1.45,
  param_38_thdv: 1.45,
  THDI: 0,
  param_39_thdi: 0
};

// Schedule parameters from the export schedule
const scheduleParameters = [
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
];

console.log('📊 Testing column mapping with enhanced parameter mapping...');
console.log('');

// Enhanced parameter mapping (same as in the fix)
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

let successCount = 0;
let failCount = 0;
const results = [];

scheduleParameters.forEach(param => {
  // Simulate the enhanced column matching logic
  let value = mockRow[param];
  let matchedKey = param;
  
  if (value === undefined || value === null) {
    // Try specific mapping first
    const mappedColumnName = parameterMapping[param.toLowerCase()];
    if (mappedColumnName && mockRow[mappedColumnName] !== undefined) {
      value = mockRow[mappedColumnName];
      matchedKey = mappedColumnName;
    } else {
      // Try general matching patterns
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
  }
  
  if (value !== undefined && value !== null && value !== '') {
    console.log(`✅ "${param}" -> "${matchedKey}" = ${value}`);
    successCount++;
    results.push({ param, matchedKey, value, status: 'success' });
  } else {
    console.log(`❌ "${param}" -> NOT FOUND -> N/A`);
    failCount++;
    results.push({ param, matchedKey, value: 'N/A', status: 'failed' });
  }
});

console.log('');
console.log('📊 === FINAL MAPPING RESULTS ===');
console.log(`✅ Successful mappings: ${successCount}/${scheduleParameters.length}`);
console.log(`❌ Failed mappings: ${failCount}/${scheduleParameters.length}`);
console.log(`📈 Success rate: ${Math.round(successCount/scheduleParameters.length*100)}%`);

if (successCount === scheduleParameters.length) {
  console.log('');
  console.log('🎉 PERFECT! All parameters should map correctly!');
  console.log('🎉 No more N/A values in Excel export!');
} else if (successCount > scheduleParameters.length * 0.9) {
  console.log('');
  console.log('✨ EXCELLENT! Over 90% success rate!');
  console.log('✨ Most values should show correctly in Excel export!');
} else {
  console.log('');
  console.log('⚠️  Some parameters still need attention');
}

console.log('');
console.log('📊 Sample Excel row would look like:');
const sampleRow = ['2025-09-25T17:00:03.423Z']; // Time column
results.forEach(result => {
  sampleRow.push(result.value);
});
console.log(`[${sampleRow.slice(0, 10).join(', ')}...]`);

console.log('');
console.log('🧪 === TEST COMPLETED ===');
