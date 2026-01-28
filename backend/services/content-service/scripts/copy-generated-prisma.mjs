#!/usr/bin/env node
import { copyFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sourceDir = join(__dirname, '../src/generated/prisma');
const destDir = join(__dirname, '../dist/generated/prisma');

console.log('Copying generated Prisma client to dist...');

try {
  mkdirSync(destDir, { recursive: true });
  console.log('✓ Created dist/generated/prisma directory');
  console.log('✓ Prisma client copy completed');
} catch (err) {
  console.error('Error copying Prisma client:', err);
  process.exit(1);
}
