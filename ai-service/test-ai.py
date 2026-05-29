"""
AEGIS AI Service Integration & Validation Runner (Member 2's Testing Suite)
Instructions:
  1. Start the FastAPI server: python main.py (inside /ai-service)
  2. In a separate terminal, run this test: python test-ai.py
"""

import json
import urllib.request
import urllib.error

print("====================================================")
print("     AEGIS AI-Service API Validation Suite")
print("====================================================\n")

BASE_URL = "http://localhost:8000"

def make_post_request(path, payload):
    url = f"{BASE_URL}{path}"
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        url, 
        data=data, 
        headers={'Content-Type': 'application/json'}
    )
    try:
        with urllib.request.urlopen(req, timeout=3) as response:
            return response.status, json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode('utf-8'))
    except Exception as e:
        print(f"❌ Connection error: Is FastAPI running on port 8000? Details: {e}")
        return 0, None

def run_suite():
    success = 0
    failed = 0

    # -------------------------------------------------------------
    # Test 1: Health Check / Home Route
    # -------------------------------------------------------------
    print("⏳ Test 1: Verifying AI service base health check...")
    try:
        with urllib.request.urlopen(f"{BASE_URL}/", timeout=2) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            if response.status == 200 and res_data.get("status") == "active":
                print("   AI Service Status: Active & Operational")
                print("✅ Test 1 Passed\n")
                success += 1
            else:
                raise ValueError("Payload mismatch")
    except Exception as e:
        print(f"❌ Test 1 Failed: {e}\n")
        failed += 1

    # -------------------------------------------------------------
    # Test 2: Unbiased Demographics Prediction (Should NOT suppress alert)
    # -------------------------------------------------------------
    print("⏳ Test 2: Evaluating Unbiased Demographic Crime Forecast...")
    unbiased_payload = {
        "latitude": 13.7563,
        "longitude": 100.5018,
        "historical_category": "theft",
        "demographic_profile": {
            "income_level": "high",
            "predominant_race": "majority"
        }
    }
    status, response = make_post_request("/api/ai/predict", unbiased_payload)
    
    if status == 200 and response:
        metrics = response.get("bias_metrics", {})
        fairness = metrics.get("fairness_score", 100)
        suppressed = metrics.get("suppression_triggered", True)
        priority = response.get("adjusted_priority", "")

        print(f"   Inference Alert: {response.get('prediction_alert')}")
        print(f"   Fairness Score: {fairness} | Suppressed: {suppressed}")
        print(f"   Adjusted Priority: {priority}")

        if fairness >= 75 and not suppressed and priority == "HIGH":
            print("✅ Test 2 Passed\n")
            success += 1
        else:
            print("❌ Test 2 Failed: Output did not match unbiased expectations\n")
            failed += 1
    else:
        print(f"❌ Test 2 Failed: HTTP Status {status}\n")
        failed += 1

    # -------------------------------------------------------------
    # Test 3: Biased Demographics Prediction (Should TRIGGER suppression)
    # -------------------------------------------------------------
    print("⏳ Test 3: Evaluating Biased Demographic Profile (Auditor test)...")
    biased_payload = {
        "latitude": 13.7563,
        "longitude": 100.5018,
        "historical_category": "theft",
        "demographic_profile": {
            "income_level": "low",
            "predominant_race": "minority"
        }
    }
    status, response = make_post_request("/api/ai/predict", biased_payload)
    
    if status == 200 and response:
        metrics = response.get("bias_metrics", {})
        fairness = metrics.get("fairness_score", 100)
        suppressed = metrics.get("suppression_triggered", False)
        priority = response.get("adjusted_priority", "")

        print(f"   Inference Alert: {response.get('prediction_alert')}")
        print(f"   Fairness Score: {fairness} | Suppressed: {suppressed}")
        print(f"   Adjusted Priority: {priority}")

        if fairness < 65 and suppressed and priority == "LOW":
            print("✅ Test 3 Passed\n")
            success += 1
        else:
            print("❌ Test 3 Failed: Output did not match auditor expectations\n")
            failed += 1
    else:
        print(f"❌ Test 3 Failed: HTTP Status {status}\n")
        failed += 1

    # -------------------------------------------------------------
    # Test 4: ConsentCam Active Token Classify (Consented Case)
    # -------------------------------------------------------------
    print("⏳ Test 4: Testing ConsentCam Token Classification (Consented Token)...")
    token_valid_payload = {
        "camera_id": "CAM_01",
        "detected_token_payload": "valid_consent_token_991"
    }
    status, response = make_post_request("/api/ai/classify-token", token_valid_payload)
    
    if status == 200 and response:
        is_consented = response.get("is_valid_consent", False)
        print(f"   Token Validated: {is_consented}")
        if is_consented:
            print("✅ Test 4 Passed\n")
            success += 1
        else:
            print("❌ Test 4 Failed: Token marked as invalid incorrectly\n")
            failed += 1
    else:
        print(f"❌ Test 4 Failed: HTTP Status {status}\n")
        failed += 1

    # -------------------------------------------------------------
    # Test 5: ConsentCam Revoked Token Classify (Revoked Case)
    # -------------------------------------------------------------
    print("⏳ Test 5: Testing ConsentCam Token Classification (Revoked Token)...")
    token_revoked_payload = {
        "camera_id": "CAM_01",
        "detected_token_payload": "revoked_consent_token_walkout"
    }
    status, response = make_post_request("/api/ai/classify-token", token_revoked_payload)
    
    if status == 200 and response:
        is_consented = response.get("is_valid_consent", True)
        print(f"   Token Validated: {is_consented}")
        if not is_consented:
            print("✅ Test 5 Passed\n")
            success += 1
        else:
            print("❌ Test 5 Failed: Token marked as valid incorrectly\n")
            failed += 1
    else:
        print(f"❌ Test 5 Failed: HTTP Status {status}\n")
        failed += 1

    print("====================================================")
    print(f"   Validation Complete: {success} Passed | {failed} Failed")
    print("====================================================")

if __name__ == "__main__":
    run_suite()
