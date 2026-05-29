import uvicorn
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
import requests

app = FastAPI(
    title="AEGIS Ethical AI Service",
    description="FairWatch crime prediction & ConsentCam token classifier with SHAP bias audits.",
    version="1.0.0"
)

# Enable CORS for cross-service calls
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BACKEND_URL = "http://localhost:5000"

# -------------------------------------------------------------
# Pydantic Schemas for Requests & Responses
# -------------------------------------------------------------
class PredictRequest(BaseModel):
    latitude: float
    longitude: float
    historical_category: str
    demographic_profile: dict  # e.g., {"income_level": "low", "predominant_race": "minority"}

class ClassifyTokenRequest(BaseModel):
    camera_id: str
    detected_token_payload: str

# -------------------------------------------------------------
# Background Task: Report Suppression to Backend Server
# -------------------------------------------------------------
def report_suppression_to_backend(zone_id: str, alert: str, bias_score: int):
    try:
        url = f"{BACKEND_URL}/api/ai/report-suppression"
        payload = {
            "zone_id": zone_id,
            "prediction_alert": alert,
            "bias_score": bias_score
        }
        requests.post(url, json=payload, timeout=2)
    except Exception as e:
        print(f"[AI Service Warning] Failed to report bias suppression to backend: {e}")

# -------------------------------------------------------------
# REST API Endpoints
# -------------------------------------------------------------

@app.get("/")
def home():
    return {"service": "AEGIS AI-Service", "status": "active", "version": "1.0.0"}

# FairWatch Crime Prediction & SHAP Bias Audit
@app.post("/api/ai/predict")
def predict_and_audit(request: PredictRequest, background_tasks: BackgroundTasks):
    try:
        # Simulate simple mathematical prediction inference
        confidence = round(0.5 + random.random() * 0.45, 2)
        alert = f"Predicted elevated {request.historical_category.upper()} alert near grid coordinates."
        
        # Calculate dynamic "bias metrics" representing a SHAP calculation:
        # If income is low or demographic profile is flagged, increase bias score
        income = request.demographic_profile.get("income_level", "medium").lower()
        race = request.demographic_profile.get("predominant_race", "majority").lower()
        
        income_disparity = 0.15
        demographic_parity = 0.10
        
        if income == "low":
            income_disparity += 0.30
        if race == "minority":
            demographic_parity += 0.40
            
        # Composite Fairness Score (0-100, where 100 is perfectly fair, <65 triggers suppression)
        # Higher disparity/parity diff results in a degraded fairness score
        fairness_score = 100 - int((income_disparity + demographic_parity) * 70)
        fairness_score = max(0, min(100, fairness_score))
        
        suppression_triggered = fairness_score < 65
        adjusted_priority = "LOW" if suppression_triggered else "HIGH"
        
        if suppression_triggered:
            alert = f"[SUPPRESSED BY AUDIT] {alert}"
            # Notify backend server asynchronously so dashboard updates real-time
            background_tasks.add_task(
                report_suppression_to_backend, 
                "Zone B" if request.latitude == 13.7563 else "Zone D", 
                alert, 
                100 - fairness_score
            )
            
        return {
            "prediction_alert": alert,
            "confidence": confidence,
            "bias_metrics": {
                "income_disparity": round(income_disparity, 2),
                "demographic_parity_diff": round(demographic_parity, 2),
                "fairness_score": fairness_score,
                "suppression_triggered": suppression_triggered
            },
            "adjusted_priority": adjusted_priority
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ConsentCam: Classify detected visual token payloads for consent validation
@app.post("/api/ai/classify-token")
def classify_token(request: ClassifyTokenRequest):
    # Dynamic classification token evaluation:
    # If the payload starts with 'valid_' or has a specific pattern, mark as consented
    payload = request.detected_token_payload.lower()
    is_valid = payload.startswith("valid") or "consent" in payload
    
    # Walkout revocation simulation
    if "revoked" in payload or "expired" in payload:
        is_valid = False
        
    return {
        "is_valid_consent": is_valid,
        "camera_id": request.camera_id,
        "token_registered_timestamp": "2026-05-29T15:20:00Z" if is_valid else None
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
