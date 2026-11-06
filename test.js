const http = require('http');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Test runner for Whiskey Vault
async function runTests() {
  console.log('🧪 Starting Whiskey Vault Backend Tests...\n');
  const app = require('./app');
  
  // Wait for server to be ready
  await new Promise(r => setTimeout(r, 600));

  const BASE_URL = 'http://localhost:3000';

  // Helper function for HTTP requests
  function makeRequest(method, endpoint, headers = {}, body = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, BASE_URL);
      const req = http.request(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, headers: res.headers, data });
          }
        });
      });
      req.on('error', reject);
      if (body) {
        if (typeof body === 'string') req.write(body);
        else req.write(JSON.stringify(body));
      }
      req.end();
    });
  }

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    const health = await makeRequest('GET', '/api/health');
    assert(health.status === 200 && health.data.status === 'healthy', 'Health check responds with 200 OK & healthy');

    // 2. Stats
    const stats = await makeRequest('GET', '/api/stats');
    assert(stats.status === 200 && stats.data.success === true, 'Stats endpoint returns valid vault metrics');
    assert(stats.data.stats.totalVaultItems >= 4, 'Stats reflects seed whiskey items');

    // 3. Search initial records
    const search = await makeRequest('GET', '/api/search');
    assert(search.status === 200 && Array.isArray(search.data), 'Search returns array of records');
    assert(search.data.length >= 4, 'Initial search returns seeded rare bottles/casks');

    // 4. Signup test
    const testEmail = `test_${Date.now()}@whiskeyvault.com`;
    const signup = await makeRequest('POST', '/api/signup', {}, {
      name: 'Master Distiller',
      email: testEmail,
      password: 'SecureWhiskeyPassword2026!'
    });
    assert(signup.status === 200 && signup.data.success && signup.data.token, 'Signup creates user and returns JWT token');
    const token = signup.data.token;

    // 5. Login test
    const login = await makeRequest('POST', '/api/login', {}, {
      email: testEmail,
      password: 'SecureWhiskeyPassword2026!'
    });
    assert(login.status === 200 && login.data.success && login.data.token, 'Login succeeds with valid credentials');

    // 6. Test /api/me with token
    const me = await makeRequest('GET', '/api/me', {
      'Authorization': `Bearer ${token}`
    });
    assert(me.status === 200 && me.data.user.email === testEmail, 'Protected /api/me validates JWT token');

    // 7. Multipart File Upload Test
    const form = new FormData();
    form.append('title', 'Karuizawa 1965 Single Cask #8852 - Master Blender Certificate');
    form.append('category', 'Certificate of Authenticity');
    form.append('distillery', 'Karuizawa Distillery, Nagano');
    form.append('vintage', '1965 (50yo)');
    form.append('caskNumber', 'Sherry Butt #8852');
    form.append('description', 'Authentic single cask bottling from the closed legendary Karuizawa distillery in Japan. Verified bottle #24 of 65.');
    form.append('tags', 'Japanese Whisky, Karuizawa, 1965, Single Cask, Rare, Closed Distillery');
    form.append('file', Buffer.from('Mock PDF content for Karuizawa 1965 Certificate of Origin and Spectrometer Assay'), {
      filename: 'karuizawa_1965_certificate.pdf',
      contentType: 'application/pdf'
    });

    const uploadRes = await new Promise((resolve, reject) => {
      const url = new URL('/api/upload', BASE_URL);
      const req = http.request(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          ...form.getHeaders()
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, data });
          }
        });
      });
      req.on('error', reject);
      form.pipe(req);
    });

    assert(uploadRes.status === 200 && uploadRes.data.success && uploadRes.data.doc.txHash, 'Upload authenticates file, creates IPFS CID and Ethereum tx hash');

    // 8. Test single document fetch
    const doc0 = await makeRequest('GET', '/api/document/0');
    assert(doc0.status === 200 && doc0.data.success && doc0.data.doc.title.includes('Macallan'), 'Single document lookup retrieves Macallan record');

    // 9. Verify newly uploaded record appears in search
    const updatedSearch = await makeRequest('GET', '/api/search');
    const karuizawaRecord = updatedSearch.data.find(r => r.title && r.title.includes('Karuizawa'));
    assert(Boolean(karuizawaRecord), 'Search immediately returns newly uploaded Karuizawa record');

    console.log(`\n========================================`);
    console.log(`Summary: ${passed} passed, ${failed} failed.`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
