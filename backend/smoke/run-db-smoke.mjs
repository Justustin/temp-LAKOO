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
  const res = await fetch(url, {
    ...opts,
    redirect: 'manual',
    headers: {
      'content-type': 'application/json',
      'accept': 'application/json',
      ...(opts.headers || {})
    }
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

async function waitForHealth(baseUrl, timeoutMs = 45_000) {
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

function parseDbConnectionTxt() {
  const p = path.join(ROOT, 'DB_Connection.txt');
  const raw = fs.readFileSync(p, 'utf8');
  const lines = raw.split(/\r?\n/);

  /** @type {Record<string,string>} */
  const map = {};
  for (const line of lines) {
    const m = line.match(/psql\s+'([^']+)'/);
    if (m) {
      const url = m[1];
      // the service name is the closest previous non-empty line without "psql"
      // (DB_Connection.txt is formatted as blocks)
      // We'll just assign by DB name suffix for the ones we need.
      const dbMatch = url.match(/\/([^/?]+)\?/);
      if (dbMatch) map[dbMatch[1]] = url;
    }
  }
  return map;
}

function withQueryParam(url, key, value) {
  const u = new URL(url);
  u.searchParams.set(key, value);
  return u.toString();
}

function ensurePgbouncerSafe(url) {
  // Works with Neon pooler URLs. Prisma prefers pgbouncer hints + low connection count.
  let out = url;
  out = withQueryParam(out, 'pgbouncer', 'true');
  out = withQueryParam(out, 'connection_limit', '1');
  return out;
}

function randomSchema(svcName) {
  const rnd = crypto.randomBytes(3).toString('hex');
  return `smoke_${svcName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}_${rnd}`;
}

function gatewayHeaders(gatewayKey, userId, role) {
  return {
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
    'x-service-auth': token,
    'x-service-name': serviceName
  };
}

async function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function runDbSmoke() {
  const dbMap = parseDbConnectionTxt();

  const serviceSecret = process.env.SERVICE_SECRET || 'dev-service-secret';
  const gatewayKey = process.env.GATEWAY_SECRET_KEY || 'dev-gateway-key';

  // Neon URLs present in DB_Connection.txt:
  const paymentBase = dbMap['payment_db'];
  const brandBase = dbMap['brand_db'];
  const logisticBase = dbMap['logistics_db'];
  const warehouseBase = dbMap['warehouse_db'];

  if (!paymentBase || !brandBase || !logisticBase || !warehouseBase) {
    throw new Error('Missing required Neon URLs in DB_Connection.txt (need payment_db, brand_db, logistics_db, warehouse_db).');
  }

  // Address DB isn't listed; derive from the same host/user by swapping db name
  const addressBase = paymentBase.replace(/\/payment_db\?/i, '/address_db?');
  const reviewBase = (dbMap['review_db'] || paymentBase.replace(/\/payment_db\?/i, '/review_db?'));

  const schemas = {
    payment: randomSchema('payment'),
    address: randomSchema('address'),
    brand: randomSchema('brand'),
    logistic: randomSchema('logistic'),
    review: randomSchema('review'),
    warehouse: randomSchema('warehouse')
  };

  const urls = {
    payment: withQueryParam(ensurePgbouncerSafe(paymentBase), 'schema', schemas.payment),
    address: withQueryParam(ensurePgbouncerSafe(addressBase), 'schema', schemas.address),
    brand: withQueryParam(ensurePgbouncerSafe(brandBase), 'schema', schemas.brand),
    logistic: withQueryParam(ensurePgbouncerSafe(logisticBase), 'schema', schemas.logistic),
    review: withQueryParam(ensurePgbouncerSafe(reviewBase), 'schema', schemas.review),
    warehouse: withQueryParam(ensurePgbouncerSafe(warehouseBase), 'schema', schemas.warehouse)
  };

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
      name: 'brand-service',
      cwd: `${ROOT}/backend/services/brand-service`,
      port: 3004,
      env: {
        PORT: '3004',
        NODE_ENV: 'test',
        DATABASE_URL: urls.brand,
        SERVICE_SECRET: serviceSecret,
        SERVICE_NAME: 'brand-service',
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
      name: 'review-service',
      cwd: `${ROOT}/backend/services/review-service`,
      port: 3015,
      env: {
        PORT: '3015',
        NODE_ENV: 'test',
        DATABASE_URL: urls.review,
        SERVICE_SECRET: serviceSecret,
        SERVICE_NAME: 'review-service',
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

  log('\n> DB push (isolated schemas) for all services');
  for (const svc of services) {
    log(`- ${svc.name}: db:push`);
    run('pnpm', ['-s', 'run', 'db:push'], svc.cwd, svc.env);
  }

  log('\n> Build all services');
  for (const svc of services) {
    run('pnpm', ['-s', 'run', 'build'], svc.cwd, svc.env);
  }

  const procs = [];
  try {
    for (const svc of services) {
      procs.push({ svc, child: startProcess(svc.name, 'node', ['dist/index.js'], svc.cwd, svc.env) });
    }

    for (const svc of services) {
      await waitForHealth(`http://localhost:${svc.port}`);
      log(`OK: ${svc.name} healthy`);
    }

    // -------------------------------------------------------------------------
    // Address-service functional tests
    // -------------------------------------------------------------------------
    {
      const base = 'http://localhost:3010';
      const userId = '00000000-0000-0000-0000-000000000001';
      const headers = gatewayHeaders(gatewayKey, userId, 'user');

      const create = await fetchJson(`${base}/api/addresses`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          recipientName: 'Smoke Test',
          phoneNumber: '081234567890',
          streetAddress: 'Jl. Smoke Test No. 1',
          cityName: 'Jakarta',
          provinceName: 'DKI Jakarta',
          postalCode: '10310',
          isDefault: true
        })
      });
      await assert(create.status === 201, `address-service: createAddress expected 201, got ${create.status}`);
      await assert(create.json?.success === true, 'address-service: createAddress expected success=true');
      const addressId = create.json?.data?.id;
      await assert(addressId, 'address-service: createAddress missing data.id');

      const list = await fetchJson(`${base}/api/addresses/user/${userId}`, { headers });
      await assert(list.status === 200, `address-service: list expected 200, got ${list.status}`);
      await assert(Array.isArray(list.json?.data), 'address-service: list expected data array');

      const setDefault = await fetchJson(`${base}/api/addresses/${addressId}/set-default`, {
        method: 'POST',
        headers,
        body: JSON.stringify({})
      });
      await assert(setDefault.status === 200, `address-service: set-default expected 200, got ${setDefault.status}`);
      await assert(setDefault.json?.success === true, 'address-service: set-default expected success=true');

      const def = await fetchJson(`${base}/api/addresses/user/${userId}/default`, { headers });
      await assert(def.status === 200, `address-service: default expected 200, got ${def.status}`);
      await assert(def.json?.data?.id === addressId, 'address-service: default should match set-default address');
    }

    // -------------------------------------------------------------------------
    // Brand-service functional tests
    // -------------------------------------------------------------------------
    {
      const base = 'http://localhost:3004';
      const headers = serviceHeaders('brand-service', serviceSecret);

      const brandCode = `SMOKE-${Date.now()}`;
      const brandName = `Smoke Brand ${Date.now()}`;

      const create = await fetchJson(`${base}/api/brands`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ brandCode, brandName })
      });
      await assert(create.status === 201, `brand-service: createBrand expected 201, got ${create.status}`);
      await assert(create.json?.success === true, 'brand-service: createBrand expected success=true');
      const brandId = create.json?.data?.id;
      await assert(brandId, 'brand-service: createBrand missing data.id');

      const getById = await fetchJson(`${base}/api/brands/${brandId}`);
      await assert(getById.status === 200, `brand-service: getBrandById expected 200, got ${getById.status}`);

      const del = await fetchJson(`${base}/api/brands/${brandId}`, { method: 'DELETE', headers });
      await assert([200, 204].includes(del.status), `brand-service: delete expected 200/204, got ${del.status}`);
    }

    // -------------------------------------------------------------------------
    // Review-service functional tests
    // -------------------------------------------------------------------------
    {
      const base = 'http://localhost:3015';
      const service = serviceHeaders('review-service', serviceSecret);
      const userId = '00000000-0000-0000-0000-000000000011';
      const orderId = '00000000-0000-0000-0000-000000000012';
      const productId = '00000000-0000-0000-0000-000000000013';
      const now = new Date();

      const create = await fetchJson(`${base}/api/reviews/internal/review-requests`, {
        method: 'POST',
        headers: service,
        body: JSON.stringify({
          userId,
          orderId,
          productId,
          productName: 'Smoke Product',
          eligibleAt: now.toISOString(),
          expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          channel: 'email'
        })
      });
      await assert(create.status === 201, `review-service: createReviewRequest expected 201, got ${create.status}`);
      await assert(create.json?.success === true, 'review-service: createReviewRequest expected success=true');

      const userHeaders = gatewayHeaders(gatewayKey, userId, 'user');
      const list = await fetchJson(`${base}/api/reviews/review-requests`, { headers: userHeaders });
      await assert(list.status === 200, `review-service: getReviewRequests expected 200, got ${list.status}`);
    }

    // -------------------------------------------------------------------------
    // Warehouse-service functional tests
    // -------------------------------------------------------------------------
    {
      const base = 'http://localhost:3012';
      const adminId = '00000000-0000-0000-0000-000000000002';
      const headers = gatewayHeaders(gatewayKey, adminId, 'admin');

      const productId = '00000000-0000-0000-0000-000000000010';
      const orderId = '00000000-0000-0000-0000-000000000020';

      const createInv = await fetchJson(`${base}/api/admin/inventory`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          productId,
          sku: 'SMOKE-SKU-1',
          quantity: 10,
          minStockLevel: 2
        })
      });
      await assert([200, 201].includes(createInv.status), `warehouse-service: create inventory expected 200/201, got ${createInv.status}`);

      const status = await fetchJson(`${base}/api/warehouse/inventory/status?productId=${productId}`, { headers });
      await assert(status.status === 200, `warehouse-service: inventory status expected 200, got ${status.status}`);
      await assert(status.json?.success === true, 'warehouse-service: inventory status expected success=true');

      const reserve = await fetchJson(`${base}/api/warehouse/reserve-inventory`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          productId,
          variantId: null,
          quantity: 3,
          orderId
        })
      });
      await assert(reserve.status === 200, `warehouse-service: reserve expected 200, got ${reserve.status}`);
      await assert(reserve.json?.success === true, 'warehouse-service: reserve expected success=true');
      const reservationId = reserve.json?.reservationId;
      await assert(reservationId, 'warehouse-service: reserve missing reservationId');

      const release = await fetchJson(`${base}/api/warehouse/release-reservation`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reservationId, reason: 'smoke_test' })
      });
      await assert(release.status === 200, `warehouse-service: release expected 200, got ${release.status}`);
      await assert(release.json?.success === true, 'warehouse-service: release expected success=true');
    }

    // -------------------------------------------------------------------------
    // Payment-service functional tests
    // -------------------------------------------------------------------------
    {
      const base = 'http://localhost:3007';
      const userId = '00000000-0000-0000-0000-000000000001';
      const orderId = '00000000-0000-0000-0000-000000000100';
      const headers = gatewayHeaders(gatewayKey, userId, 'user');

      // Create payment via internal endpoint (service-to-service)
      const serviceName = 'order-service';
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = crypto
        .createHmac('sha256', serviceSecret)
        .update(`${serviceName}:${timestamp}`)
        .digest('hex');
      const internalHeaders = {
        'x-service-auth': `${serviceName}:${timestamp}:${signature}`,
        'x-service-name': serviceName
      };

      const createPayment = await fetchJson(`${base}/api/payments`, {
        method: 'POST',
        headers: internalHeaders,
        body: JSON.stringify({
          orderId,
          userId,
          amount: 150000,
          paymentMethod: 'bank_transfer',
          idempotencyKey: `smoke-test-${Date.now()}`
        })
      });
      await assert([200, 201].includes(createPayment.status), `payment-service: createPayment expected 200/201, got ${createPayment.status}`);
      await assert(createPayment.json?.success === true, 'payment-service: createPayment expected success=true');
      const paymentId = createPayment.json?.data?.id || createPayment.json?.data?.payment?.id;
      await assert(paymentId, 'payment-service: createPayment missing data.id');

      // Get payment by order ID
      const getByOrder = await fetchJson(`${base}/api/payments/order/${orderId}`, { headers: internalHeaders });
      await assert(getByOrder.status === 200, `payment-service: getByOrder expected 200, got ${getByOrder.status}`);
      await assert(getByOrder.json?.success === true, 'payment-service: getByOrder expected success=true');

      // Get payment by ID
      const getById = await fetchJson(`${base}/api/payments/${paymentId}`, { headers: internalHeaders });
      await assert(getById.status === 200, `payment-service: getById expected 200, got ${getById.status}`);
      await assert(getById.json?.success === true, 'payment-service: getById expected success=true');

      // Get user payments (via gateway auth)
      const getUserPayments = await fetchJson(`${base}/api/payments/user/${userId}`, { headers });
      await assert(getUserPayments.status === 200, `payment-service: getUserPayments expected 200, got ${getUserPayments.status}`);
      await assert(getUserPayments.json?.success === true, 'payment-service: getUserPayments expected success=true');
    }

    // -------------------------------------------------------------------------
    // Logistic-service functional tests
    // -------------------------------------------------------------------------
    {
      const base = 'http://localhost:3009';
      const userId = '00000000-0000-0000-0000-000000000001';
      const orderId = '00000000-0000-0000-0000-000000000200';
      const headers = gatewayHeaders(gatewayKey, userId, 'user');

      // Get available couriers (public endpoint)
      const couriers = await fetchJson(`${base}/api/rates/couriers`);
      await assert(couriers.status === 200, `logistic-service: getCouriers expected 200, got ${couriers.status}`);
      await assert(couriers.json?.success === true, 'logistic-service: getCouriers expected success=true');

      // Create shipment via internal endpoint (service-to-service)
      const serviceName = 'order-service';
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = crypto
        .createHmac('sha256', serviceSecret)
        .update(`${serviceName}:${timestamp}`)
        .digest('hex');
      const internalHeaders = {
        'x-service-auth': `${serviceName}:${timestamp}:${signature}`,
        'x-service-name': serviceName
      };

      const createShipment = await fetchJson(`${base}/api/internal/shipments`, {
        method: 'POST',
        headers: internalHeaders,
        body: JSON.stringify({
          orderId,
          userId,
          courier: 'jne',
          courierName: 'JNE',
          serviceType: 'REG',
          serviceName: 'Regular',
          shippingCost: 15000,
          weightGrams: 500,
          destination: {
            name: 'Smoke Test User',
            phone: '081234567890',
            address: 'Jl. Smoke Test No. 1',
            city: 'Jakarta',
            province: 'DKI Jakarta',
            postalCode: '10310'
          }
        })
      });
      await assert([200, 201].includes(createShipment.status), `logistic-service: createShipment expected 200/201, got ${createShipment.status}`);
      await assert(createShipment.json?.success === true, 'logistic-service: createShipment expected success=true');
      const shipmentId = createShipment.json?.data?.id;
      await assert(shipmentId, 'logistic-service: createShipment missing data.id');

      // Get shipment by order ID (internal)
      const getByOrder = await fetchJson(`${base}/api/internal/shipments/order/${orderId}`, { headers: internalHeaders });
      await assert(getByOrder.status === 200, `logistic-service: getByOrder expected 200, got ${getByOrder.status}`);
      await assert(getByOrder.json?.success === true, 'logistic-service: getByOrder expected success=true');

      // Get user shipments (via gateway auth)
      const getUserShipments = await fetchJson(`${base}/api/shipments/user`, { headers });
      await assert(getUserShipments.status === 200, `logistic-service: getUserShipments expected 200, got ${getUserShipments.status}`);
      await assert(getUserShipments.json?.success === true, 'logistic-service: getUserShipments expected success=true');
    }

    log('\n✅ DB smoke suite passed (brand + review + address + warehouse + payment + logistic flows + db push)');
  } finally {
    log('\nStopping services...');
    for (const { child, svc } of procs) {
      log(`- stopping ${svc.name} (pid=${child.pid})`);
      killProcessTree(child.pid);
    }
  }
}

runDbSmoke().catch((err) => {
  console.error('\n❌ DB smoke suite failed');
  console.error(err?.stack || err);
  process.exitCode = 1;
});

