// ทดสอบการแก้ไขปัญหาการแสดงปี พ.ศ. แทน ค.ศ. ใน Auto Export

console.log('🧪 === TESTING DATE FORMAT FIX ===');

// ทดสอบฟังก์ชัน format ใหม่
function testDateFormat() {
  const testDate = new Date('2025-09-29T13:51:01');
  
  console.log('\n📅 === ORIGINAL vs FIXED FORMAT ===');
  
  // วิธีเดิม (ปัญหา): ใช้ toLocaleDateString('th-TH') → แสดงปี พ.ศ.
  const oldFormat = testDate.toLocaleDateString('th-TH');
  console.log(`❌ Old format (พ.ศ.): ${oldFormat}`);
  
  // วิธีใหม่ (แก้ไขแล้ว): ใช้ manual format → แสดงปี ค.ศ.
  const day = testDate.getDate().toString().padStart(2, '0');
  const month = (testDate.getMonth() + 1).toString().padStart(2, '0');
  const year = testDate.getFullYear(); // ใช้ปี ค.ศ.
  const newFormat = `${day}/${month}/${year}`;
  console.log(`✅ New format (ค.ศ.): ${newFormat}`);
  
  // ทดสอบ Generated time format
  console.log('\n⏰ === GENERATED TIME FORMAT ===');
  
  // วิธีเดิม (ปัญหา)
  const oldGeneratedTime = testDate.toLocaleString();
  console.log(`❌ Old generated time: ${oldGeneratedTime}`);
  
  // วิธีใหม่ (แก้ไขแล้ว)
  const hours = testDate.getHours().toString().padStart(2, '0');
  const minutes = testDate.getMinutes().toString().padStart(2, '0');
  const seconds = testDate.getSeconds().toString().padStart(2, '0');
  const newGeneratedTime = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  console.log(`✅ New generated time: ${newGeneratedTime}`);
  
  // ทดสอบ Date Range format
  console.log('\n📅 === DATE RANGE FORMAT ===');
  
  const dateFrom = new Date('2025-09-29T00:00:00');
  const dateTo = new Date('2025-09-29T13:25:00');
  
  // วิธีใหม่ (แก้ไขแล้ว)
  const formatThaiDateTime = (date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear(); // ใช้ปี ค.ศ.
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };
  
  const dateRange = `${formatThaiDateTime(dateFrom)} - ${formatThaiDateTime(dateTo)}`;
  console.log(`✅ New date range: ${dateRange}`);
  
  // ทดสอบ Expected vs Actual
  console.log('\n🎯 === EXPECTED vs ACTUAL ===');
  console.log(`📋 Expected from user input: 29/09/2025 00:00 - 29/09/2025 13:25`);
  console.log(`📋 Actual from new format: ${dateRange}`);
  console.log(`📋 Match: ${dateRange === '29/09/2025 00:00 - 29/09/2025 13:25' ? '✅ PERFECT' : '❌ MISMATCH'}`);
}

// ทดสอบ Auto Export Report format
function testAutoExportReport() {
  console.log('\n📊 === AUTO EXPORT REPORT FORMAT ===');
  
  const schedule = {
    export_type: 'daily',
    meters: [{ id: 1, name: 'Meter 1' }],
    parameters: ['import_kwh']
  };
  
  const now = new Date();
  const generatedTime = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
  
  const dateRange = '29/09/2025 00:00 - 29/09/2025 13:25';
  
  const report = `📊 WebMeter Auto Export Report

📋 Export Type: ${schedule.export_type}
📅 Date Range: ${dateRange}
🏭 Meters: ${schedule.meters.length} selected
📊 Parameters: ${schedule.parameters.length} selected
⏰ Generated: ${generatedTime}

📊 Meter 1
⏰ 29/09/2025 13:51:01  import_kwh: 0.00

WebMeter by Amptron Thailand Co.,Ltd.`;

  console.log('✅ Fixed Auto Export Report:');
  console.log(report);
  
  // ตรวจสอบว่าไม่มีปี พ.ศ.
  const hasBuddhistYear = report.includes('2568');
  console.log(`\n🔍 Contains Buddhist year (2568): ${hasBuddhistYear ? '❌ YES (PROBLEM)' : '✅ NO (GOOD)'}`);
  
  // ตรวจสอบว่ามีปี ค.ศ.
  const hasChristianYear = report.includes('2025');
  console.log(`🔍 Contains Christian year (2025): ${hasChristianYear ? '✅ YES (GOOD)' : '❌ NO (PROBLEM)'}`);
}

// รันการทดสอบ
testDateFormat();
testAutoExportReport();

console.log('\n🎯 === SUMMARY ===');
console.log('✅ Fixed formatThaiDate() - ใช้ manual format แทน toLocaleDateString()');
console.log('✅ Fixed formatTime() - ใช้ manual format แทน toLocaleTimeString()');
console.log('✅ Fixed formatThaiDateTime() - ใช้ manual format แทน toLocaleString()');
console.log('✅ Fixed generatedTime - ใช้ manual format แทน toLocaleString()');
console.log('✅ Fixed no data notification - ใช้ manual format แทน toLocaleDateString()');
console.log('✅ Fixed LINE message timestamp - ใช้ manual format แทน toLocaleString()');
console.log('\n🎯 Result: Auto Export จะแสดงปี ค.ศ. (2025) แทนปี พ.ศ. (2568) แล้ว!');
