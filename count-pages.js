const fs = require('fs');

const buffer = fs.readFileSync('downloaded-from-db.pdf');
const content = buffer.toString('binary');
const matches = content.match(/\/Type\s*\/Page\b/g);
console.log("Number of pages in downloaded-from-db.pdf:", matches ? matches.length : 0);
