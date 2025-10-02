// ทดสอบปัญหา timeTo fallback ที่ทำให้ได้ 23:59 แทน 14:19

console.log('🧪 === TESTING TIMETO FALLBACK ISSUE ===');

// จำลองสถานการณ์ต่างๆ ของ timeTo
const testCases = [
  { name: 'Normal case', timeTo: '14:19' },
  { name: 'Empty string', timeTo: '' },
  { name: 'Null', timeTo: null },
  { name: 'Undefined', timeTo: undefined },
  { name: 'Zero string', timeTo: '0' },
  { name: 'False', timeTo: false }
];

console.log('\n📊 === TESTING FALLBACK BEHAVIOR ===');

testCases.forEach(testCase => {
  const result = testCase.timeTo || '23:59';
  const isProblematic = result === '23:59' && testCase.timeTo !== '23:59';
  
  console.log(`\n🔍 Test: ${testCase.name}`);
  console.log(`   Input: ${testCase.timeTo} (type: ${typeof testCase.timeTo})`);
  console.log(`   Result: ${result}`);
  console.log(`   Problematic: ${isProblematic ? '❌ YES' : '✅ NO'}`);
});

// ทดสอบสถานการณ์จริงจาก log
console.log('\n🎯 === REAL SCENARIO FROM LOG ===');
console.log('UI shows: timeTo = "14:19"');
console.log('But backend receives: timeToStr = "23:59"');
console.log('This suggests timeTo is falsy when creating schedule');

// ทดสอบ solution ใหม่
console.log('\n✅ === TESTING NEW SOLUTION ===');

const getCurrentTime = () => {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
};

testCases.forEach(testCase => {
  const oldResult = testCase.timeTo || '23:59';
  const newResult = testCase.timeTo || getCurrentTime();
  
  console.log(`\n🔍 Test: ${testCase.name}`);
  console.log(`   Input: ${testCase.timeTo}`);
  console.log(`   Old fallback: ${oldResult}`);
  console.log(`   New fallback: ${newResult}`);
  console.log(`   Better: ${newResult !== '23:59' && testCase.timeTo !== '23:59' ? '✅ YES' : '❌ NO'}`);
});

// แสดงสาเหตุที่เป็นไปได้
console.log('\n🤔 === POSSIBLE CAUSES ===');
console.log('1. timeTo state is not properly initialized');
console.log('2. timeTo becomes empty/null during component lifecycle');
console.log('3. Race condition between UI update and schedule creation');
console.log('4. State update timing issue');

console.log('\n💡 === RECOMMENDED DEBUGGING ===');
console.log('1. Add debug log right before schedule creation');
console.log('2. Check timeTo value and type');
console.log('3. Verify state initialization in useState');
console.log('4. Check if timeTo is being reset somewhere');

console.log('\n🎯 === EXPECTED BEHAVIOR ===');
console.log('User selects: 14:19');
console.log('UI log shows: timeTo = "14:19"');
console.log('Schedule creation: time_to = "14:19"');
console.log('Backend receives: timeToStr = "14:19"');
console.log('Report shows: 00:00 - 14:19 ✅');
