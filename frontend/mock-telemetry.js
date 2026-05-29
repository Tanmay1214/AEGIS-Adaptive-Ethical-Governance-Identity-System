/**
 * AEGIS Frontend Mock Telemetry Spawner (Member 1's Isolated Testing Server)
 * This script runs a mock WebSocket and HTTP server on Port 5000, 
 * simulating active backend inputs to let you animate your Next.js dashboard!
 * Run this with: node mock-telemetry.js (inside /frontend)
 */

const http = require('http');

console.log("====================================================");
console.log("     AEGIS Frontend Visual Telemetry Spawner");
console.log("====================================================\n");

// Simple HTTP Mock Server to handle Next.js fetch requests
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // 1. Mock System Status Endpoint
  if (url.pathname === '/api/system/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      composite_score: 95,
      metrics: { active_consents: 12, bias_suppressions: 1, expired_credentials: 88, decryptions_logged: 2 },
      surveillance_throttle_level: 'NORMAL'
    }));
    console.log("   [HTTP GET] Fetched system status details.");
  }
  
  // 2. Mock Consent Toggle
  else if (url.pathname === '/api/consent/toggle' && req.method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      citizen_id: 'citizen_token_1',
      consented: false,
      active_consents_count: 11,
      trust_score: { composite_score: 92, metrics: { active_consents: 11 }, surveillance_throttle_level: 'NORMAL' }
    }));
    console.log("   [HTTP POST] Simulated Citizen Consent Toggle.");
  }

  // 3. Mock PhantomPass Issuance
  else if (url.pathname === '/api/phantompass/issue' && req.method === 'POST') {
    const expiresAt = new Date(Date.now() + 60000).toISOString(); // 60-second time-lock
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      proof_credential: `zk-proof-resident-valid-mock882f`,
      expires_at: expiresAt,
      nullifier_hash: 'mock_nullifier_abc123'
    }));
    console.log("   [HTTP POST] Issued Mock PhantomPass time-locked credential.");
  }

  // 4. Mock CivicVault Submit
  else if (url.pathname === '/api/civicvault/submit' && req.method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message_id: 'vault_msg_mock991',
      jury_shares_created: [
        { jury_id: 'citizen_jury_1', public_key: 'pub_key_01' },
        { jury_id: 'citizen_jury_2', public_key: 'pub_key_02' },
        { jury_id: 'citizen_jury_3', public_key: 'pub_key_03' }
      ],
      status: 'LOCKED'
    }));
    console.log("   [HTTP POST] Queued Mock CivicVault encrypted report.");
  }

  // 5. Mock CivicVault Co-Signing
  else if (url.pathname === '/api/civicvault/sign' && req.method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message_id: 'vault_msg_mock991',
      collected_signatures_count: 3,
      status: 'UNLOCKED',
      decrypted_content: 'MOCK VERIFIED: Unregistered drone traffic tracking signals intercepted grid node A.'
    }));
    console.log("   [HTTP POST] Simulated CivicVault Co-Sign vote (Consensus met!).");
  }

  // Default Route
  else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Route not found' }));
  }
});

// Create a simple WebSocket simulation
const WebSocket = require('ws');
const wss = new WebSocket.Server({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

wss.on('connection', (ws) => {
  console.log("🔌 Visual Dashboard UI client connected via WebSocket.");

  // Send baseline data immediately
  ws.send(JSON.stringify({
    event: 'trust-score-update',
    composite_score: 95,
    metrics: { active_consents: 12, bias_suppressions: 1, expired_credentials: 88, decryptions_logged: 2 },
    surveillance_throttle_level: 'NORMAL'
  }));

  // Simulate streaming telemetry heartbeats every 4 seconds to animate charts!
  let scoreDirection = -1;
  let score = 95;
  
  const interval = setInterval(() => {
    // Fluctuate score between 40 and 98 to show dynamic colors and blur overrides
    score += (scoreDirection * Math.floor(Math.random() * 8 + 2));
    
    if (score <= 40) {
      score = 40;
      scoreDirection = 1; // Start climbing back
    } else if (score >= 98) {
      score = 98;
      scoreDirection = -1; // Start dropping
    }

    let throttleLevel = 'NORMAL';
    if (score < 50) throttleLevel = 'SHUTDOWN';
    else if (score < 75) throttleLevel = 'DEGRADED';

    // Broadcast score metrics
    ws.send(JSON.stringify({
      event: 'trust-score-update',
      composite_score: score,
      metrics: {
        active_consents: score > 70 ? Math.floor(10 + Math.random()*5) : Math.floor(1 + Math.random()*3),
        bias_suppressions: score < 60 ? Math.floor(8 + Math.random()*4) : Math.floor(1 + Math.random()*2),
        expired_credentials: Math.floor(150 + Math.random()*30),
        decryptions_logged: Math.floor(3 + Math.random()*2)
      },
      surveillance_throttle_level: throttleLevel
    }));

    // Randomly emit bias warning alerts
    if (Math.random() > 0.6) {
      ws.send(JSON.stringify({
        event: 'alert-log',
        type: 'bias_suppression_alert',
        message: `FairWatch suppressed prediction in Zone ${['B','D','E'][Math.floor(Math.random()*3)]} due to High Bias Score (${Math.floor(70 + Math.random()*15)})`,
        timestamp: new Date().toISOString()
      }));
    }
  }, 4000);

  ws.on('close', () => {
    clearInterval(interval);
    console.log("🔌 Visual Dashboard UI client disconnected.");
  });
});

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`AEGIS Frontend Visual Mock Server running on http://localhost:${PORT}`);
  console.log(`WebSocket Mocking Server is online.`);
  console.log(`Next.js Dashboard developers can build and animate UI now!`);
  console.log(`====================================================`);
});
