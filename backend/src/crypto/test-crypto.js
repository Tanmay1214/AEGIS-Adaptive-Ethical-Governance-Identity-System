const crypto = require('crypto');
const { generateZkToken, validateZkToken, splitMessageKey, reconstructMessageKey } = require('./engine');

function assert(condition, label) {
  if (!condition) {
    console.error('❌ FAILED: ' + label);
    process.exit(1);
  }
}

async function main() {
  console.log("====================================================");
  console.log("AEGIS Cryptography & Security Validation Suite");
  
  // PhantomPass Tests
  console.log("⏳ Running: PhantomPass ZK-Proof Validity & Expire Checks...");
  
  const citizenIdHash = crypto.createHash('sha256').update('citizen123').digest('hex');
  const zoneId = 'ZONE_1';
  const masterKey = 'master-key';
  
  // 1. Valid token
  const tokenValid = generateZkToken(citizenIdHash, zoneId, 3600, masterKey);
  const validateResult1 = validateZkToken(tokenValid, citizenIdHash, zoneId, masterKey);
  assert(validateResult1.valid === true, "Valid token should pass");
  
  const shortCred = tokenValid.proof_credential.substring(0, 6);
  console.log(`Issued Token: zk-proof-resident-valid-${shortCred}...`);
  console.log(`Expires At: ${tokenValid.expires_at}`);
  
  // 2. Expired token
  const tokenExpired = generateZkToken(citizenIdHash, zoneId, -1, masterKey);
  const validateResult2 = validateZkToken(tokenExpired, citizenIdHash, zoneId, masterKey);
  assert(validateResult2.valid === false && validateResult2.reason === 'TOKEN_EXPIRED', "Expired token should fail with TOKEN_EXPIRED");
  
  // 3. Tampered credential
  const tokenTampered = { ...tokenValid };
  tokenTampered.proof_credential = (tokenTampered.proof_credential[0] === 'a' ? 'b' : 'a') + tokenTampered.proof_credential.substring(1);
  const validateResult3 = validateZkToken(tokenTampered, citizenIdHash, zoneId, masterKey);
  assert(validateResult3.valid === false && validateResult3.reason === 'TOKEN_TAMPERED', "Tampered token should fail with TOKEN_TAMPERED");
  
  console.log("✅ Passed: PhantomPass ZK-Proof Validity & Expire Checks");
  
  // CivicVault Tests
  console.log("⏳ Running: CivicVault Shamir 3-of-5 Key Split & Reconstruction...");
  
  // 4. Full split & reconstruct with 3 shares
  const originalKey = crypto.randomBytes(32).toString('hex');
  const shares = splitMessageKey(originalKey);
  
  console.log("Successfully split key into 5 shares.");
  shares.forEach(s => {
    console.log(`- ${s.jury_id} holds key reference`);
  });
  
  const reconstruct3 = reconstructMessageKey([shares[0], shares[1], shares[2]]);
  assert(reconstruct3.status === 'UNLOCKED' && reconstruct3.key === originalKey, "Reconstruct with 3 shares should yield original key");
  console.log("Consensus met: successfully unlocked payload using 3 shares.");
  
  // 5. 2 shares blocked
  const reconstruct2 = reconstructMessageKey([shares[0], shares[1]]);
  assert(reconstruct2.status === 'LOCKED', "Reconstruct with 2 shares should be LOCKED");
  console.log("Consensus failed: safely blocked decryption using only 2 shares.");
  
  // 6. Tampered share
  const tamperedShares = [
    { ...shares[0] },
    shares[1],
    shares[2]
  ];
  tamperedShares[0].secret_share = (tamperedShares[0].secret_share[0] === 'a' ? 'b' : 'a') + tamperedShares[0].secret_share.substring(1);
  const reconstructTampered = reconstructMessageKey(tamperedShares);
  assert(reconstructTampered.status === 'UNLOCKED' && reconstructTampered.key !== originalKey, "Tampered share should not crash, but yield incorrect key");
  console.log("  ⚠ Security note: tampered share produced wrong key as expected");
  
  // 7. Duplicate juror dedup
  const reconstructDup = reconstructMessageKey([shares[0], shares[0], shares[0]]);
  assert(reconstructDup.status === 'LOCKED', "Reconstruct with duplicate shares should be LOCKED");
  
  console.log("✅ Passed: CivicVault Shamir 3-of-5 Key Split & Reconstruction");
  console.log("====================================================");
  console.log("Validation Complete: 2 Passed | 0 Failed");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
