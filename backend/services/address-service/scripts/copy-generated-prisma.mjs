import fs from 'node:fs';
import path from 'node:path';

/**
 * Copy Prisma client output from src/generated/prisma -> dist/generated/prisma
 * Needed because Prisma generates JS files that tsc does not copy to dist automatically.
 */
const projectRoot = process.cwd();
const srcPath = path.join(projectRoot, 'src', 'generated', 'prisma');
const distPath = path.join(projectRoot, 'dist', 'generated', 'prisma');

console.log(`Copying Prisma client: ${srcPath} -> ${distPath}`);

if (!fs.existsSync(srcPath)) {
  console.error(`Source Prisma client directory not found: ${srcPath}`);
  process.exit(1);
}

fs.mkdirSync(distPath, { recursive: true });
fs.cpSync(srcPath, distPath, { recursive: true });

console.log('Prisma client copied successfully.');
