/**
 * AEGIS Cryptographic Engine validation suite (Member 4's testing suite)
 * Execute this file with: node test-crypto.js
 */

const cryptoEngine = require('./engine');
const assert = require('assert');

console.log("====================================================");
console.log("   AEGIS Cryptography & Security Validation Suite");
console.log("====================================================\n");

let successCount = 0;
let failCount = 0;

function runTest(testName, testFn) {
  try {
    console.log(`⏳ Running: ${testName}...`);
    testFn();
    console.log(`✅ Passed: ${testName}\n`);
    successCount++;
  } catch (error) {
    console.error(`❌ Failed: ${testName}`);
    console.error(error);
    console.log();
    failCount++;
  }
}

// -------------------------------------------------------------
// Test Case 1: PhantomPass ZK-Proof Generation & Time-Lock Validation
// -------------------------------------------------------------
runTest("PhantomPass ZK-Proof Validity & Expire Checks", () => {
  const citizenIdHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"; // SHA-256 for empty string
  const zoneId = "ZONE_A_CENTRAL";
  const durationSeconds = 2; // 2-second time lock

  // 1. Issue credential
  const credential = cryptoEngine.generateZkToken(citizenIdHash, zoneId, durationSeconds);
  
  assert.ok(credential.proof_credential, "Proof token should be generated");
  assert.ok(credential.nullifier_hash, "Nullifier hash should be generated");
  assert.ok(credential.expires_at, "Expiration timestamp must exist");

  console.log(`   Issued Token: ${credential.proof_credential}`);
  console.log(`   Expires At: ${credential.expires_at}`);

  // 2. Validate expiration is in the future
  const expiresMs = new Date(credential.expires_at).getTime();
  const nowMs = Date.now();
  assert.ok(expiresMs > nowMs, "Credential expiration must be in the future when issued");
});

// -------------------------------------------------------------
// Test Case 2: CivicVault Shamir's Key Splitting & Consensus Reconstruction
// -------------------------------------------------------------
runTest("CivicVault Shamir 3-of-5 Key Split & Reconstruction", () => {
  const secretKey = "super-secret-aes-key-abc-123";
  const requiredSigs = 3;
  const totalPool = 5;

  // 1. Split key into 5 shares
  const shares = cryptoEngine.splitMessageKey(secretKey, requiredSigs, totalPool);
  assert.strictEqual(shares.length, totalPool, `Should generate exactly ${totalPool} shares`);
  console.log(`   Successfully split key into ${shares.length} shares.`);
  shares.forEach(s => console.log(`    - ${s.jury_id} holds key reference`));

  // 2. Simulate 3-of-5 consensus reconstruction (Should PASS)
  const mockMessageRecord = {
    required_signatures: requiredSigs,
    decrypted_content: "CRITICAL: Suspicious scanning arrays detected in Grid Sector C."
  };

  const collectedShares3 = {
    "citizen_jury_1": shares[0].secret_share,
    "citizen_jury_2": shares[1].secret_share,
    "citizen_jury_3": shares[2].secret_share
  };

  const recon3 = cryptoEngine.reconstructMessageKey(mockMessageRecord, collectedShares3);
  assert.strictEqual(recon3.status, "UNLOCKED", "Should successfully unlock with 3 shares");
  assert.strictEqual(recon3.decrypted_content, mockMessageRecord.decrypted_content, "Decrypted text should match");
  console.log("   Consensus met: successfully unlocked payload using 3 shares.");

  // 3. Simulate 4-of-5 consensus reconstruction (Should PASS)
  const collectedShares4 = {
    "citizen_jury_1": shares[0].secret_share,
    "citizen_jury_2": shares[1].secret_share,
    "citizen_jury_3": shares[2].secret_share,
    "citizen_jury_4": shares[3].secret_share
  };
  const recon4 = cryptoEngine.reconstructMessageKey(mockMessageRecord, collectedShares4);
  assert.strictEqual(recon4.status, "UNLOCKED", "Should successfully unlock with 4 shares");

  // 4. Simulate insufficient consensus (Should FAIL)
  const collectedShares2 = {
    "citizen_jury_1": shares[0].secret_share,
    "citizen_jury_5": shares[4].secret_share
  };
  const recon2 = cryptoEngine.reconstructMessageKey(mockMessageRecord, collectedShares2);
  assert.strictEqual(recon2.status, "LOCKED", "Should remain locked with only 2 shares");
  assert.strictEqual(recon2.decrypted_content, null, "Decrypted content should be null");
  console.log("   Consensus failed: safely blocked decryption using only 2 shares.");
});

console.log("====================================================");
console.log(`   Validation Complete: ${successCount} Passed | ${failCount} Failed`);
console.log("====================================================");
