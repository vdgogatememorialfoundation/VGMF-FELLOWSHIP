const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

async function run() {
  const bytes = fs.readFileSync('downloaded-from-db.pdf');
  const pdfDoc = await PDFDocument.load(bytes);
  console.log("Pages:", pdfDoc.getPageCount());
}
run();
