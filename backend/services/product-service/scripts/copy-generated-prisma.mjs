#!/usr/bin/env node
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const sourceSchema = join(projectRoot, 'prisma', 'schema.prisma');
const targetDir = join(projectRoot, 'src', 'generated');
const targetSchema = join(targetDir, 'schema.prisma');

try {
  // Ensure target directory exists
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  // Copy schema.prisma to src/generated/
  copyFileSync(sourceSchema, targetSchema);
  console.log('✅ Copied schema.prisma to src/generated/');
} catch (error) {
  console.error('❌ Error copying schema.prisma:', error.message);
  process.exit(1);
}
