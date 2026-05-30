"""
AEGIS :: ConsentCam Vision Service
====================================
GPU-accelerated face detection + per-face blur streaming server.
Uses InsightFace (ONNX Runtime + CUDA) on RTX 3050 for real-time
face detection. Streams pre-blurred JPEG frames over WebSocket.

Port: 8001
WebSocket: ws://localhost:8001/ws/camera/{node_id}

Author: AEGIS Team - Code Blooded, LNMIIT Jaipur
"""

import asyncio
import base64
import io
import json
import math
import os
import sys
import time
import uuid
from pathlib import Path
from typing import Dict, List, Optional

# Force UTF-8 stdout on Windows to avoid CP1252 crashes
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

import cv2
import numpy as np
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

# ── InsightFace Setup ──────────────────────────────────────────────
try:
    from insightface.app import FaceAnalysis
    INSIGHTFACE_AVAILABLE = True
    print("[ConsentCam] InsightFace loaded successfully.")
except ImportError:
    INSIGHTFACE_AVAILABLE = False
    print("[ConsentCam] WARNING: InsightFace not available. No face detection.")

# ── Path Configuration ─────────────────────────────────────────────
BASE_DIR   = Path(__file__).parent.parent
CLIPS_DIR  = BASE_DIR / "frontend" / "clips"

# Camera node definitions (same as camera-node.js)
CAMERA_NODES = [
    {"id": "NODE_A1", "name": "Sindhi Camp Bus Terminal",   "zone": "ZONE_A_CENTRAL",  "clip": "clip1.mp4"},
    {"id": "NODE_B2", "name": "MI Road Market Square",      "zone": "ZONE_B_GRID",     "clip": "clip2.mp4"},
    {"id": "NODE_C3", "name": "Hawa Mahal Chowk",           "zone": "ZONE_C_METRO",    "clip": "clip3.mp4"},
    {"id": "NODE_D4", "name": "JLN Marg Overpass",          "zone": "ZONE_D_OUTPOST",  "clip": "clip4.mp4"},
    {"id": "NODE_E5", "name": "Vaishali Nagar Junction",    "zone": "ZONE_E_WEST",     "clip": "clip5.mp4"},
    {"id": "NODE_F6", "name": "Malviya Nagar Market",       "zone": "ZONE_F_SOUTH",    "clip": "clip6.mp4"},
    {"id": "NODE_G7", "name": "Amer Road Checkpoint",       "zone": "ZONE_G_NORTH",    "clip": "clip7.mp4"},
]
NODE_MAP = {n["id"]: n for n in CAMERA_NODES}

# ── FastAPI App ────────────────────────────────────────────────────
app = FastAPI(title="AEGIS ConsentCam Vision Service", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global: InsightFace Model ──────────────────────────────────────
face_analyzer: Optional[FaceAnalysis] = None

def load_face_model():
    global face_analyzer
    if not INSIGHTFACE_AVAILABLE:
        return
    print("[ConsentCam] Loading InsightFace model (GPU)...")
    try:
        face_analyzer = FaceAnalysis(
            name="buffalo_sc",          # lightweight but accurate model
            providers=["CUDAExecutionProvider", "CPUExecutionProvider"]
        )
        face_analyzer.prepare(ctx_id=0, det_size=(640, 640))
        print("[ConsentCam] [OK] Face model loaded on GPU (RTX 3050).")
    except Exception as e:
        print(f"[ConsentCam] GPU load failed, falling back to CPU: {e}")
        try:
            face_analyzer = FaceAnalysis(
                name="buffalo_sc",
                providers=["CPUExecutionProvider"]
            )
            face_analyzer.prepare(ctx_id=-1, det_size=(320, 320))
            print("[ConsentCam] [OK] Face model loaded on CPU (fallback).")
        except Exception as e2:
            print(f"[ConsentCam] [FAIL] Face model failed: {e2}")
            face_analyzer = None


# ── Face Registry Entry ────────────────────────────────────────────
class FaceEntry:
    def __init__(self, face_id: int, zone: str):
        self.id        = face_id
        self.face_id   = f"FACE_{uuid.uuid4().hex[:4].upper()}"
        self.token     = f"#TKN-{1000 + face_id}"
        self.zone      = zone
        self.timestamp = time.strftime("%H:%M:%S")
        self.revoked   = False
        self.last_box  = None   # (x1, y1, x2, y2)
        self.missed    = 0      # frames since last matched

    def to_dict(self):
        return {
            "id":        self.id,
            "faceId":    self.face_id,
            "token":     self.token,
            "zone":      self.zone,
            "timestamp": self.timestamp,
            "revoked":   self.revoked,
        }


# ── Camera Session ─────────────────────────────────────────────────
class CameraSession:
    """One session per WebSocket connection for a specific node."""

    def __init__(self, node_id: str, ws: WebSocket):
        self.node_id      = node_id
        self.ws           = ws
        self.node         = NODE_MAP.get(node_id, CAMERA_NODES[0])
        self.registry: List[FaceEntry] = []
        self.face_ctr     = 1
        self.running      = False
        self._cap         = None
        self.paused       = False          # playback pause state
        self._last_frame_buf: Optional[bytes] = None  # last encoded JPEG for freeze-frame

    def _get_clip_path(self) -> Optional[Path]:
        """Find clip, fall back to clip1.mp4 if specific clip missing."""
        clip_file = CLIPS_DIR / self.node["clip"]
        if clip_file.exists():
            return clip_file
        fallback = CLIPS_DIR / "clip1.mp4"
        if fallback.exists():
            print(f"[{self.node_id}] Clip '{self.node['clip']}' not found, using clip1.mp4")
            return fallback
        return None

    def _open_capture(self) -> bool:
        clip_path = self._get_clip_path()
        if not clip_path:
            print(f"[{self.node_id}] No clip found in {CLIPS_DIR}")
            return False
        self._cap = cv2.VideoCapture(str(clip_path))
        return self._cap.isOpened()

    def _read_frame(self) -> Optional[np.ndarray]:
        if not self._cap or not self._cap.isOpened():
            return None
        ret, frame = self._cap.read()
        if not ret:
            # Loop: seek back to start
            self._cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ret, frame = self._cap.read()
            if not ret:
                return None
        return frame

    def get_duration_ms(self) -> float:
        """Return total video duration in milliseconds."""
        if not self._cap:
            return 0.0
        fps        = self._cap.get(cv2.CAP_PROP_FPS) or 25
        total_frm  = self._cap.get(cv2.CAP_PROP_FRAME_COUNT)
        return (total_frm / fps) * 1000

    def get_position_ms(self) -> float:
        """Return current playback position in milliseconds."""
        if not self._cap:
            return 0.0
        return self._cap.get(cv2.CAP_PROP_POS_MSEC)

    def seek(self, delta_sec: float) -> None:
        """Seek forward (positive) or backward (negative) by delta_sec seconds."""
        if not self._cap:
            return
        duration_ms = self.get_duration_ms()
        current_ms  = self.get_position_ms()
        new_ms      = current_ms + delta_sec * 1000
        # Clamp to [0, duration)
        new_ms = max(0.0, min(new_ms, duration_ms - 100))
        self._cap.set(cv2.CAP_PROP_POS_MSEC, new_ms)
        # After seek, clear face tracking to avoid ghost boxes
        for e in self.registry:
            e.last_box = None
            e.missed   = 0

    def get_playback_msg(self) -> str:
        """Send current playback state to frontend."""
        duration_ms = self.get_duration_ms()
        position_ms = self.get_position_ms()
        return json.dumps({
            "type":        "playback",
            "paused":      self.paused,
            "positionMs":  round(position_ms),
            "durationMs":  round(duration_ms),
        })

    def _iou(self, b1, b2) -> float:
        """Intersection over Union for two boxes (x1,y1,x2,y2)."""
        ax1, ay1, ax2, ay2 = b1
        bx1, by1, bx2, by2 = b2
        ix1, iy1 = max(ax1, bx1), max(ay1, by1)
        ix2, iy2 = min(ax2, bx2), min(ay2, by2)
        inter = max(0, ix2 - ix1) * max(0, iy2 - iy1)
        area1 = (ax2 - ax1) * (ay2 - ay1)
        area2 = (bx2 - bx1) * (by2 - by1)
        union = area1 + area2 - inter
        return inter / union if union > 0 else 0.0

    def _centroid_dist(self, b1, b2) -> float:
        cx1 = (b1[0] + b1[2]) / 2; cy1 = (b1[1] + b1[3]) / 2
        cx2 = (b2[0] + b2[2]) / 2; cy2 = (b2[1] + b2[3]) / 2
        return math.hypot(cx1 - cx2, cy1 - cy2)

    def _match_faces(self, detected_boxes: List) -> List[FaceEntry]:
        """Match detected boxes to existing registry (or create new entries)."""
        used_ids = set()
        matched = []
        MAX_MISSED = 8

        for box in detected_boxes:
            x1, y1, x2, y2 = box
            best_entry = None
            best_score = float('inf')

            for entry in self.registry:
                if entry.id in used_ids or entry.last_box is None:
                    continue
                dist = self._centroid_dist(entry.last_box, box)
                iou  = self._iou(entry.last_box, box)
                # Combined score: lower is better
                score = dist * (1 - iou)
                if score < best_score and dist < 120 and iou > 0.1:
                    best_score = score
                    best_entry = entry

            if best_entry:
                best_entry.last_box = box
                best_entry.missed   = 0
                used_ids.add(best_entry.id)
                matched.append(best_entry)
            else:
                # New face
                entry = FaceEntry(self.face_ctr, self.node["zone"])
                self.face_ctr += 1
                entry.last_box = box
                self.registry.append(entry)
                used_ids.add(entry.id)
                matched.append(entry)
                print(f"[{self.node_id}] New face: {entry.face_id} | {entry.token}")

        # Age out faces not seen for a while
        for entry in self.registry:
            if entry.id not in used_ids:
                entry.missed += 1
        self.registry = [e for e in self.registry if e.missed < MAX_MISSED]

        return matched

    def _blur_face(self, frame: np.ndarray, box) -> None:
        """Apply Gaussian blur to a face ROI in-place."""
        x1, y1, x2, y2 = box
        PAD = 15
        h, w = frame.shape[:2]
        rx1 = max(0, x1 - PAD)
        ry1 = max(0, y1 - PAD)
        rx2 = min(w, x2 + PAD)
        ry2 = min(h, y2 + PAD)
        roi = frame[ry1:ry2, rx1:rx2]
        if roi.size == 0:
            return
        # Strong GaussianBlur — feels like real privacy shield
        blurred = cv2.GaussianBlur(roi, (61, 61), 0)
        # Additional pixelation for extra effect
        small = cv2.resize(blurred, (max(1, (rx2-rx1)//8), max(1, (ry2-ry1)//8)))
        blurred = cv2.resize(small, (rx2-rx1, ry2-ry1), interpolation=cv2.INTER_NEAREST)
        frame[ry1:ry2, rx1:rx2] = blurred

    def _draw_bracket(self, frame: np.ndarray, box, entry: FaceEntry) -> None:
        """Draw AEGIS-style corner brackets and token label."""
        x1, y1, x2, y2 = box
        PAD  = 15
        BLEN = 14  # bracket arm length
        bx1  = max(0, x1 - PAD)
        by1  = max(0, y1 - PAD)
        bx2  = min(frame.shape[1], x2 + PAD)
        by2  = min(frame.shape[0], y2 + PAD)

        color  = (0, 80, 255) if entry.revoked else (0, 251, 251)  # Red BGR / Cyan BGR
        lw     = 2

        # Top-left
        cv2.line(frame, (bx1, by1 + BLEN), (bx1, by1), color, lw)
        cv2.line(frame, (bx1, by1), (bx1 + BLEN, by1), color, lw)
        # Top-right
        cv2.line(frame, (bx2 - BLEN, by1), (bx2, by1), color, lw)
        cv2.line(frame, (bx2, by1), (bx2, by1 + BLEN), color, lw)
        # Bottom-left
        cv2.line(frame, (bx1, by2 - BLEN), (bx1, by2), color, lw)
        cv2.line(frame, (bx1, by2), (bx1 + BLEN, by2), color, lw)
        # Bottom-right
        cv2.line(frame, (bx2 - BLEN, by2), (bx2, by2), color, lw)
        cv2.line(frame, (bx2, by2 - BLEN), (bx2, by2), color, lw)

        # Token label above the box
        label      = entry.token
        font       = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.32
        thick      = 1

        cv2.putText(frame, label, (bx1, max(12, by1 - 6)), font, font_scale, color, thick, cv2.LINE_AA)
        
        # Only show status label if revoked (REVOKED). The active (yellow/cyan) box should only show the token ID.
        if entry.revoked:
            cv2.putText(frame, "REVOKED", (bx2 - 46, max(12, by1 - 6)), font, font_scale, color, thick, cv2.LINE_AA)

    def process_frame(self, frame: np.ndarray) -> tuple:
        """
        Run detection + blur on a frame.
        Returns (processed_frame, registry_changed: bool)
        """
        registry_before = len(self.registry)
        matched_entries  = []

        if face_analyzer is not None:
            try:
                # InsightFace expects RGB
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                faces = face_analyzer.get(rgb)
                boxes = []
                for face in faces:
                    b = face.bbox.astype(int)
                    boxes.append((b[0], b[1], b[2], b[3]))
                matched_entries = self._match_faces(boxes)
            except Exception as e:
                print(f"[{self.node_id}] Detection error: {e}")

        # Apply blur / annotations in one pass
        for entry in matched_entries:
            if entry.last_box is None:
                continue
            box = entry.last_box
            if not entry.revoked:
                self._blur_face(frame, box)
            self._draw_bracket(frame, box, entry)

        registry_changed = (len(self.registry) != registry_before)
        return frame, registry_changed

    def handle_command(self, cmd: dict) -> tuple:
        """Process commands from frontend.
        Returns (registry_changed: bool, playback_changed: bool)"""
        action  = cmd.get("action")
        face_id = cmd.get("faceId")

        # ── Consent commands ──────────────────────────────────────
        if action == "revoke" and face_id is not None:
            for e in self.registry:
                if str(e.id) == str(face_id):
                    e.revoked = True
                    print(f"[{self.node_id}] Consent REVOKED: {e.face_id}")
                    return True, False
        elif action == "restore" and face_id is not None:
            for e in self.registry:
                if str(e.id) == str(face_id):
                    e.revoked = False
                    print(f"[{self.node_id}] Consent RESTORED: {e.face_id}")
                    return True, False
        elif action == "revoke_all":
            for e in self.registry: e.revoked = True
            return True, False
        elif action == "restore_all":
            for e in self.registry: e.revoked = False
            return True, False

        # ── Playback commands ─────────────────────────────────────
        elif action == "pause":
            self.paused = True
            print(f"[{self.node_id}] Playback PAUSED at {self.get_position_ms()/1000:.1f}s")
            return False, True
        elif action == "play":
            self.paused = False
            print(f"[{self.node_id}] Playback RESUMED")
            return False, True
        elif action == "seek":
            delta = float(cmd.get("delta", 0))
            self.seek(delta)
            direction = "FWD" if delta > 0 else "RWD"
            print(f"[{self.node_id}] Seek {direction} {abs(delta):.0f}s -> {self.get_position_ms()/1000:.1f}s")
            return False, True

        return False, False

    def get_registry_msg(self) -> str:
        return json.dumps({
            "type":  "registry",
            "faces": [e.to_dict() for e in self.registry]
        })

    def close(self):
        if self._cap:
            self._cap.release()
            self._cap = None
        self.running = False


# ── WebSocket Handler ──────────────────────────────────────────────
@app.websocket("/ws/camera/{node_id}")
async def camera_websocket(ws: WebSocket, node_id: str):
    await ws.accept()
    session = CameraSession(node_id, ws)
    print(f"[ConsentCam] Client connected: {node_id}")

    if not session._open_capture():
        await ws.send_text(json.dumps({
            "type": "error",
            "message": f"No video clip found for {node_id}. Place .mp4 in frontend/clips/"
        }))
        await ws.close()
        return

    # Send initial empty registry
    await ws.send_text(session.get_registry_msg())

    session.running    = True
    last_registry_push = 0
    last_playback_push = 0
    last_reg_count     = 0
    REGISTRY_PUSH_INTERVAL = 0.5   # push registry every 500ms at minimum
    PLAYBACK_PUSH_INTERVAL = 0.25  # push playback position every 250ms

    # Target ~25 FPS -> 40ms per frame
    FRAME_INTERVAL       = 0.040
    PAUSE_RESEND_INTERVAL = 0.1    # re-send freeze frame every 100ms while paused

    # Send initial playback state
    await ws.send_text(session.get_playback_msg())

    try:
        while session.running:
            t0 = time.perf_counter()

            # ── Check for incoming commands (non-blocking) ──────
            reg_changed_cmd  = False
            play_changed_cmd = False
            try:
                while True:
                    data = await asyncio.wait_for(ws.receive(), timeout=0.001)
                    if "text" in data:
                        cmd = json.loads(data["text"])
                        rc, pc = session.handle_command(cmd)
                        if rc: reg_changed_cmd  = True
                        if pc: play_changed_cmd = True
                    elif data.get("type") == "websocket.disconnect":
                        session.running = False
                        break
            except asyncio.TimeoutError:
                pass
            except WebSocketDisconnect:
                break

            if not session.running:
                break

            now = time.perf_counter()

            # ── PAUSED: re-send last frame + playback state ─────
            if session.paused:
                if session._last_frame_buf is not None:
                    await ws.send_bytes(session._last_frame_buf)
                if play_changed_cmd or (now - last_playback_push) > PLAYBACK_PUSH_INTERVAL:
                    await ws.send_text(session.get_playback_msg())
                    last_playback_push = now
                if reg_changed_cmd:
                    await ws.send_text(session.get_registry_msg())
                    last_registry_push = now
                await asyncio.sleep(PAUSE_RESEND_INTERVAL)
                continue

            # ── PLAYING: Read & Process Frame ───────────────────
            frame = session._read_frame()
            if frame is None:
                await asyncio.sleep(0.1)
                continue

            # Resize to 854x480 for streaming (good balance of quality/speed)
            frame = cv2.resize(frame, (854, 480))
            processed, reg_changed = session.process_frame(frame)

            # ── Encode to JPEG ──────────────────────────────────
            encode_params = [cv2.IMWRITE_JPEG_QUALITY, 82]
            ret, buf = cv2.imencode(".jpg", processed, encode_params)
            if not ret:
                continue

            frame_bytes = buf.tobytes()
            session._last_frame_buf = frame_bytes   # save for pause freeze-frame

            # Send frame as binary
            await ws.send_bytes(frame_bytes)

            # ── Push registry update if changed or periodic ─────
            reg_count = len(session.registry)
            if reg_changed_cmd or reg_changed or reg_count != last_reg_count or \
               (now - last_registry_push) > REGISTRY_PUSH_INTERVAL:
                await ws.send_text(session.get_registry_msg())
                last_registry_push = now
                last_reg_count     = reg_count

            # ── Push playback position periodically ────────────
            if play_changed_cmd or (now - last_playback_push) > PLAYBACK_PUSH_INTERVAL:
                await ws.send_text(session.get_playback_msg())
                last_playback_push = now

            # ── Frame rate limiter ──────────────────────────────
            elapsed = time.perf_counter() - t0
            sleep_t = FRAME_INTERVAL - elapsed
            if sleep_t > 0:
                await asyncio.sleep(sleep_t)

    except WebSocketDisconnect:
        print(f"[ConsentCam] Client disconnected: {node_id}")
    except Exception as e:
        print(f"[ConsentCam] Session error ({node_id}): {e}")
    finally:
        session.close()
        print(f"[ConsentCam] Session closed: {node_id}")


# ── Health Check ───────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status":        "ok",
        "face_model":    "loaded" if face_analyzer else "unavailable",
        "insightface":   INSIGHTFACE_AVAILABLE,
        "clips_dir":     str(CLIPS_DIR),
        "clips_found":   [f.name for f in CLIPS_DIR.glob("*.mp4")] if CLIPS_DIR.exists() else [],
    }


# ── Startup ────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    # Load face model in a thread (heavy operation, don't block event loop)
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, load_face_model)


# ── Entry Point ────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("  AEGIS ConsentCam Vision Service")
    print("  GPU: NVIDIA RTX 3050 | InsightFace | OpenCV")
    print("  WebSocket: ws://localhost:8001/ws/camera/{node_id}")
    print("  Health:    http://localhost:8001/health")
    print("=" * 60)
    uvicorn.run(
        "consentcam_server:app",
        host="0.0.0.0",
        port=8001,
        log_level="info",
        ws_ping_interval=20,
        ws_ping_timeout=30,
    )
