// ====================================================================
// AEGIS :: PHANTOMPASS CAMERA NODE ENGINE — GPU Backend Edition
// ConsentCam City Monitor — WebSocket client for Python vision server
// All face detection + blurring happens on RTX 3050 GPU backend.
// Frontend only receives pre-rendered JPEG frames + registry JSON.
//
// Backend: ws://localhost:8001/ws/camera/{node_id}
// LNMIIT Jaipur // UNIT: Code Blooded
// ====================================================================

// ── Camera Node Definitions (Jaipur city geo-coords) ──────────────
const CAMERA_NODES = [
  { id: 'NODE_A1', name: 'Sindhi Camp Bus Terminal',   lat: 26.9185, lng: 75.7900, zone: 'ZONE_A_CENTRAL'  },
  { id: 'NODE_B2', name: 'MI Road Market Square',      lat: 26.9124, lng: 75.7873, zone: 'ZONE_B_GRID'     },
  { id: 'NODE_C3', name: 'Hawa Mahal Chowk',           lat: 26.9239, lng: 75.8267, zone: 'ZONE_C_METRO'    },
  { id: 'NODE_D4', name: 'JLN Marg Overpass',          lat: 26.8830, lng: 75.8070, zone: 'ZONE_D_OUTPOST'  },
  { id: 'NODE_E5', name: 'Vaishali Nagar Junction',    lat: 26.9101, lng: 75.7384, zone: 'ZONE_E_WEST'     },
  { id: 'NODE_F6', name: 'Malviya Nagar Market',       lat: 26.8574, lng: 75.8076, zone: 'ZONE_F_SOUTH'    },
  { id: 'NODE_G7', name: 'Amer Road Checkpoint',       lat: 26.9736, lng: 75.8469, zone: 'ZONE_G_NORTH'    },
];

// ── Global State ───────────────────────────────────────────────────
let activeNodeId   = null;
let activeMap      = null;
let nodeMarkers    = [];
let activeWS       = null;    // WebSocket connection to vision service
let faceRegistry   = [];      // Kept in sync via JSON messages from server
let frameCount     = 0;
let fpsStartTime   = Date.now();
let lastFrameTime  = 0;
let isPaused       = false;   // mirrors server pause state
let durationMs     = 0;       // total clip duration in ms
let positionMs     = 0;       // current playback position in ms

// ── Vision service URL ─────────────────────────────────────────────
const VISION_WS_URL = 'ws://localhost:8001/ws/camera';

// ── 1. Initialize Camera Nodes on Leaflet Map ──────────────────────
function initCameraNodes(map) {
  activeMap   = map;
  nodeMarkers = [];

  CAMERA_NODES.forEach(node => {
    const icon = L.divIcon({
      className: '',
      html: `
        <div class="phantompass-node-marker" data-node="${node.id}">
          <div class="node-ring"></div>
          <div class="node-core"></div>
          <div class="node-label">${node.id}</div>
        </div>`,
      iconSize:   [40, 40],
      iconAnchor: [20, 20]
    });

    const marker = L.marker([node.lat, node.lng], { icon })
      .addTo(map)
      .bindTooltip(
        `<span style="font-family:monospace;font-size:10px;color:#00fbfb">${node.name}<br/>
         <span style="color:#888">${node.zone}</span></span>`,
        { permanent: false, direction: 'top', className: 'aegis-tooltip' }
      );

    marker.on('click', () => openCameraModal(node));
    nodeMarkers.push({ marker, node });
  });

  console.log(`[PhantomPass] ${CAMERA_NODES.length} camera nodes placed on map.`);
}

// ── 2. Open Camera Modal on Node Click ────────────────────────────
async function openCameraModal(node) {
  activeNodeId = node.id;
  const modal = document.getElementById('phantompass-cam-modal');
  if (!modal) return;

  // Set header info
  document.getElementById('pm-node-id').textContent   = node.id;
  document.getElementById('pm-node-name').textContent = node.name;
  document.getElementById('pm-node-zone').textContent = node.zone;

  // Clear registry
  faceRegistry = [];
  frameCount   = 0;
  isPaused     = false;
  durationMs   = 0;
  positionMs   = 0;
  renderFaceRegistry();
  updateFpsDisplay(0);
  updatePlaybackUI();

  // Show modal
  modal.classList.remove('hidden');
  modal.classList.add('flex');

  // Set canvas to loading state
  const canvas = document.getElementById('pm-canvas');
  const ctx    = canvas.getContext('2d');
  canvas.width  = 854;
  canvas.height = 480;
  drawLoadingScreen(ctx, canvas, node.id);

  // Set status
  setModelStatus('connecting', `Connecting to GPU backend...`);

  // Connect WebSocket
  connectToVisionService(node, canvas, ctx);
}

// ── 3. WebSocket Connection to Python Vision Service ───────────────
function connectToVisionService(node, canvas, ctx) {
  // Close any existing connection
  if (activeWS) {
    activeWS.onclose = null;  // prevent auto-reconnect on manual close
    activeWS.close();
    activeWS = null;
  }

  const wsUrl = `${VISION_WS_URL}/${node.id}`;
  logToCam(`[CAM_INIT] Connecting to vision service: ${wsUrl}`);

  let ws;
  try {
    ws = new WebSocket(wsUrl);
  } catch (e) {
    handleVisionOffline(canvas, ctx, node);
    return;
  }

  ws.binaryType = 'arraybuffer';
  activeWS = ws;

  ws.onopen = () => {
    logToCam(`[CAM_INIT] GPU backend connected. Streaming ${node.id}...`);
    setModelStatus('ok', 'GPU BACKEND: CONNECTED | InsightFace RTX 3050');
    fpsStartTime = Date.now();
    frameCount   = 0;
  };

  ws.onmessage = (event) => {
    if (event.data instanceof ArrayBuffer) {
      // Binary = JPEG frame — draw directly to canvas
      renderJpegFrame(event.data, canvas, ctx);
    } else {
      // Text = JSON message (registry update, playback state, or error)
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'registry') {
          syncFaceRegistry(msg.faces);
        } else if (msg.type === 'playback') {
          syncPlaybackState(msg);
        } else if (msg.type === 'error') {
          logToCam(`[CAM_ERROR] ${msg.message}`);
          setModelStatus('error', `Backend error: ${msg.message}`);
        }
      } catch (e) {
        console.warn('[PhantomPass] JSON parse error:', e);
      }
    }
  };

  ws.onerror = (e) => {
    console.error('[PhantomPass] WebSocket error:', e);
    logToCam('[CAM_WARN] Vision service unreachable. Is consentcam_server running?');
    handleVisionOffline(canvas, ctx, node);
  };

  ws.onclose = (e) => {
    if (activeWS === ws) {
      // Only handle if this is still the active connection
      if (activeNodeId) {
        logToCam(`[CAM_WARN] Connection closed (code ${e.code}). Reconnecting in 2s...`);
        setModelStatus('reconnecting', 'Reconnecting...');
        setTimeout(() => {
          if (activeNodeId === node.id && activeWS === ws) {
            connectToVisionService(node, canvas, ctx);
          }
        }, 2000);
      }
    }
  };
}

// ── 4. Render JPEG Frame to Canvas ────────────────────────────────
function renderJpegFrame(buffer, canvas, ctx) {
  const blob = new Blob([buffer], { type: 'image/jpeg' });
  const url  = URL.createObjectURL(blob);
  const img  = new Image();

  img.onload = () => {
    // Ensure canvas matches incoming frame dimensions
    if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
    }
    ctx.drawImage(img, 0, 0);

    // If paused, draw a semi-transparent pause overlay
    if (isPaused) {
      drawPauseOverlay(ctx, canvas);
    }

    URL.revokeObjectURL(url);

    // FPS counter
    frameCount++;
    const now     = Date.now();
    const elapsed = (now - fpsStartTime) / 1000;
    if (elapsed >= 1.0) {
      updateFpsDisplay(Math.round(frameCount / elapsed));
      frameCount   = 0;
      fpsStartTime = now;
    }
    lastFrameTime = now;
  };

  img.onerror = () => URL.revokeObjectURL(url);
  img.src = url;
}

// ── 5. Sync Face Registry from Server ─────────────────────────────
function syncFaceRegistry(serverFaces) {
  faceRegistry = serverFaces;
  window._aegisFaceRegistry = faceRegistry;
  renderFaceRegistry();
}

// ── 5b. Sync Playback State from Server ───────────────────────────
function syncPlaybackState(msg) {
  isPaused   = msg.paused;
  durationMs = msg.durationMs || 0;
  positionMs = msg.positionMs || 0;
  updatePlaybackUI();
}

// ── 6. Send Consent & Playback Commands to Server ─────────────────
function sendCmd(obj) {
  if (!activeWS || activeWS.readyState !== WebSocket.OPEN) return;
  activeWS.send(JSON.stringify(obj));
}

window.revokeConsent = (faceEntryId) => {
  const entry = faceRegistry.find(e => e.id == faceEntryId);
  if (!entry) return;
  const action = entry.revoked ? 'restore' : 'revoke';
  sendCmd({ action, faceId: String(faceEntryId) });
  logToCam(`[PHANTOMPASS] Consent ${action.toUpperCase()} sent for ${entry.faceId} (${entry.token})`);
};

window.revokeAllConsents   = () => { sendCmd({ action: 'revoke_all'  }); logToCam('[PHANTOMPASS] ALL consent tokens REVOKED.'); };
window.restoreAllConsents  = () => { sendCmd({ action: 'restore_all' }); logToCam('[PHANTOMPASS] ALL consent tokens RESTORED.'); };

// Playback controls
window.camPause = () => {
  sendCmd({ action: 'pause' });
  logToCam('[CAM] Playback PAUSED');
};
window.camPlay = () => {
  sendCmd({ action: 'play' });
  logToCam('[CAM] Playback RESUMED');
};
window.camTogglePlay = () => {
  if (isPaused) window.camPlay(); else window.camPause();
};
window.camSeek = (deltaSec) => {
  sendCmd({ action: 'seek', delta: deltaSec });
  const dir = deltaSec > 0 ? `+${deltaSec}s` : `${deltaSec}s`;
  logToCam(`[CAM] Seek ${dir}`);
};

// Click on progress bar → seek to absolute position
window.camSeekToClick = (event, barEl) => {
  if (durationMs <= 0) return;
  const rect    = barEl.getBoundingClientRect();
  const clickX  = event.clientX - rect.left;
  const pct     = Math.max(0, Math.min(1, clickX / rect.width));
  const targetMs = pct * durationMs;
  const deltaSec = (targetMs - positionMs) / 1000;
  sendCmd({ action: 'seek', delta: deltaSec });
  logToCam(`[CAM] Seek to ${Math.round(targetMs / 1000)}s`);
};

// ── 7. Render Face Registry Table ─────────────────────────────────
function renderFaceRegistry() {
  const tbody = document.getElementById('pm-face-registry-body');
  if (!tbody) return;

  if (faceRegistry.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-[#00fbfb]/40 text-[10px] font-mono">Awaiting face detections...</td></tr>`;
    return;
  }

  tbody.innerHTML = faceRegistry.map(entry => `
    <tr class="border-b border-[#00fbfb]/10 hover:bg-[#00fbfb]/5 transition-colors" id="face-row-${entry.id}">
      <td class="p-2 font-mono text-[10px] text-[#00fbfb] font-bold">${entry.faceId}</td>
      <td class="p-2 font-mono text-[10px] text-white">${entry.token}</td>
      <td class="p-2 font-mono text-[9px] text-white/60">${entry.timestamp}</td>
      <td class="p-2 font-mono text-[9px]">
        ${entry.revoked
          ? `<span class="text-red-400 font-bold animate-pulse">REVOKED</span>`
          : `<span class="text-green-400 font-bold">ACTIVE</span>`}
      </td>
      <td class="p-2 text-right">
        ${entry.revoked
          ? `<button onclick="revokeConsent(${entry.id})"
              class="px-2 py-0.5 text-[8px] font-bold font-mono border border-green-500 text-green-500 hover:bg-green-500/10 active:scale-95 transition-all">
              RESTORE</button>`
          : `<button onclick="revokeConsent(${entry.id})"
              class="px-2 py-0.5 text-[8px] font-bold font-mono border border-red-500 text-red-500 hover:bg-red-500/10 animate-pulse active:scale-95 transition-all">
              REVOKE</button>`}
      </td>
    </tr>
  `).join('');

  const total   = faceRegistry.length;
  const revoked = faceRegistry.filter(e => e.revoked).length;
  const active  = total - revoked;
  const countEl = document.getElementById('pm-face-count');
  if (countEl) countEl.textContent = `${total} DETECTED | ${active} BLURRED | ${revoked} REVOKED`;
}

window._aegisRenderRegistry = renderFaceRegistry;

// ── 8. Close Modal & Stop Stream ───────────────────────────────────
window.closeCameraModal = () => {
  const modal = document.getElementById('phantompass-cam-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }

  // Close WebSocket
  if (activeWS) {
    activeWS.onclose = null;  // suppress auto-reconnect
    activeWS.close();
    activeWS = null;
  }

  activeNodeId = null;
  faceRegistry = [];
};

// ── 9. Offline Fallback (vision service not running) ──────────────
function handleVisionOffline(canvas, ctx, node) {
  setModelStatus('error', 'GPU BACKEND OFFLINE — Run start-vision.ps1');
  drawOfflineScreen(ctx, canvas, node.id);
  activeWS = null;
}

// ── 10. Canvas Draw Helpers ────────────────────────────────────────
function drawLoadingScreen(ctx, canvas, nodeId) {
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grid lines
  ctx.strokeStyle = 'rgba(0,251,251,0.05)';
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }

  ctx.fillStyle = '#00fbfb';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`CONNECTING TO GPU BACKEND`, canvas.width / 2, canvas.height / 2 - 20);
  ctx.fillStyle = 'rgba(0,251,251,0.5)';
  ctx.font = '10px monospace';
  ctx.fillText(`NODE: ${nodeId} | ws://localhost:8001`, canvas.width / 2, canvas.height / 2 + 8);
  ctx.fillStyle = 'rgba(0,251,251,0.3)';
  ctx.font = '9px monospace';
  ctx.fillText('Initializing InsightFace on RTX 3050...', canvas.width / 2, canvas.height / 2 + 28);
  ctx.textAlign = 'left';
}

function drawOfflineScreen(ctx, canvas, nodeId) {
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#ff4444';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('VISION SERVICE OFFLINE', canvas.width / 2, canvas.height / 2 - 30);

  ctx.fillStyle = 'rgba(255,68,68,0.6)';
  ctx.font = '10px monospace';
  ctx.fillText('Run: vision-service\\start-vision.ps1', canvas.width / 2, canvas.height / 2);
  ctx.fillText('Then click the camera node again.', canvas.width / 2, canvas.height / 2 + 20);

  ctx.fillStyle = 'rgba(0,251,251,0.3)';
  ctx.font = '9px monospace';
  ctx.fillText(`Expected: ws://localhost:8001/ws/camera/${nodeId}`, canvas.width / 2, canvas.height / 2 + 46);
  ctx.textAlign = 'left';
}

function drawPauseOverlay(ctx, canvas) {
  // Dim overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Pause icon
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const bw = 14, bh = 44, gap = 18;
  ctx.fillStyle = 'rgba(0, 251, 251, 0.9)';
  ctx.shadowColor = '#00fbfb';
  ctx.shadowBlur  = 20;
  ctx.fillRect(cx - gap / 2 - bw, cy - bh / 2, bw, bh);  // left bar
  ctx.fillRect(cx + gap / 2,      cy - bh / 2, bw, bh);  // right bar
  ctx.shadowBlur = 0;
  // PAUSED label
  ctx.fillStyle = 'rgba(0, 251, 251, 0.7)';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', cx, cy + bh / 2 + 20);
  ctx.textAlign = 'left';
}

// ── 11. Status Bar Helpers ─────────────────────────────────────────
function setModelStatus(type, text) {
  const el = document.getElementById('pm-model-status');
  if (!el) return;
  el.textContent = text;
  el.className = {
    ok:           'text-[8px] font-mono text-green-400',
    connecting:   'text-[8px] font-mono text-yellow-400 animate-pulse',
    reconnecting: 'text-[8px] font-mono text-yellow-500 animate-pulse',
    error:        'text-[8px] font-mono text-red-400',
  }[type] || 'text-[8px] font-mono text-[#00fbfb]';
}

function updateFpsDisplay(fps) {
  const el = document.getElementById('pm-fps');
  if (el) {
    el.textContent = `${fps} FPS`;
    el.className   = `text-[8px] font-mono ${fps >= 20 ? 'text-green-400' : fps >= 10 ? 'text-yellow-400' : 'text-red-400'}`;
  }
}

function updatePlaybackUI() {
  // Play/Pause button icon
  const btn = document.getElementById('pm-play-pause-btn');
  if (btn) {
    btn.innerHTML = isPaused
      ? '<span class="material-symbols-outlined text-base">play_arrow</span>'
      : '<span class="material-symbols-outlined text-base">pause</span>';
    btn.title = isPaused ? 'Resume' : 'Pause';
  }
  // Progress bar
  const bar    = document.getElementById('pm-progress-fill');
  const timeEl = document.getElementById('pm-time-display');
  if (durationMs > 0) {
    const pct = Math.min(100, (positionMs / durationMs) * 100);
    if (bar) bar.style.width = `${pct}%`;
    if (timeEl) {
      const fmtSec = (ms) => {
        const s = Math.floor(ms / 1000);
        const m = Math.floor(s / 60);
        return `${String(m).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
      };
      timeEl.textContent = `${fmtSec(positionMs)} / ${fmtSec(durationMs)}`;
    }
  }
  // Paused badge on HUD
  const badge = document.getElementById('pm-pause-badge');
  if (badge) badge.classList.toggle('hidden', !isPaused);
}

// ── 12. Log to Camera Console ─────────────────────────────────────
function logToCam(msg) {
  const el = document.getElementById('pm-cam-log');
  if (!el) return;
  const line    = document.createElement('div');
  const isWarn  = msg.includes('WARN') || msg.includes('REVOKE') || msg.includes('REVOKED') || msg.includes('ERROR');
  const isOk    = msg.includes('RESTORE') || msg.includes('INIT') || msg.includes('connected');
  line.className = `text-[9px] leading-tight mb-0.5 ${isWarn ? 'text-red-400' : isOk ? 'text-green-400' : 'text-[#00fbfb]/80'}`;
  line.textContent = msg;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

// ── 13. Expose to dashboard.js ─────────────────────────────────────
window.PhantomPassCam = {
  init:       initCameraNodes,
  loadModels: () => Promise.resolve(true),   // models load on server, not browser
};

// Global helper to open camera modal for a specific node ID
window.launchNodeFeed = (nodeId) => {
  const node = CAMERA_NODES.find(n => n.id === nodeId);
  if (node) {
    openCameraModal(node);
  } else {
    console.error(`[AEGIS] Node ${nodeId} not found in directory.`);
  }
};
