
const http = require('http');

console.log("====================================================");
console.log("   AEGIS Core Backend API Integration Test Runner");
console.log("====================================================\n");

const BASE_URL = 'http://localhost:5000';

// Helper to make POST requests using Node's built-in http module
function post(path, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            data: JSON.parse(body)
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: body
          });
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(payload);
    req.end();
  });
}

// Helper to make GET requests
function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE_URL}${path}`, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            data: JSON.parse(body)
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: body
          });
        }
      });
    }).on('error', (e) => reject(e));
  });
}

// Main testing orchestrator
async function runTests() {
  try {
    console.log("⚡ Starting sequential API integration tests...\n");

    // -------------------------------------------------------------
    // Test 1: Fetch Base System Status (Expect high trust score initially)
    // -------------------------------------------------------------
    console.log("⏳ Test 1: Fetching initial system status...");
    const status1 = await get('/api/system/status');
    console.log(`   Initial Composite Score: ${status1.data.composite_score}`);
    console.log(`   Surveillance Throttle State: ${status1.data.surveillance_throttle_level}`);
    if (status1.statusCode === 200 && status1.data.composite_score >= 90) {
      console.log("✅ Test 1 Passed\n");
    } else {
      throw new Error(`Test 1 Failed: Status code ${status1.statusCode}, Score ${status1.data.composite_score}`);
    }

    // -------------------------------------------------------------
    // Test 2: Toggle Citizen Consent (Revocation should drop score)
    // -------------------------------------------------------------
    console.log("⏳ Test 2: Revoking Citizen Consent...");
    const consentRes = await post('/api/consent/toggle', { citizen_id: 'citizen_token_test', consented: false });
    console.log(`   New Active Consent Count: ${consentRes.data.active_consents_count}`);
    console.log(`   Score After Revoke: ${consentRes.data.trust_score.composite_score}`);
    if (consentRes.statusCode === 200 && consentRes.data.consented === false) {
      console.log("✅ Test 2 Passed\n");
    } else {
      throw new Error(`Test 2 Failed`);
    }

    // -------------------------------------------------------------
    // Test 3: PhantomPass Credential Issuance
    // -------------------------------------------------------------
    console.log("⏳ Test 3: Requesting PhantomPass ZK Resident Proof...");
    const zkRes = await post('/api/phantompass/issue', { citizen_id_hash: 'citizen_test_hash', zone_id: 'ZONE_A' });
    console.log(`   Issued Proof: ${zkRes.data.proof_credential}`);
    console.log(`   Expiration: ${zkRes.data.expires_at}`);
    if (zkRes.statusCode === 200 && zkRes.data.proof_credential) {
      console.log("✅ Test 3 Passed\n");
    } else {
      throw new Error(`Test 3 Failed`);
    }

    // -------------------------------------------------------------
    // Test 4: FairWatch AI Bias Report Callback
    // -------------------------------------------------------------
    console.log("⏳ Test 4: Simulating FairWatch Bias Suppression Callback...");
    const biasRes = await post('/api/ai/report-suppression', { zone_id: 'Zone B', prediction_alert: 'Mock alert B', bias_score: 75 });
    console.log(`   New Composite Score: ${biasRes.data.trust_score.composite_score}`);
    console.log(`   Surveillance Throttle State: ${biasRes.data.trust_score.surveillance_throttle_level}`);
    if (biasRes.statusCode === 200) {
      console.log("✅ Test 4 Passed\n");
    } else {
      throw new Error(`Test 4 Failed`);
    }

    // -------------------------------------------------------------
    // Test 5: CivicVault Multi-Party Decryption (3 Signatures)
    // -------------------------------------------------------------
    console.log("⏳ Test 5: Queueing CivicVault Encrypted Report...");
    const submitVault = await post('/api/civicvault/submit', { encrypted_payload: 'encrypted-hazard-payload' });
    const messageId = submitVault.data.message_id;
    console.log(`   Report Queued with ID: ${messageId}`);
    console.log(`   Consensus status: ${submitVault.data.status}`);

    console.log("   - Submitting Juror 1 Signature...");
    await post('/api/civicvault/sign', { message_id: messageId, jury_id: 'citizen_jury_1', secret_share: 'share_01' });

    console.log("   - Submitting Juror 2 Signature...");
    await post('/api/civicvault/sign', { message_id: messageId, jury_id: 'citizen_jury_2', secret_share: 'share_02' });

    console.log("   - Submitting Juror 3 Signature (Expect decryption unlock)...");
    const sign3 = await post('/api/civicvault/sign', { message_id: messageId, jury_id: 'citizen_jury_3', secret_share: 'share_03' });
    console.log(`   Consensus status: ${sign3.data.status}`);
    console.log(`   Decrypted emergency data: "${sign3.data.decrypted_content}"`);

    if (sign3.statusCode === 200 && sign3.data.status === 'UNLOCKED' && sign3.data.decrypted_content) {
      console.log("✅ Test 5 Passed\n");
    } else {
      throw new Error(`Test 5 Failed. Decryption state: ${sign3.data.status}`);
    }

    // -------------------------------------------------------------
    // Test 6: Demo Metric Spike Trigger
    // -------------------------------------------------------------
    console.log("⏳ Test 6: Triggering Live Pitch Demo Stress Spike...");
    const spike = await post('/api/demo/trigger-spike', {});
    console.log(`   Spiked Score: ${spike.data.current_state.composite_score}`);
    console.log(`   Throttling Level: ${spike.data.current_state.surveillance_throttle_level}`);
    if (spike.statusCode === 200 && spike.data.current_state.surveillance_throttle_level === 'SHUTDOWN') {
      console.log("✅ Test 6 Passed\n");
    } else {
      throw new Error(`Test 6 Failed`);
    }

    console.log("====================================================");
    console.log("🎉 SUCCESS: All core backend integration tests passed!");
    console.log("====================================================");

    // Reset database to initial state
    await post('/api/demo/reset', {});

  } catch (error) {
    console.error("\n❌ API Integration Suite Blocked on Failure:");
    console.error(error.message);
    console.log("====================================================");
  }
}

// Run the suite
runTests();
