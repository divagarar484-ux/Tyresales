const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');
console.log('Total lines:', lines.length);

lines.forEach((line, i) => {
  if (/\btier[s]?\b/i.test(line)) {
    console.log(TIER MISMATCH Line : );
  }
  if (/stats/i.test(line) && line.includes('id=')) {
    console.log(STATS Line : );
  }
});
