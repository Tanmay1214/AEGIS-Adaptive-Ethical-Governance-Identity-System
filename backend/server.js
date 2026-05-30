const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

// Import Member 4's Cryptographic Utility Library (Zero Conflict!)
const cryptoEngine = require('./src/crypto/engine');

const app = express();
app.use(cors());
app.use(express.json());

// Serve Static UI Frontend Files directly from Express (Port 5000)
app.use(express.static(path.join(__dirname, '../frontend')));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// In-Memory "Database"
const defaultPredictions = [
  {
    inference_id: "INF-9821",
    zone_id: "ZONE_A_CENTRAL",
    confidence: "89.4%",
    fairness_score: 85,
    status: "PASSED",
    prediction_alert: "Predicted elevated assault alert near grid coordinates.",
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    bias_metrics: { income_disparity: 0.15, demographic_parity_diff: 0.10 }
  },
  {
    inference_id: "INF-9822",
    zone_id: "ZONE_B_GRID",
    confidence: "74.2%",
    fairness_score: 48,
    status: "SUPPRESSED",
    prediction_alert: "Predicted elevated theft alert near grid coordinates.",
    timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    bias_metrics: { income_disparity: 0.45, demographic_parity_diff: 0.50 }
  },
  {
    inference_id: "INF-9823",
    zone_id: "ZONE_C_METRO",
    confidence: "91.7%",
    fairness_score: 92,
    status: "PASSED",
    prediction_alert: "Predicted elevated property alert near grid coordinates.",
    timestamp: new Date(Date.now() - 3600000 * 1.0).toISOString(),
    bias_metrics: { income_disparity: 0.10, demographic_parity_diff: 0.05 }
  },
  {
    inference_id: "INF-9824",
    zone_id: "ZONE_D_OUTPOST",
    confidence: "63.1%",
    fairness_score: 56,
    status: "SUPPRESSED",
    prediction_alert: "Predicted elevated property alert near grid coordinates.",
    timestamp: new Date(Date.now() - 3600000 * 0.5).toISOString(),
    bias_metrics: { income_disparity: 0.35, demographic_parity_diff: 0.45 }
  }
];

const db = {
  activeConsents: new Set(['citizen_token_1', 'citizen_token_2']),
  phantomCredentials: [],
  civicVaultMessages: {},
  biasSuppressions: [],
  predictions: [...defaultPredictions],
  trustScore: {
    composite_score: 95,
    metrics: {
      active_consents: 2,
      bias_suppressions: 0,
      expired_credentials: 12,
      decryptions_logged: 0
    },
    surveillance_throttle_level: 'NORMAL' // NORMAL, DEGRADED, SHUTDOWN
  }
};

// Trust Score calculation logic
function calculateTrustScore() {
  const consents = db.activeConsents.size;
  const suppressions = db.biasSuppressions.length;
  const decryptions = Object.values(db.civicVaultMessages).filter(m => m.status === 'UNLOCKED').length;
  
  let score = 90 + (consents * 3) - (suppressions * 5) + (decryptions * 4);
  score = Math.max(0, Math.min(100, Math.round(score)));

  db.trustScore.composite_score = score;
  db.trustScore.metrics.active_consents = consents;
  db.trustScore.metrics.bias_suppressions = suppressions;
  db.trustScore.metrics.decryptions_logged = decryptions;

  if (score < 50) {
    db.trustScore.surveillance_throttle_level = 'SHUTDOWN'; // Face Recognition Blackout
  } else if (score <= 75) {
    db.trustScore.surveillance_throttle_level = 'DEGRADED';  // Throttled surveillance
  } else {
    db.trustScore.surveillance_throttle_level = 'NORMAL';
  }

  return db.trustScore;
}

// -------------------------------------------------------------
// WebSocket Live Feed Broadcast
// -------------------------------------------------------------
io.on('connection', (socket) => {
  console.log(`Connected client: ${socket.id}`);
  socket.emit('trust-score-update', db.trustScore);

  socket.on('disconnect', () => {
    console.log(`Disconnected client: ${socket.id}`);
  });
});

setInterval(() => {
  const randomDelta = Math.random() > 0.5 ? 1 : -1;
  const currentVal = db.trustScore.metrics.expired_credentials;
  db.trustScore.metrics.expired_credentials = Math.max(0, currentVal + (Math.random() > 0.7 ? randomDelta : 0));
  
  const scoreData = calculateTrustScore();
  io.emit('trust-score-update', scoreData);
}, 5000);

function broadcastAlert(type, message) {
  const alertPayload = {
    type,
    message,
    timestamp: new Date().toISOString()
  };
  io.emit('alert-log', alertPayload);
  console.log(`[ALERT] ${type}: ${message}`);
}

// -------------------------------------------------------------
// REST API Routes
// -------------------------------------------------------------

// JWT Secure Authentication Endpoint (Integrates with landing UI)
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  console.log(`[AUTH] Login request for: ${username}`);
  
  // Accepts any non-empty username/password credentials for hackathon agility!
  if (username && password) {
    res.json({ 
      success: true,
      access_token: "mock-jwt-token-for-aegis-core-admin",
      user: { username, unit: "CODE_BLOODED" }
    });
  } else {
    res.status(401).json({ error: "Access Denied: Invalid Operator ID or Passcode" });
  }
});

app.get('/api/system/status', (req, res) => {
  res.json(calculateTrustScore());
});

app.post('/api/consent/toggle', (req, res) => {
  const { citizen_id, consented } = req.body;
  if (!citizen_id) {
    return res.status(400).json({ error: 'citizen_id is required' });
  }

  if (consented) {
    db.activeConsents.add(citizen_id);
    broadcastAlert('consent_opt_in', `Citizen dynamic consent activated in Zone A.`);
  } else {
    db.activeConsents.delete(citizen_id);
    broadcastAlert('consent_opt_out', `Citizen dynamic consent revoked. Walkout buffer triggered.`);
  }

  res.json({ 
    citizen_id, 
    consented, 
    active_consents_count: db.activeConsents.size, 
    trust_score: calculateTrustScore() 
  });
});

// PhantomPass Endpoint calling Member 4's helper
app.post('/api/phantompass/issue', (req, res) => {
  const { citizen_id_hash, zone_id, duration_seconds = 3600 } = req.body;
  
  if (!citizen_id_hash || !zone_id) {
    return res.status(400).json({ error: 'citizen_id_hash and zone_id are required' });
  }

  // Call Member 4's crypto engine:
  const credential = cryptoEngine.generateZkToken(citizen_id_hash, zone_id, duration_seconds);

  db.phantomCredentials.push({
    ...credential,
    zone_id,
    active: true
  });

  broadcastAlert('phantompass_issued', `ZK residency credential issued for ${zone_id} (Expires in ${duration_seconds}s).`);
  res.json(credential);
});

// CivicVault Submit Endpoint calling Member 4's helper
app.post('/api/civicvault/submit', (req, res) => {
  const { encrypted_payload, required_signatures = 3, total_jury_pool = 5 } = req.body;

  if (!encrypted_payload) {
    return res.status(400).json({ error: 'encrypted_payload is required' });
  }

  const messageId = `vault_msg_${Math.floor(100 + Math.random() * 900)}`;
  
  // Call Member 4's key splitter utility:
  const juryShares = cryptoEngine.splitMessageKey(encrypted_payload, required_signatures, total_jury_pool);

  db.civicVaultMessages[messageId] = {
    message_id: messageId,
    encrypted_payload,
    decrypted_content: `EMERGENCY ALERT: "${encrypted_payload}"`,
    required_signatures,
    collected_shares: {},
    signatures: [],
    status: 'LOCKED'
  };

  broadcastAlert('civicvault_submitted', `Encrypted message ${messageId} queued in CivicVault. Awaiting 3-of-5 jury co-sign.`);
  
  res.json({
    message_id: messageId,
    jury_shares_created: juryShares.map(j => ({ jury_id: j.jury_id, public_key: j.public_key, secret_share: j.secret_share })),
    status: 'LOCKED'
  });
});

// CivicVault Sign Endpoint calling Member 4's helper
app.post('/api/civicvault/sign', (req, res) => {
  const { message_id, jury_id, signature, secret_share } = req.body;

  if (!message_id || !jury_id || !secret_share) {
    return res.status(400).json({ error: 'message_id, jury_id, and secret_share are required' });
  }

  const message = db.civicVaultMessages[message_id];
  if (!message) {
    return res.status(404).json({ error: 'Message not found' });
  }

  if (message.status === 'UNLOCKED') {
    return res.json({
      message_id,
      collected_signatures_count: message.signatures.length,
      status: 'UNLOCKED',
      decrypted_content: message.decrypted_content
    });
  }

  // Record the jury signature and key share
  if (!message.collected_shares[jury_id]) {
    message.collected_shares[jury_id] = secret_share;
    message.signatures.push({ jury_id, signature, timestamp: new Date().toISOString() });
    broadcastAlert('civicvault_signed', `Jury member ${jury_id} co-signed report ${message_id}.`);
  }

  // Call Member 4's reconstructor:
  const reconstruction = cryptoEngine.reconstructMessageKey(message, message.collected_shares);
  
  if (reconstruction.status === 'UNLOCKED') {
    message.status = 'UNLOCKED';
    broadcastAlert('civicvault_unlocked', `Consensus unlocked for message ${message_id}! Decrypted alert released.`);
    calculateTrustScore();
  }

  res.json({
    message_id,
    collected_signatures_count: Object.keys(message.collected_shares).length,
    status: message.status,
    decrypted_content: message.status === 'UNLOCKED' ? message.decrypted_content : null
  });
});

app.get('/api/civicvault/latest', (req, res) => {
  const keys = Object.keys(db.civicVaultMessages);
  if (keys.length === 0) {
    return res.json({ message_id: null });
  }
  const latestKey = keys[keys.length - 1];
  res.json(db.civicVaultMessages[latestKey]);
});

app.post('/api/ai/report-suppression', (req, res) => {
  const { zone_id, prediction_alert, bias_score } = req.body;

  db.biasSuppressions.push({
    zone_id,
    prediction_alert,
    bias_score,
    timestamp: new Date().toISOString()
  });

  // Also record in db.predictions for the dynamic UI
  const prediction = {
    inference_id: `INF-${Math.floor(9000 + Math.random() * 999)}`,
    zone_id: zone_id || 'ZONE_B_GRID',
    confidence: "74.2%", // Pinned representative mock confidence for this raw suppression call
    fairness_score: 100 - (bias_score || 58),
    status: 'SUPPRESSED',
    prediction_alert: prediction_alert || 'Demographic bias profiling suppressed',
    bias_metrics: {
      income_disparity: (bias_score || 58) / 200,
      demographic_parity_diff: (bias_score || 58) / 200
    },
    timestamp: new Date().toISOString()
  };
  db.predictions.push(prediction);
  io.emit('new-prediction', prediction);

  broadcastAlert('bias_suppression_alert', `FairWatch suppressed prediction in ${zone_id || 'Zone B'} due to High Bias Score (${bias_score || 58})`);
  calculateTrustScore();

  res.json({ success: true, trust_score: db.trustScore });
});

app.get('/api/ai/predictions', (req, res) => {
  res.json({
    predictions: db.predictions,
    suppressions: db.biasSuppressions
  });
});

app.post('/api/ai/report-prediction', (req, res) => {
  const { inference_id, zone_id, confidence, fairness_score, status, prediction_alert, bias_metrics, income_level, predominant_race } = req.body;
  
  const prediction = {
    inference_id: inference_id || `INF-${Math.floor(9000 + Math.random() * 999)}`,
    zone_id: zone_id || 'ZONE_B_GRID',
    confidence: typeof confidence === 'number' ? `${(confidence * 100).toFixed(1)}%` : (confidence || "80.0%"),
    fairness_score: fairness_score || 100,
    status: status || 'PASSED',
    prediction_alert: prediction_alert || 'Inference run completed',
    bias_metrics: bias_metrics || { income_disparity: 0.1, demographic_parity_diff: 0.1 },
    income_level,
    predominant_race,
    timestamp: new Date().toISOString()
  };

  db.predictions.push(prediction);

  // If suppressed, also add to biasSuppressions and broadcast alert
  if (prediction.status === 'SUPPRESSED') {
    db.biasSuppressions.push({
      zone_id: prediction.zone_id,
      prediction_alert: prediction.prediction_alert,
      bias_score: 100 - prediction.fairness_score,
      timestamp: prediction.timestamp
    });
    broadcastAlert('bias_suppression_alert', `FairWatch suppressed prediction in ${prediction.zone_id} due to High Bias Score (${100 - prediction.fairness_score})`);
  } else {
    broadcastAlert('bias_audit_passed', `FairWatch audit passed for prediction in ${prediction.zone_id}. Fairness: ${prediction.fairness_score}/100.`);
  }

  const scoreData = calculateTrustScore();
  io.emit('trust-score-update', scoreData);
  io.emit('new-prediction', prediction);

  res.json({ success: true, prediction, trust_score: db.trustScore });
});

app.post('/api/demo/trigger-spike', (req, res) => {
  db.activeConsents.clear();
  // Simulate a massive demographic bias profiling spike across multiple zones (11 suppressions)
  for (let i = 0; i < 10; i++) {
    const zone = `Zone ${String.fromCharCode(65 + (i % 6))}`;
    const biasScore = 75 + (i % 15);
    const timestamp = new Date().toISOString();

    db.biasSuppressions.push({ 
      zone_id: zone, 
      prediction_alert: `Forecast ${String.fromCharCode(65 + (i % 6))}`, 
      bias_score: biasScore, 
      timestamp: timestamp 
    });

    const prediction = {
      inference_id: `INF-${9900 + i}`,
      zone_id: zone,
      confidence: `${(60 + (i * 3))}%`,
      fairness_score: 100 - biasScore,
      status: 'SUPPRESSED',
      prediction_alert: `Forecast ${String.fromCharCode(65 + (i % 6))}`,
      bias_metrics: { income_disparity: biasScore / 200, demographic_parity_diff: biasScore / 200 },
      timestamp: timestamp
    };
    db.predictions.push(prediction);
    io.emit('new-prediction', prediction);
  }

  const scoreData = calculateTrustScore();
  io.emit('trust-score-update', scoreData);
  broadcastAlert('critical_system_alert', 'System Privacy Health collapsed below 50. Initiating automatic SURVEILLANCE THROTTLING BLACKOUT.');
  
  res.json({ message: 'Spike scenario triggered', current_state: scoreData });
});

app.post('/api/demo/reset', (req, res) => {
  db.activeConsents = new Set(['citizen_token_1', 'citizen_token_2']);
  db.biasSuppressions = [];
  db.predictions = [...defaultPredictions];
  db.civicVaultMessages = {};
  db.phantomCredentials = [];
  const scoreData = calculateTrustScore();
  io.emit('trust-score-update', scoreData);
  io.emit('predictions-reset', defaultPredictions);
  broadcastAlert('system_reset', 'System state reset to base operations.');
  res.json({ message: 'System state reset', current_state: scoreData });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`AEGIS Backend running on http://localhost:${PORT}`);
  console.log(`WebSocket Server Online.`);
  console.log(`Serving static frontend assets at http://localhost:${PORT}`);
  console.log(`===================================================`);
});
