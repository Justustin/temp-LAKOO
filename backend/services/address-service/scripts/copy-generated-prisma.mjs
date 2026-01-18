import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceRoot = path.resolve(__dirname, '..');
const srcGenerated = path.join(serviceRoot, 'src', 'generated', 'prisma');
const distGenerated = path.join(serviceRoot, 'dist', 'generated', 'prisma');

if (!fs.existsSync(srcGenerated)) {
  console.error(
    `[address-service] Prisma generated client not found at: ${srcGenerated}\n` +
      `Run "prisma generate" before building.`
  );
  process.exit(1);
}

fs.mkdirSync(path.dirname(distGenerated), { recursive: true });

// Node 18+ supports fs.cpSync. If you ever need Node 16 support, replace with a manual recursive copy.
fs.cpSync(srcGenerated, distGenerated, { recursive: true, force: true });

console.log(`[address-service] Copied Prisma client: ${srcGenerated} -> ${distGenerated}`);

