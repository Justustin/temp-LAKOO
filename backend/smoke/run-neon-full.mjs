import { spawn, execFileSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const THIS_FILE = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(THIS_FILE), '..', '..');

function log(msg) {
  process.stdout.write(`${msg}\n`);
}

function run(cmd, args, cwd, env = {}) {
  execFileSync(cmd, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });
}

function startProcess(label, cmd, args, cwd, env = {}) {
  log(`\n> START ${label}: ${cmd} ${args.join(' ')}`);
  const child = spawn(cmd, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });
  child.on('exit', (code) => log(`[${label}] exited with code ${code}`));
  return child;
}

function killProcessTree(pid) {
  if (!pid) return;
  try {
    if (process.platform === 'win32') {
      execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      process.kill(pid, 'SIGTERM');
    }
  } catch {
    // ignore
  }
}

async function fetchJson(url, opts = {}) {
  const headers = {
    'accept': 'application/json',
    ...(opts.headers || {})
  };

  const res = await fetch(url, {
    ...opts,
    redirect: 'manual',
    headers
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore
  }
  return { status: res.status, json, text };
}

async function waitForHealth(baseUrl, timeoutMs = 60_000) {
  const start = Date.now();
  const url = `${baseUrl}/health`;
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: 'manual' });
      if (res.ok) return;
    } catch {
      // ignore
    }
    await sleep(500);
  }
  throw new Error(`Timeout waiting for health: ${url}`);
}

async function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function uuidv4() {
  // RFC4122 v4
  const b = crypto.randomBytes(16);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = b.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function parseDbConnectionTxt() {
  const p = path.join(ROOT, 'DB_Connection.txt');
  const raw = fs.readFileSync(p, 'utf8');
  const lines = raw.split(/\r?\n/);

  /** @type {Record<string,string>} */
  const map = {};
  for (const line of lines) {
    const m = line.match(/psql\s+'([^']+)'/);
    if (!m) continue;
    const url = m[1];
    const dbMatch = url.match(/\/([^/?]+)\?/);
    if (dbMatch) map[dbMatch[1]] = url;
  }
  return map;
}

function withQueryParam(url, key, value) {
  const u = new URL(url);
  u.searchParams.set(key, value);
  return u.toString();
}

function neonPoolerSafe(url) {
  // Neon pooler + Prisma: prefer pgbouncer + low connection count
  let out = url;
  out = withQueryParam(out, 'pgbouncer', 'true');
  out = withQueryParam(out, 'connection_limit', '1');
  out = withQueryParam(out, 'sslmode', 'require');
  return out;
}

function randomSchema(prefix) {
  const rnd = crypto.randomBytes(3).toString('hex');
  return `smoke_${prefix}_${Date.now()}_${rnd}`;
}

function gatewayHeaders(gatewayKey, userId, role) {
  return {
    'content-type': 'application/json',
    'x-gateway-key': gatewayKey,
    'x-user-id': userId,
    'x-user-role': role
  };
}

function serviceHeaders(serviceName, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const message = `${serviceName}:${timestamp}`;
  const signature = crypto.createHmac('sha256', secret).update(message).digest('hex');
  const token = `${serviceName}:${timestamp}:${signature}`;
  return {
    'content-type': 'application/json',
    'X-Service-Auth': token,
    'X-Service-Name': serviceName
  };
}

async function runNeonFull() {
  const dbMap = parseDbConnectionTxt();

  // NOTE: we never print the full URLs (they contain secrets)
  const paymentBase = dbMap['payment_db'];
  // address_db may not be listed in DB_Connection.txt; derive from another Neon pooler URL if needed
  const addressBase = dbMap['address_db'] || (paymentBase ? paymentBase.replace(/\/payment_db\?/i, '/address_db?') : undefined);
  const logisticBase = dbMap['logistics_db'];
  const warehouseBase = dbMap['warehouse_db'];

  if (!paymentBase || !addressBase || !logisticBase || !warehouseBase) {
    throw new Error('DB_Connection.txt must include psql URLs for payment_db, address_db, logistics_db, warehouse_db.');
  }

  const serviceSecret = process.env.SERVICE_SECRET || 'dev-service-secret';
  const gatewayKey = process.env.GATEWAY_SECRET_KEY || 'dev-gateway-key';

  const schemaMode = (process.env.SMOKE_SCHEMA_MODE || 'isolated').toLowerCase();
  const schemas =
    schemaMode === 'public'
      ? { payment: 'public', address: 'public', logistic: 'public', warehouse: 'public' }
      : {
          payment: randomSchema('payment'),
          address: randomSchema('address'),
          logistic: randomSchema('logistic'),
          warehouse: randomSchema('warehouse')
        };

  const urls = {
    payment: withQueryParam(neonPoolerSafe(paymentBase), 'schema', schemas.payment),
    address: withQueryParam(neonPoolerSafe(addressBase), 'schema', schemas.address),
    logistic: withQueryParam(neonPoolerSafe(logisticBase), 'schema', schemas.logistic),
    warehouse: withQueryParam(neonPoolerSafe(warehouseBase), 'schema', schemas.warehouse)
  };

  log('Using Neon DBs with isolated schemas (safe to run repeatedly):');
  log(`- payment_db schema=${schemas.payment}`);
  log(`- address_db schema=${schemas.address}`);
  log(`- logistics_db schema=${schemas.logistic}`);
  log(`- warehouse_db schema=${schemas.warehouse}`);

  const services = [
    {
      name: 'payment-service',
      cwd: `${ROOT}/backend/services/payment-service`,
      port: 3007,
      env: {
        PORT: '3007',
        NODE_ENV: 'test',
        ENABLE_EXPIRATION_CRON: 'false',
        DATABASE_URL: urls.payment,
        SERVICE_SECRET: serviceSecret,
        SERVICE_NAME: 'payment-service',
        GATEWAY_SECRET_KEY: gatewayKey,
        ALLOWED_ORIGINS: 'http://localhost:3000'
      }
    },
    {
      name: 'address-service',
      cwd: `${ROOT}/backend/services/address-service`,
      port: 3010,
      env: {
        PORT: '3010',
        NODE_ENV: 'test',
        ADDRESS_DATABASE_URL: urls.address,
        SERVICE_SECRET: serviceSecret,
        SERVICE_NAME: 'address-service',
        GATEWAY_SECRET_KEY: gatewayKey,
        ALLOWED_ORIGINS: 'http://localhost:3000'
      }
    },
    {
      name: 'logistic-service',
      cwd: `${ROOT}/backend/services/logistic-service`,
      port: 3009,
      env: {
        PORT: '3009',
        NODE_ENV: 'test',
        LOGISTICS_DATABASE_URL: urls.logistic,
        SERVICE_SECRET: serviceSecret,
        SERVICE_NAME: 'logistic-service',
        GATEWAY_SECRET_KEY: gatewayKey,
        ALLOWED_ORIGINS: 'http://localhost:3000'
      }
    },
    {
      name: 'warehouse-service',
      cwd: `${ROOT}/backend/services/warehouse-service`,
      port: 3012,
      env: {
        PORT: '3012',
        NODE_ENV: 'test',
        DATABASE_URL: urls.warehouse,
        SERVICE_SECRET: serviceSecret,
        SERVICE_NAME: 'warehouse-service',
        GATEWAY_SECRET_KEY: gatewayKey,
        ALLOWED_ORIGINS: 'http://localhost:3000'
      }
    }
  ];

  log('\n> DB push for all services (into smoke schemas)');
  for (const svc of services) run('pnpm', ['-s', 'run', 'db:push'], svc.cwd, svc.env);

  log('\n> Build all services');
  for (const svc of services) run('pnpm', ['-s', 'run', 'build'], svc.cwd, svc.env);

  const procs = [];
  try {
    for (const svc of services) procs.push({ svc, child: startProcess(svc.name, 'node', ['dist/index.js'], svc.cwd, svc.env) });
    for (const svc of services) await waitForHealth(`http://localhost:${svc.port}`);

    // -----------------------------------------------------------------------
    // ADDRESS-SERVICE: happy path coverage
    // -----------------------------------------------------------------------
    {
      const base = 'http://localhost:3010';
      const userId = uuidv4();
      const hUser = gatewayHeaders(gatewayKey, userId, 'user');

      // auth required for addresses
      const unauthList = await fetchJson(`${base}/api/addresses/user/${userId}`);
      await assert([401, 403].includes(unauthList.status), `address: unauth should be 401/403, got ${unauthList.status}`);

      const create = await fetchJson(`${base}/api/addresses`, {
        method: 'POST',
        headers: hUser,
        body: JSON.stringify({
          recipientName: 'Neon Smoke',
          phoneNumber: '081234567890',
          streetAddress: 'Jl. Neon Smoke 1',
          cityName: 'Jakarta',
          provinceName: 'DKI Jakarta',
          postalCode: '10310',
          isDefault: true
        })
      });
      await assert(create.status === 201, `address: create expected 201, got ${create.status}`);
      const addressId = create.json?.data?.id;
      await assert(addressId, 'address: create missing data.id');

      // Create a second address so delete is allowed (service prevents deleting the only address)
      const create2 = await fetchJson(`${base}/api/addresses`, {
        method: 'POST',
        headers: hUser,
        body: JSON.stringify({
          recipientName: 'Neon Smoke 2',
          phoneNumber: '081234567891',
          streetAddress: 'Jl. Neon Smoke 2',
          cityName: 'Jakarta',
          provinceName: 'DKI Jakarta',
          postalCode: '10310',
          isDefault: false
        })
      });
      await assert(create2.status === 201, `address: create(2) expected 201, got ${create2.status}`);

      const getById = await fetchJson(`${base}/api/addresses/${addressId}`, { headers: hUser });
      await assert(getById.status === 200, `address: get by id expected 200, got ${getById.status}`);

      const list = await fetchJson(`${base}/api/addresses/user/${userId}`, { headers: hUser });
      await assert(list.status === 200, `address: list expected 200, got ${list.status}`);

      const def = await fetchJson(`${base}/api/addresses/user/${userId}/default`, { headers: hUser });
      await assert(def.status === 200, `address: default expected 200, got ${def.status}`);

      const patch = await fetchJson(`${base}/api/addresses/${addressId}`, {
        method: 'PATCH',
        headers: hUser,
        body: JSON.stringify({ label: 'Home' })
      });
      await assert(patch.status === 200, `address: patch expected 200, got ${patch.status}`);

      const setDef = await fetchJson(`${base}/api/addresses/${addressId}/set-default`, {
        method: 'POST',
        headers: hUser,
        body: JSON.stringify({})
      });
      await assert(setDef.status === 200, `address: set-default expected 200, got ${setDef.status}`);

      const del = await fetchJson(`${base}/api/addresses/${addressId}`, { method: 'DELETE', headers: hUser });
      await assert([200, 204].includes(del.status), `address: delete expected 200/204, got ${del.status}`);
    }

    // -----------------------------------------------------------------------
    // WAREHOUSE-SERVICE: happy path coverage (inventory + reserve + release)
    // -----------------------------------------------------------------------
    {
      const base = 'http://localhost:3012';
      const adminId = uuidv4();
      const hAdmin = gatewayHeaders(gatewayKey, adminId, 'admin');

      const productId = uuidv4();
      const orderId = uuidv4();

      // admin: create inventory
      const createInv = await fetchJson(`${base}/api/admin/inventory`, {
        method: 'POST',
        headers: hAdmin,
        body: JSON.stringify({
          productId,
          sku: `SMOKE-SKU-${Date.now()}`,
          quantity: 10,
          minStockLevel: 2
        })
      });
      await assert([200, 201].includes(createInv.status), `warehouse: create inventory expected 200/201, got ${createInv.status}`);

      // public/internal route: inventory status
      const invStatus = await fetchJson(`${base}/api/warehouse/inventory/status?productId=${productId}`, { headers: hAdmin });
      await assert(invStatus.status === 200, `warehouse: inventory status expected 200, got ${invStatus.status}`);

      // internal auth: reserve + release using service token headers
      const hSvc = serviceHeaders('order-service', serviceSecret);

      const reserve = await fetchJson(`${base}/api/warehouse/reserve-inventory`, {
        method: 'POST',
        headers: hSvc,
        body: JSON.stringify({ productId, variantId: null, quantity: 3, orderId })
      });
      await assert(reserve.status === 200, `warehouse: reserve expected 200, got ${reserve.status}`);
      await assert(reserve.json?.reserved === true, 'warehouse: reserve expected reserved=true');
      const reservationId = reserve.json?.reservationId;
      await assert(reservationId, 'warehouse: reserve missing reservationId');

      const release = await fetchJson(`${base}/api/warehouse/release-reservation`, {
        method: 'POST',
        headers: hSvc,
        body: JSON.stringify({ reservationId, reason: 'smoke_test' })
      });
      await assert(release.status === 200, `warehouse: release expected 200, got ${release.status}`);
      await assert(release.json?.success === true, 'warehouse: release expected success=true');
    }

    // -----------------------------------------------------------------------
    // PAYMENT-SERVICE: endpoint coverage (no external gateway calls)
    // -----------------------------------------------------------------------
    {
      const base = 'http://localhost:3007';
      const userId = uuidv4();
      const hUser = gatewayHeaders(gatewayKey, userId, 'user');
      const hAdmin = gatewayHeaders(gatewayKey, userId, 'admin');

      // create payment with invalid body => 400 (covers validation stack without hitting Xendit)
      const badCreate = await fetchJson(`${base}/api/payments`, { method: 'POST', headers: hUser, body: JSON.stringify({}) });
      await assert(badCreate.status === 400, `payment: bad create expected 400, got ${badCreate.status}`);

      // webhook with missing token => 403
      const badWebhook = await fetchJson(`${base}/api/webhooks/xendit/invoice`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: 'x', status: 'PAID' })
      });
      await assert([401, 403].includes(badWebhook.status), `payment: bad webhook expected 401/403, got ${badWebhook.status}`);

      // admin route: must be admin
      const adminListAsUser = await fetchJson(`${base}/api/admin/payments?page=1&limit=1`, { headers: hUser });
      await assert([401, 403].includes(adminListAsUser.status), `payment: admin as user expected 401/403, got ${adminListAsUser.status}`);

      const adminListAsAdmin = await fetchJson(`${base}/api/admin/payments?page=1&limit=1`, { headers: hAdmin });
      await assert([200, 400].includes(adminListAsAdmin.status), `payment: admin list expected 200/400, got ${adminListAsAdmin.status}`);
    }

    // -----------------------------------------------------------------------
    // LOGISTIC-SERVICE: endpoint coverage (avoid external Biteship calls)
    // -----------------------------------------------------------------------
    {
      const base = 'http://localhost:3009';
      const userId = uuidv4();
      const hUser = gatewayHeaders(gatewayKey, userId, 'user');
      const hAdmin = gatewayHeaders(gatewayKey, userId, 'admin');
      const hSvc = serviceHeaders('order-service', serviceSecret);

      // internal create shipment with invalid body => 400
      const badInternal = await fetchJson(`${base}/api/internal/shipments`, { method: 'POST', headers: hSvc, body: JSON.stringify({}) });
      await assert([400, 422].includes(badInternal.status), `logistic: internal bad body expected 400/422, got ${badInternal.status}`);

      // user route requires auth
      const userShipments = await fetchJson(`${base}/api/shipments/user`, { headers: hUser });
      await assert([200, 400].includes(userShipments.status), `logistic: user shipments expected 200/400, got ${userShipments.status}`);

      // admin route requires admin
      const adminShipments = await fetchJson(`${base}/api/admin/shipments`, { headers: hAdmin });
      await assert([200, 400].includes(adminShipments.status), `logistic: admin shipments expected 200/400, got ${adminShipments.status}`);
    }

    log('\n✅ Neon full sweep passed (all services booted, DB schemas pushed, endpoints covered)');
  } finally {
    log('\nStopping services...');
    for (const { child, svc } of procs) {
      log(`- stopping ${svc.name} (pid=${child.pid})`);
      killProcessTree(child.pid);
    }
  }
}

runNeonFull().catch((err) => {
  console.error('\n❌ Neon full sweep failed');
  console.error(err?.stack || err);
  process.exitCode = 1;
});

