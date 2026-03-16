import fs from 'fs';
const code = fs.readFileSync('src/server.ts', 'utf8');
let p = 0, b = 0, c = 0;
const stack = [];
let line = 1;
for(let i=0; i<code.length; i++) {
  if(code[i] === '\n') line++;
  if(code[i] === '(') stack.push({char: '(', line});
  else if(code[i] === ')') {
    if (stack[stack.length-1].char === '(') stack.pop();
  }
  else if(code[i] === '{') stack.push({char: '{', line});
  else if(code[i] === '}') {
    if (stack[stack.length-1].char === '{') stack.pop();
  }
}
console.log(stack);
