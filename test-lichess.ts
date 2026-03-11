async function test() {
  const response = await fetch('https://lichess.org/api/puzzle/next?theme=mate', {
    headers: { 'Accept': 'application/json' }
  });
  const puzzle = await response.json();
  console.log('Puzzle:', JSON.stringify(puzzle));
}

test().catch(console.error);
