import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.resolve(__dirname, '../src/generated/prisma');
const destDir = path.resolve(__dirname, '../dist/generated/prisma');

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) {
    console.error(`Source directory does not exist: ${src}`);
    process.exit(1);
  }

  fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log(`Copying Prisma client: ${srcDir} -> ${destDir}`);
copyDirSync(srcDir, destDir);
console.log('Prisma client copied successfully.');

