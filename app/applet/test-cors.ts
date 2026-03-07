import fetch from 'node-fetch';
fetch('https://database.lichess.org/lichess_db_puzzle.csv.zst', { method: 'HEAD' }).then(res => console.log(res.headers.raw()));
