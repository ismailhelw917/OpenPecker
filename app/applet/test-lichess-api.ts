import https from 'https';

https.get('https://lichess.org/api/puzzle/next?theme=mateIn2', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
});
