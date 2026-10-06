#!/usr/bin/env node
/**
 * Smoke checks for Doctor + User API alignment before E2E.
 * Usage: node scripts/qa-smoke.js
 */
const http = require('http');
const https = require('https');

function get(url) {
  return new Promise(resolve => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { timeout: 8000 }, res => {
      let body = '';
      res.on('data', c => (body += c));
      res.on('end', () =>
        resolve({ status: res.statusCode, body: body.slice(0, 200) }),
      );
    });
    req.on('error', e => resolve({ status: 0, body: String(e.message) }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 0, body: 'timeout' });
    });
  });
}

function post(url, json) {
  return new Promise(resolve => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;
    const data = JSON.stringify(json);
    const req = lib.request(
      {
        hostname: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: u.pathname,
        method: 'POST',
        timeout: 8000,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      res => {
        let body = '';
        res.on('data', c => (body += c));
        res.on('end', () =>
          resolve({ status: res.statusCode, body: body.slice(0, 200) }),
        );
      },
    );
    req.on('error', e => resolve({ status: 0, body: String(e.message) }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 0, body: 'timeout' });
    });
    req.write(data);
    req.end();
  });
}

async function main() {
  const checks = [];
  const add = (name, ok, detail) => checks.push({ name, ok, detail });

  const localHealth = await get('http://localhost:5001/api/health');
  add('Doctor local API health :5001', localHealth.status === 200, localHealth.body);

  const prodHealth = await get('https://backend.medzoos.com/api/health');
  add('Production API health', prodHealth.status === 200, prodHealth.body);

  for (const path of [
    '/partners/doctor/profile',
    '/partners/doctor/appointments',
    '/partners/doctor/stats',
  ]) {
    const r = await get(`http://localhost:5001/api${path}`);
    add(`Auth gate ${path}`, r.status === 401, `status=${r.status}`);
  }

  const labs = await get('http://localhost:5001/api/lab-tests');
  add('Public lab-tests', labs.status === 200, labs.body);

  const login = await post('http://localhost:5001/api/auth/partner/login', {
    portal: 'doctor',
    email: 'not-an-email',
    password: 'x',
  });
  add(
    'Partner login route alive',
    login.status === 400 || login.status === 401,
    `status=${login.status} ${login.body}`,
  );

  // Config drift warning
  add(
    'NOTE: Align User USE_LOCAL_API with Doctor backend before cross-app E2E',
    false,
    'User default=production; Doctor DEV default=localhost:5001',
  );

  console.log('\nQA Smoke Results\n================');
  let failed = 0;
  for (const c of checks) {
    const mark = c.ok ? 'PASS' : 'FAIL/INFO';
    if (!c.ok) failed += 1;
    console.log(`[${mark}] ${c.name}`);
    if (c.detail) console.log(`         ${c.detail}`);
  }
  console.log(`\n${checks.filter(c => c.ok).length}/${checks.length - 1} critical checks passed (excluding alignment note).`);
  process.exit(failed > 1 ? 1 : 0);
}

main();
