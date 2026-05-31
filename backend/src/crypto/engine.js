const crypto = require('crypto');

const PRIME = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF');

function generateZkToken(citizenIdHash, zoneId, durationSeconds = 3600, transientMasterKey = 'default-master-key') {
  const expires_at = new Date(Date.now() + durationSeconds * 1000).toISOString();
  const proof_credential = crypto.createHmac('sha256', transientMasterKey)
    .update(citizenIdHash + expires_at + zoneId)
    .digest('hex');
  const nullifier_hash = crypto.createHash('sha256')
    .update(citizenIdHash + zoneId)
    .digest('hex');
  return { proof_credential, expires_at, nullifier_hash };
}

function validateZkToken(tokenObj, citizenIdHash, zoneId, transientMasterKey = 'default-master-key') {
  if (Date.now() > new Date(tokenObj.expires_at).getTime()) {
    return { valid: false, reason: 'TOKEN_EXPIRED' };
  }
  
  const expectedCredential = crypto.createHmac('sha256', transientMasterKey)
    .update(citizenIdHash + tokenObj.expires_at + zoneId)
    .digest('hex');
    
  const expectedBuffer = Buffer.from(expectedCredential, 'hex');
  const actualBuffer = Buffer.from(tokenObj.proof_credential, 'hex');
  
  if (expectedBuffer.length !== actualBuffer.length || !crypto.timingSafeEqual(expectedBuffer, actualBuffer)) {
    return { valid: false, reason: 'TOKEN_TAMPERED' };
  }
  
  return { valid: true, reason: 'OK' };
}

function splitMessageKey(symmetricKeyHex) {
  const a0 = BigInt('0x' + symmetricKeyHex);
  const a1 = BigInt('0x' + crypto.randomBytes(32).toString('hex')) % PRIME;
  const a2 = BigInt('0x' + crypto.randomBytes(32).toString('hex')) % PRIME;
  
  const f = (x) => (a0 + a1 * x + a2 * (x ** 2n)) % PRIME;
  
  return [
    { jury_id: 'citizen_jury_1', x: '1', secret_share: f(1n).toString(16).padStart(64, '0') },
    { jury_id: 'citizen_jury_2', x: '2', secret_share: f(2n).toString(16).padStart(64, '0') },
    { jury_id: 'citizen_jury_3', x: '3', secret_share: f(3n).toString(16).padStart(64, '0') },
    { jury_id: 'citizen_jury_4', x: '4', secret_share: f(4n).toString(16).padStart(64, '0') },
    { jury_id: 'citizen_jury_5', x: '5', secret_share: f(5n).toString(16).padStart(64, '0') }
  ];
}

// We use EGCD for modular inverse instead of Fermat's Little Theorem
// because the provided PRIME constant is not actually prime, 
// causing Fermat's Little Theorem to yield incorrect inverses.
function egcd(a, b) {
  let x0 = 1n, y0 = 0n, x1 = 0n, y1 = 1n;
  while (b !== 0n) {
    let q = a / b;
    let r = a % b;
    a = b; b = r;
    let x2 = x0 - q * x1;
    let y2 = y0 - q * y1;
    x0 = x1; x1 = x2;
    y0 = y1; y1 = y2;
  }
  return { g: a, x: x0, y: y0 };
}

function modInverse(a, p) {
  a = ((a % p) + p) % p;
  const res = egcd(a, p);
  if (res.g !== 1n) throw new Error('No inverse');
  return (res.x % p + p) % p;
}

function reconstructMessageKey(shares, collectedSharesObj) {
  let shareArray = [];
  
  if (Array.isArray(shares)) {
    shareArray = shares;
  } else if (collectedSharesObj) {
    for (const [jury_id, secret_share] of Object.entries(collectedSharesObj)) {
      const match = jury_id.match(/citizen_jury_(\d+)/);
      const x = match ? match[1] : '1';
      shareArray.push({ jury_id, x, secret_share });
    }
  }
  
  const uniqueShares = [];
  const seen = new Set();
  for (const s of shareArray) {
    if (!seen.has(s.jury_id)) {
      seen.add(s.jury_id);
      uniqueShares.push(s);
    }
  }
  
  if (uniqueShares.length < 3) {
    return { status: 'LOCKED', key: null, reason: 'INSUFFICIENT_SHARES' };
  }
  
  const selected = uniqueShares.slice(0, 3).map(s => ({
    x: BigInt(s.x),
    y: BigInt('0x' + s.secret_share)
  }));
  
  const p = PRIME;
  let a0 = 0n;
  
  for (let i = 0; i < 3; i++) {
    const xi = selected[i].x;
    const yi = selected[i].y;
    
    let num = 1n;
    let den = 1n;
    
    for (let j = 0; j < 3; j++) {
      if (i !== j) {
        const xj = selected[j].x;
        
        let termNum = (-xj) % p;
        termNum = (termNum + p) % p;
        num = (num * termNum) % p;
        
        let termDen = (xi - xj) % p;
        termDen = (termDen + p) % p;
        den = (den * termDen) % p;
      }
    }
    
    const invDen = modInverse(den, p);
    const term = (yi * num) % p;
    const finalTerm = (term * invDen) % p;
    
    a0 = (a0 + finalTerm) % p;
  }
  
  const recoveredKeyHex = a0.toString(16).padStart(64, '0');
  return { status: 'UNLOCKED', key: recoveredKeyHex };
}

module.exports = {
  generateZkToken,
  validateZkToken,
  splitMessageKey,
  reconstructMessageKey
};
