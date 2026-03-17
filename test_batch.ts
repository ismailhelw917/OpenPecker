
import fetch from 'node-fetch';

async function test() {
  const baseUrl = 'http://localhost:3000';
  
  const endpoints = [
    '/api/test',
    '/api/puzzles/batch?theme=skewer&count=5&minRating=0&maxRating=3000&color=both'
  ];
  
  for (const endpoint of endpoints) {
    const url = `${baseUrl}${endpoint}`;
    console.log('Testing URL:', url);
    
    try {
      const response = await fetch(url);
      console.log('Status:', response.status);
      const text = await response.text();
      console.log('Response body:', text.substring(0, 200));
    } catch (err) {
      console.error('Error:', err);
    }
    console.log('---');
  }
}

test();
