import { spawn, execFileSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const THIS_FILE = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(THIS_FILE), '..', '..');

function log(msg) {
  process.stdout.write(`${msg}\n`);
}

function run(cmd, args, cwd, env = {}) {
  log(`\n> ${cmd} ${args.join(' ')} (cwd=${cwd})`);
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
  child.on('exit', (code) => {
    log(`[${label}] exited with code ${code}`);
  });
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
      'accept': 'application/json',
      ...(opts.headers || {})
    }
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore (swagger UI is HTML)
  }
  return { status: res.status, headers: res.headers, text, json };
}

async function waitForHealth(baseUrl, timeoutMs = 30_000) {
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

function generateServiceToken(serviceName, secret) {
  // Mirror the shared algorithm: serviceName:timestamp:HMAC_SHA256(secret, `${serviceName}:${timestamp}`)
  const timestamp = Math.floor(Date.now() / 1000);
  const message = `${serviceName}:${timestamp}`;
  const signature = crypto.createHmac('sha256', secret).update(message).digest('hex');
  return `${serviceName}:${timestamp}:${signature}`;
}

function getServiceAuthHeaders(serviceName, secret) {
  const token = generateServiceToken(serviceName, secret);
  return {
    'X-Service-Auth': token,
    'X-Service-Name': serviceName
  };
}

async function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function runSmoke() {
  const serviceSecret = process.env.SERVICE_SECRET || 'dev-service-secret';
  const gatewayKey = process.env.GATEWAY_SECRET_KEY || 'dev-gateway-key';

  const services = [
    {
      name: 'payment-service',
      cwd: `${ROOT}/backend/services/payment-service`,
      port: 3007,
      env: {
        PORT: '3007',
        NODE_ENV: 'test',
        ENABLE_EXPIRATION_CRON: 'false',
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/payment_smoke?schema=public',
        SERVICE_SECRET: serviceSecret,
        SERVICE_NAME: 'payment-service',
        GATEWAY_SECRET_KEY: gatewayKey,
        ALLOWED_ORIGINS: 'http://localhost:3000'
      },
      authProbePath: '/api/payments/__smoke'
    },
    {
      name: 'address-service',
      cwd: `${ROOT}/backend/services/address-service`,
      port: 3010,
      env: {
        PORT: '3010',
        NODE_ENV: 'test',
        ADDRESS_DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/address_smoke?schema=public',
        SERVICE_SECRET: serviceSecret,
        SERVICE_NAME: 'address-service',
        GATEWAY_SECRET_KEY: gatewayKey,
        ALLOWED_ORIGINS: 'http://localhost:3000'
      },
      authProbePath: '/api/addresses/__smoke'
    },
    {
      name: 'logistic-service',
      cwd: `${ROOT}/backend/services/logistic-service`,
      port: 3009,
      env: {
        PORT: '3009',
        NODE_ENV: 'test',
        LOGISTICS_DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/logistic_smoke?schema=public',
        SERVICE_SECRET: serviceSecret,
        SERVICE_NAME: 'logistic-service',
        GATEWAY_SECRET_KEY: gatewayKey,
        ALLOWED_ORIGINS: 'http://localhost:3000'
      },
      authProbePath: '/api/internal/__smoke'
    },
    {
      name: 'warehouse-service',
      cwd: `${ROOT}/backend/services/warehouse-service`,
      port: 3012,
      env: {
        PORT: '3012',
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/warehouse_smoke?schema=public',
        SERVICE_SECRET: serviceSecret,
        SERVICE_NAME: 'warehouse-service',
        GATEWAY_SECRET_KEY: gatewayKey,
        ALLOWED_ORIGINS: 'http://localhost:3000'
      },
      authProbePath: '/api/admin/__smoke'
    }
  ];

  // 1) Build
  for (const svc of services) {
    run('pnpm', ['-s', 'run', 'build'], svc.cwd, svc.env);
  }

  // 2) Start
  const procs = [];
  try {
    for (const svc of services) {
      const child = startProcess(svc.name, 'node', ['dist/index.js'], svc.cwd, svc.env);
      procs.push({ svc, child });
    }

    // 3) Wait for health
    for (const svc of services) {
      const base = `http://localhost:${svc.port}`;
      log(`Waiting for ${svc.name}... ${base}/health`);
      await waitForHealth(base, 45_000);
      log(`OK: ${svc.name} is healthy`);
    }

    // 4) Smoke checks
    const results = [];
    for (const svc of services) {
      const base = `http://localhost:${svc.port}`;
      const name = svc.name;

      // Health
      const h = await fetchJson(`${base}/health`);
      await assert(h.status === 200, `${name}: /health expected 200, got ${h.status}`);

      // Swagger docs endpoint should respond (HTML, often 200)
      const docs = await fetch(`${base}/api-docs`, { redirect: 'manual' });
      await assert(docs.status >= 200 && docs.status < 400, `${name}: /api-docs expected 2xx/3xx, got ${docs.status}`);

      // 404 shape
      const nf = await fetchJson(`${base}/__definitely_not_a_route__`);
      await assert(nf.status === 404, `${name}: 404 test expected 404, got ${nf.status}`);
      await assert(nf.json && nf.json.success === false, `${name}: 404 body should be JSON with success=false`);

      // Auth: without service headers should be 401 on auth-protected prefix
      const unauth = await fetchJson(`${base}${svc.authProbePath}`);
      await assert([401, 403].includes(unauth.status), `${name}: unauth probe expected 401/403, got ${unauth.status}`);

      // Auth: with service token headers should NOT be 401/403 (likely 404 because route doesn't exist)
      const svcHeaders = getServiceAuthHeaders(svc.env.SERVICE_NAME, serviceSecret);
      const authed = await fetchJson(`${base}${svc.authProbePath}`, { headers: svcHeaders });
      await assert(![401, 403].includes(authed.status), `${name}: authed probe expected not 401/403, got ${authed.status}`);

      results.push({ name, ok: true });
    }

    log('\n✅ Smoke suite passed for all services');
    for (const r of results) log(`- ${r.name}: OK`);
  } finally {
    // 5) Cleanup
    log('\nStopping services...');
    for (const { child, svc } of procs) {
      log(`- stopping ${svc.name} (pid=${child.pid})`);
      killProcessTree(child.pid);
    }
  }
}

runSmoke().catch((err) => {
  console.error('\n❌ Smoke suite failed');
  console.error(err?.stack || err);
  process.exitCode = 1;
});

