#!/usr/bin/env node
import { copyFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

async function copyGeneratedPrisma() {
  try {
    const srcDir = join(rootDir, 'src', 'generated', 'prisma');
    const distDir = join(rootDir, 'dist', 'generated', 'prisma');

    // Create target directory
    await mkdir(distDir, { recursive: true });

    // Copy all JS files
    const files = [
      'index.js',
      'default.js',
      'edge.js'
    ];

    for (const file of files) {
      try {
        await copyFile(join(srcDir, file), join(distDir, file));
        console.log(`✓ Copied ${file}`);
      } catch (err) {
        // File might not exist, skip
        console.log(`  Skipped ${file}`);
      }
    }

    console.log('✓ Generated Prisma client copied to dist');
  } catch (error) {
    console.error('Error copying Prisma client:', error);
    process.exit(1);
  }
}

copyGeneratedPrisma();
