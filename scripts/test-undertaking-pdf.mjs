import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const PDFDocument = require("pdfkit");

const appId = "test-app";
const sigDir = path.join(process.cwd(), "public", "uploads", appId, "signatures");
await mkdir(sigDir, { recursive: true });
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);
const sigPath = path.join(sigDir, "sig.png");
await writeFile(sigPath, png);

const uploadDir = path.join(process.cwd(), "public", "uploads", appId, "undertaking");
await mkdir(uploadDir, { recursive: true });
const fileName = `undertaking_test.pdf`;
const fullPath = path.join(uploadDir, fileName);

await new Promise((resolve, reject) => {
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  doc.on("end", async () => {
    await writeFile(fullPath, Buffer.concat(chunks));
    resolve();
  });
  doc.on("error", reject);
  doc.fontSize(16).font("Helvetica-Bold").text("TEST");
  doc.image(png, { fit: [200, 80] });
  doc.end();
});

console.log("OK", fullPath);
