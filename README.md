# AEGIS — Adaptive Ethical Governance & Identity System
> **World's first city-scale ethical surveillance operating system balancing privacy and safety in real-time.**

AEGIS is built as a highly unified, **zero-conflict full-stack monorepo system** designed for 48-hour hackathon execution. By running a unified frontend but isolating your team's code into dedicated directory views, git merge conflicts are completely eliminated.

---

## 🗺️ Workspace Architecture & Team Ownership

Each folder below represents an isolated codebase. Teammates must stay within their assigned directory.

```
aegis/
├── frontend/         # Unified Next.js 14 Web Application (Port 3000)
│   ├── app/
│   │   ├── dashboard/ # [MEMBER 1] Public Trust Score & Heatmap Layout
│   │   └── citizen/   # [MEMBER 4] Citizen Portal: PhantomPass Wallet & CivicVault UI
├── ai-service/       # [MEMBER 2] FairWatch SHAP models & Consent Classifier (FastAPI, Port 8000)
└── backend/          # [MEMBER 3] Central Express API & WebSocket Core (Express, Port 5000)
```

---

## ⚡ Quick Start: Running the Entire System

To spin up all three servers simultaneously in separate PowerShell terminals:

1. Right-click and open **PowerShell** inside the root project directory `Coddera`.
2. Run the startup script:
   ```powershell
   ./run-all.ps1
   ```
   *This script automatically moves into each folder, installs dependencies (`npm install` / `pip install`), and boots the respective service on its designated port.*

---

## 🔬 How to Test the Integration Right Now (Hour 0)

You do **not** need to wait for frontend or AI models to finish to see the entire system working together. Use these rapid test curl sequences:

### Step 1: Watch the Live WebSocket Engine (Member 1 / 3)
Open your browser console or use a tool like Postman to listen to `ws://localhost:5000`. You will see a live heartbeat payload emitted every 5 seconds detailing the composite **Privacy Trust Score** (starting around `95`).

### Step 2: Citizen Toggles Dynamic Consent (Member 4 / 3)
A citizen walk-out triggers dynamic consent revocation on their portal. Run:
```bash
curl -X POST http://localhost:5000/api/consent/toggle \
     -H "Content-Type: application/json" \
     -d '{"citizen_id": "citizen_token_1", "consented": false}'
```
* **Result:** The system broadcasts an immediate WebSocket alert `consent_opt_out`. If you fetch `http://localhost:5000/api/system/status`, you'll see the score recalculate dynamically!

### Step 3: FairWatch Crime Forecast Bias Audit (Member 2 / 3)
A predictive model runs. The AI audits itself using SHAP values. If bias is detected above a threshold, it automatically suppresses the alert to prevent demographic discrimination.
Run:
```bash
curl -X POST http://localhost:8000/api/ai/predict \
     -H "Content-Type: application/json" \
     -d '{"latitude": 13.7563, "longitude": 100.5018, "historical_category": "theft", "demographic_profile": {"income_level": "low", "predominant_race": "minority"}}'
```
* **Result:** 
  1. The FastAPI AI server catches the low-income/minority profile, flags `suppression_triggered: true`, and returns an adjusted priority of `LOW`.
  2. The AI server automatically triggers a background webhook callback to the backend at `http://localhost:5000/api/ai/report-suppression`.
  3. The backend immediately pushes a real-time `bias_suppression_alert` via WebSockets and lowers the overall **Privacy Trust Score**!

### Step 4: CivicVault 3-of-5 Consensus Decryption (Member 4 / 3)
A citizen submits an encrypted threat file. To decrypt it for authorities, 3 independent citizen jurors must sign:

1. **Submit message:**
   ```bash
   curl -X POST http://localhost:5000/api/civicvault/submit \
        -H "Content-Type: application/json" \
        -d '{"encrypted_payload": "U2FsdGVkX19...", "required_signatures": 3}'
   ```
   *(Returns a `message_id`, e.g., `vault_msg_123`)*

2. **Submit 3 separate signatures to co-sign decryption:**
   ```bash
   # Juror 1 Signs
   curl -X POST http://localhost:5000/api/civicvault/sign -H "Content-Type: application/json" -d '{"message_id": "vault_msg_123", "jury_id": "citizen_jury_1", "secret_share": "share_1"}'
   
   # Juror 2 Signs
   curl -X POST http://localhost:5000/api/civicvault/sign -H "Content-Type: application/json" -d '{"message_id": "vault_msg_123", "jury_id": "citizen_jury_2", "secret_share": "share_2"}'
   
   # Juror 3 Signs (Consensus met!)
   curl -X POST http://localhost:5000/api/civicvault/sign -H "Content-Type: application/json" -d '{"message_id": "vault_msg_123", "jury_id": "citizen_jury_3", "secret_share": "share_3"}'
   ```
   * **Result:** On the 3rd signature, the status flips from `LOCKED` to `UNLOCKED`, revealing the decrypted emergency content for city authorities and elevating the Trust Score.

---

## 🏆 Hackathon Winning Presentation Sequence (Demo Script)

1. Open the **Dashboard** UI (`http://localhost:3000/dashboard`) on the main screen (Privacy Trust Score is resting at a healthy green `96`).
2. Trigger the mock collapse scenario by running:
   ```bash
   curl -X POST http://localhost:5000/api/demo/trigger-spike
   ```
3. Watch the dashboard react instantly:
   * Consent token ratios drop.
   * Multiple **FairWatch Bias Suppressions** trigger.
   * **Trust Score collapses** below 50.
   * The camera feed UI flashes an alert and **automatically activates 100% video blurring (throttling surveillance)** because the trust threshold failed!
4. Reset the system live during your pitch:
   ```bash
   curl -X POST http://localhost:5000/api/demo/reset
   ```
5. Watch the dashboard recover cleanly back to healthy green metrics. *Winning presentation complete in 60 seconds.*
