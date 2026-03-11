async function test() {
  const themes = 'mate,fork';
  const count = 10;
  const rating = 1500;
  console.log(`Testing /api/puzzles/batch?theme=${themes}&count=${count}&rating=${rating}`);
  const start = Date.now();
  try {
    const response = await fetch(`http://localhost:3000/api/puzzles/batch?theme=${themes}&count=${count}&rating=${rating}`);
    const end = Date.now();
    console.log(`Status: ${response.status}`);
    console.log(`Time: ${end - start}ms`);
    const result = await response.json();
    console.log(`Result status: ${result.status}`);
    console.log(`Puzzles found: ${result.puzzles?.length || 0}`);
  } catch (e) {
    console.error('Test failed:', e);
  }
}
test();
