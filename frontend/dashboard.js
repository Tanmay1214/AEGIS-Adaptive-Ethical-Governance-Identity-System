// =============================================================
// AEGIS Dashboard Core Logic (Vanilla JS Full-Stack Bindings)
// LNMIIT Jaipur // UNIT: Code Blooded
// =============================================================

// ── 1. Tailwind UI Configuration (Styles & Tokens) ────
if (typeof tailwind !== 'undefined') {
    tailwind.config = {
        darkMode: "class",
        theme: {
            extend: {
                colors: {
                    "secondary": "#ffb778",
                    "surface-bright": "#3a3939",
                    "primary-container": "#00fbfb",
                    "surface-dim": "#131313",
                    "error": "#ffb4ab",
                    "on-secondary-fixed-variant": "#6c3a00",
                    "on-error-container": "#ffdad6",
                    "on-primary-fixed": "#002020",
                    "on-primary-fixed-variant": "#004f4f",
                    "secondary-container": "#fd9000",
                    "secondary-fixed": "#ffdcc1",
                    "surface-variant": "#353534",
                    "on-surface-variant": "#b9cac9",
                    "on-secondary-container": "#613400",
                    "tertiary-container": "#ffdad8",
                    "surface-container-lowest": "#0e0e0e",
                    "tertiary-fixed-dim": "#ffb3b2",
                    "on-background": "#e5e2e1",
                    "on-tertiary-fixed-variant": "#92001e",
                    "surface-container": "#201f1f",
                    "outline": "#839493",
                    "tertiary-fixed": "#ffdad8",
                    "on-surface": "#e5e2e1",
                    "surface-container-highest": "#353534",
                    "on-tertiary-fixed": "#410008",
                    "on-primary-container": "#007070",
                    "surface-container-low": "#1c1b1b",
                    "on-tertiary-container": "#ca002d",
                    "surface": "#131313",
                    "on-error": "#690005",
                    "error-container": "#93000a",
                    "surface-tint": "#00dddd",
                    "primary-fixed": "#00fbfb",
                    "on-tertiary": "#680012",
                    "inverse-on-surface": "#313030",
                    "on-primary": "#003737",
                    "primary": "#ffffff",
                    "surface-container-high": "#2a2a2a",
                    "tertiary": "#ffffff",
                    "on-secondary": "#4c2700",
                    "primary-fixed-dim": "#00dddd",
                    "inverse-primary": "#006a6a",
                    "background": "#131313",
                    "secondary-fixed-dim": "#ffb778",
                    "outline-variant": "#3a4a49",
                    "on-secondary-fixed": "#2e1500",
                    "inverse-surface": "#e5e2e1"
                },
                fontFamily: {
                    "headline": ["Space Grotesk"],
                    "body": ["Space Grotesk"],
                    "label": ["Space Grotesk"]
                },
                borderRadius: { "DEFAULT": "0.25rem", "lg": "0.5rem", "xl": "0.75rem", "full": "9999px" },
            },
        },
    };
}

// ── 2. Live WebSockets & Telemetry calculations ────────────────
const SOCKET_URL = window.location.origin; // Socket.io served locally from Port 5000 Express

function initDashboard() {
    console.log("[AEGIS] Initializing WebSockets & Visual overlays...");
    
    // Connect websocket client
    const socket = io(SOCKET_URL);

    // Sidebar Tab Switching Interaction
    const tabs = document.querySelectorAll('aside [data-tab]');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active styles from all tabs, apply inactive styles
            tabs.forEach(t => {
                t.className = "text-[#007070] hover:bg-[#00FBFB]/10 hover:text-[#00FBFB] py-3 flex flex-col items-center justify-center active:scale-95 transition-transform w-full flex-shrink-0";
            });
            // Apply active styles to clicked tab
            tab.className = "bg-[#00FBFB] text-[#050505] shadow-[0_0_10px_#00FBFB] py-3 flex flex-col items-center justify-center active:scale-95 transition-transform w-full flex-shrink-0";
            
            const selectedTabId = tab.getAttribute('data-tab');
            console.log(`Switched view to tab: ${selectedTabId}`);
            
            // Toggle corresponding sections if they exist
            const contentPanels = document.querySelectorAll('.tab-content');
            contentPanels.forEach(panel => {
                if (panel.id === `tab-${selectedTabId}`) {
                    panel.classList.remove('hidden');
                } else {
                    panel.classList.add('hidden');
                }
            });
        });
    });

    // Dynamic UI selectors
    const dialScore = document.getElementById('dial-score-value');
    const dialStatus = document.getElementById('dial-status-text');
    const metricConsents = document.getElementById('metric-consents');
    const metricSuppressions = document.getElementById('metric-suppressions');
    const metricExpired = document.getElementById('metric-expired');
    const cameraEl = document.getElementById('camera-feed-mock');
    const blackoutEl = document.getElementById('blackout-warning');
    const consoleLogs = document.getElementById('panel-2-logs');

    // ── 3. WebSocket Event Listeners ─────────────────────────────────
    socket.on('trust-score-update', (data) => {
        console.log("[SOCKET_DATA] Score update received: ", data);
        
        const score = data.composite_score;
        const throttle = data.surveillance_throttle_level;

        // 1. Update circular dial values & colors
        if (dialScore) {
            dialScore.innerText = `${score}%`;
            dialScore.className = `text-6xl font-black tracking-tighter transition-all duration-300 ${
                score >= 80 ? 'text-[#00fbfb] drop-shadow-[0_0_10px_#00fbfb]' : 
                score >= 50 ? 'text-yellow-500 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]' : 
                'text-red-500 animate-pulse drop-shadow-[0_0_12px_#ff0000]'
            }`;
        }

        // 2. Update status label descriptions
        if (dialStatus) {
            dialStatus.innerText = `STATUS: ${
                throttle === 'NORMAL' ? 'NOMINAL' : 
                throttle === 'DEGRADED' ? 'THROTTLED_SCAN' : 
                'CRITICAL_BLACKOUT'
            }`;
            dialStatus.className = `text-[9px] mt-2 tracking-widest font-bold transition-colors ${
                throttle === 'NORMAL' ? 'text-green-400' : 
                throttle === 'DEGRADED' ? 'text-yellow-500 animate-pulse' : 
                'text-red-500 animate-bounce'
            }`;
        }

        // 3. Apply active visual blurs to ConsentCam Mock Feed & Modal Canvas Feed
        const pmCanvas = document.getElementById('pm-canvas');
        const pmBlackoutEl = document.getElementById('pm-blackout-warning');

        if (throttle === 'SHUTDOWN') {
            if (cameraEl) cameraEl.style.filter = "blur(20px) grayscale(100%)";
            if (blackoutEl) {
                blackoutEl.classList.remove('hidden');
                blackoutEl.classList.add('flex');
            }
            if (pmCanvas) pmCanvas.style.filter = "blur(20px) grayscale(100%)";
            if (pmBlackoutEl) {
                pmBlackoutEl.classList.remove('hidden');
                pmBlackoutEl.classList.add('flex');
            }
        } else if (throttle === 'DEGRADED') {
            if (cameraEl) cameraEl.style.filter = "blur(8px)";
            if (blackoutEl) {
                blackoutEl.classList.add('hidden');
                blackoutEl.classList.remove('flex');
            }
            if (pmCanvas) pmCanvas.style.filter = "blur(8px)";
            if (pmBlackoutEl) {
                pmBlackoutEl.classList.add('hidden');
                pmBlackoutEl.classList.remove('flex');
            }
        } else {
            if (cameraEl) cameraEl.style.filter = "none";
            if (blackoutEl) {
                blackoutEl.classList.add('hidden');
                blackoutEl.classList.remove('flex');
            }
            if (pmCanvas) pmCanvas.style.filter = "none";
            if (pmBlackoutEl) {
                pmBlackoutEl.classList.add('hidden');
                pmBlackoutEl.classList.remove('flex');
            }
        }

        // 4. Update core index counts
        if (metricConsents) metricConsents.innerText = data.metrics.active_consents;
        if (metricSuppressions) metricSuppressions.innerText = data.metrics.bias_suppressions;
        if (metricExpired) metricExpired.innerText = data.metrics.expired_credentials;

        // 5. Update Live Table Row status indicators for all 7 zones
        const zonesList = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
        const baseConsents = { a: 88, b: 75, c: 91, d: 67, e: 82, f: 78, g: 85 };

        zonesList.forEach(z => {
            const statusEl = document.getElementById(`zone-${z}-status`);
            const consentEl = document.getElementById(`zone-${z}-consent`);
            
            if (statusEl) {
                statusEl.innerText = throttle === 'SHUTDOWN' ? 'BLACKOUT' : throttle === 'DEGRADED' ? 'THROTTLED' : 'NOMINAL';
                statusEl.className = `p-3 font-bold ${throttle === 'SHUTDOWN' ? 'text-red-500 animate-pulse' : throttle === 'DEGRADED' ? 'text-yellow-500 animate-pulse' : 'text-green-400'}`;
            }

            if (consentEl) {
                // Dynamically scale zone consent values relative to current Trust Score
                const currentPct = Math.round(baseConsents[z] * (score / 95));
                consentEl.innerText = `${Math.max(12, Math.min(100, currentPct))}% Consent`;
            }
        });

        // B-specific emergency vault co-sign logic
        const zoneBVault = document.getElementById('zone-b-vault');
        if (zoneBVault) {
            if (data.metrics.decryptions_logged > 0) {
                zoneBVault.innerText = "UNLOCKED";
                zoneBVault.className = "px-2 py-0.5 border border-[#00fbfb] text-[#00fbfb] text-[9px] font-bold animate-fade-in";
            } else {
                zoneBVault.innerText = "AWAITING_JURY: 2/3";
                zoneBVault.className = "px-2 py-0.5 border border-yellow-500 text-yellow-500 text-[9px] font-bold animate-pulse";
            }
        }
    });

    socket.on('alert-log', (log) => {
        console.log("[SOCKET_LOG] Telemetry warning received: ", log);
        
        if (consoleLogs) {
            // Remove flashing cursor temporarily
            const cursor = consoleLogs.querySelector('.cursor-active');
            if (cursor) cursor.remove();

            const logLine = document.createElement('div');
            
            // Map text coloring depending on alert priority/types
            if (log.type === 'bias_suppression_alert' || log.type === 'critical_system_alert') {
                logLine.className = "text-yellow-400 mb-1 font-bold animate-pulse";
            } else if (log.type === 'consent_opt_out') {
                logLine.className = "text-red-400 mb-1 font-bold";
            } else if (log.type === 'civicvault_unlocked') {
                logLine.className = "text-[#00ff41] mb-1 font-bold";
            } else {
                logLine.className = "text-white mb-1 opacity-90";
            }

            const timestamp = new Date(log.timestamp).toLocaleTimeString();
            logLine.innerText = `[${timestamp}] ${log.message}`;
            
            consoleLogs.appendChild(logLine);

            // Append cursor back at bottom
            const newCursor = document.createElement('div');
            newCursor.className = "text-white mb-1 animate-pulse cursor-active";
            newCursor.innerText = "_█";
            consoleOutput = consoleLogs;
            consoleLogs.appendChild(newCursor);

            // Auto Scroll
            consoleLogs.scrollTop = consoleLogs.scrollHeight;
        }
    });

    // ── 4. Geographic Map Visualizer (Leaflet.js) ────────────────
    let mapEl = document.getElementById('map');
    if (mapEl) {
        if (typeof L !== 'undefined') {
            try {
                const map = L.map('map', {
                    zoomControl: true,
                    dragging: true,
                    scrollWheelZoom: true,
                    attributionControl: false
                }).setView([26.9124, 75.7873], 12);

                // Apply retro dark CartoDB tile layers without retina variables for standard cross-compatibility
                L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
                    maxZoom: 20
                }).addTo(map);


                // Force size recalculations to avoid Leaflet initial height collapse glitches
                setTimeout(() => { map.invalidateSize(); }, 100);
                setTimeout(() => { map.invalidateSize(); }, 300);
                setTimeout(() => {
                    map.invalidateSize();
                    // Initialize PhantomPass Camera Nodes on the map
                    // GPU models load on the Python vision server (ws://localhost:8001)
                    if (window.PhantomPassCam) {
                        window.PhantomPassCam.init(map);
                    }
                }, 1000);

                // Track mouse coordinates dynamically onto footer display metrics
                map.on('mousemove', (e) => {
                    const mouseLat = document.getElementById('mouseLat');
                    const mouseLon = document.getElementById('mouseLon');
                    const mouseSector = document.getElementById('mouseSector');
                    
                    if(mouseLat) mouseLat.innerText = e.latlng.lat.toFixed(4);
                    if(mouseLon) mouseLon.innerText = e.latlng.lng.toFixed(4);
                    
                    if(mouseSector) {
                        const secX = Math.floor((e.latlng.lng - 75.6) / 0.05);
                        const secY = Math.floor((e.latlng.lat - 26.7) / 0.05);
                        const sectorChar = String.fromCharCode(65 + (Math.abs(secX + secY) % 26));
                        mouseSector.innerText = `SECTOR_${sectorChar}_GRID_${Math.abs(secX)}${Math.abs(secY)}`;
                    }
                });

                // Invalidate size on overview tab activation or window resize
                window.addEventListener('resize', () => {
                    setTimeout(() => { map.invalidateSize(); }, 200);
                });
                const overviewTab = document.querySelector('aside [data-tab="overview"]');
                if (overviewTab) {
                    overviewTab.addEventListener('click', () => {
                        setTimeout(() => { map.invalidateSize(); }, 200);
                    });
                }
            } catch (e) {
                console.error("Leaflet initialization failed, falling back to SVG Tactical grid:", e);
                renderTacticalGrid(mapEl);
            }
        } else {
            console.warn("Leaflet library L is undefined (Offline Mode). Rendering SVG Tactical grid fallback...");
            renderTacticalGrid(mapEl);
        }
    }

    function renderTacticalGrid(el) {
        el.innerHTML = `
            <div class="absolute inset-0 flex flex-col items-center justify-center font-mono p-4 select-none pointer-events-none text-center bg-[#070707]">
                <!-- Glowing Tactical Radar Target Overlay -->
                <div class="relative w-36 h-36 border border-[#00FBFB]/20 rounded-full flex items-center justify-center animate-[spin_20s_linear_infinite] mb-4">
                    <div class="absolute w-28 h-28 border border-dashed border-[#00FBFB]/30 rounded-full"></div>
                    <div class="absolute w-16 h-16 border border-[#00FBFB]/40 rounded-full"></div>
                    <div class="absolute top-0 left-1/2 w-0.5 h-full bg-[#00FBFB]/10 -translate-x-1/2"></div>
                    <div class="absolute left-0 top-1/2 h-0.5 w-full bg-[#00FBFB]/10 -translate-y-1/2"></div>
                    <!-- Pulser Target Dot -->
                    <div class="absolute w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444] animate-ping" style="top: 25%; left: 35%;"></div>
                </div>
                <div class="text-[#00FBFB] text-[9px] font-black tracking-widest uppercase animate-pulse">
                    &gt; SECURE_GEOTARGETING_STANDBY<br/>
                    <span class="text-xs text-green-400 font-bold">[RADAR_PING_ACTIVE]</span>
                </div>
                <div class="absolute bottom-2 right-2 text-[8px] text-[#00FBFB]/60 text-right">
                    GRID: Ward 4 // sector_B<br/>
                    COORDS: 26.9124° N, 75.7873° E
                </div>
            </div>
        `;
        
        // Feed static coordinates to mouse tracking display
        const mouseLat = document.getElementById('mouseLat');
        const mouseLon = document.getElementById('mouseLon');
        const mouseSector = document.getElementById('mouseSector');
        if (mouseLat) mouseLat.innerText = "26.9124";
        if (mouseLon) mouseLon.innerText = "75.7873";
        if (mouseSector) mouseSector.innerText = "SECTOR_ALPHA_01";
    }

    // ── Live Webcam Capture Pipeline ──────────────────────────────────
    const webcamEl = document.getElementById('camera-feed-webcam');
    const mockImgEl = document.getElementById('camera-feed-mock');
    
    if (webcamEl && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        console.log("[AEGIS] Requesting user webcam permission...");
        navigator.mediaDevices.getUserMedia({ video: { width: 500, height: 375 } })
            .then(stream => {
                webcamEl.srcObject = stream;
                webcamEl.classList.remove('hidden');
                if (mockImgEl) mockImgEl.classList.add('hidden');
                console.log("[AEGIS] Webcam stream loaded successfully.");
            })
            .catch(err => {
                console.warn("[AEGIS] Webcam access blocked or unavailable. Using Unsplash stream loop:", err);
            });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}

// Use global API_URL if defined, otherwise fallback to local declaration to prevent SyntaxError
const DASH_API_URL = typeof API_URL !== 'undefined' ? `${API_URL}/api` : `${window.location.origin}/api`;

window.triggerDemoSpike = async () => {
    console.log("Triggering critical demo spike scenario...");
    try {
        const response = await fetch(`${DASH_API_URL}/demo/trigger-spike`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        console.log("Spike Scenario response:", data);
        alert("CRITICAL PRIVACY SPIKE TRIGGERED!\nTrust Score collapsed below 50.\nFacial recognition blackout active.");
    } catch (err) {
        console.error("Failed to trigger spike:", err);
    }
};

window.resetSystemDemo = async () => {
    console.log("Resetting AEGIS System State...");
    try {
        const response = await fetch(`${DASH_API_URL}/demo/reset`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        console.log("System Reset response:", data);
        alert("AEGIS System state successfully reset to base operations.");
    } catch (err) {
        console.error("Failed to reset system:", err);
    }
};

window.startCitizenDecryptionSimulation = async () => {
    const logEl = document.getElementById('decryption-console-logs');
    const citizen3 = document.getElementById('jury-citizen-3');
    const progressBar = document.getElementById('jury-progress-bar');
    const progressText = document.getElementById('jury-progress-text');
    const payloadBox = document.getElementById('encrypted-payload-box');

    if (!logEl || !citizen3) return;

    logEl.innerHTML += `<div class="text-[#00FBFB] mt-1">[SYS] Fetching latest CivicVault emergency record...</div>`;
    logEl.scrollTop = logEl.scrollHeight;

    try {
        const response = await fetch(`${DASH_API_URL}/civicvault/latest`);
        const message = await response.json();

        if (!message || !message.message_id) {
            logEl.innerHTML += `<div class="text-red-500 font-bold mt-1">⚠️ [ERROR] No emergency reports found in queue.</div>`;
            logEl.innerHTML += `<div class="text-yellow-500 mt-1">→ Please submit an encrypted report on the Citizen Portal first!</div>`;
            logEl.scrollTop = logEl.scrollHeight;
            alert("NO ACTIVE CIVICVAULT REPORTS FOUND!\nPlease go to the Citizen Portal, describe a violation, and click 'FILE CRYPTOGRAPHIC REPORT' first.");
            return;
        }

        const messageId = message.message_id;

        // Reset progress bar & juror tags to simulate signing
        if (progressBar) progressBar.style.width = "40%";
        if (progressText) {
            progressText.innerText = "2 OF 5 SIGNED (AWAITING CONSENSUS)";
            progressText.className = "text-yellow-500";
        }
        citizen3.className = "border border-[#00fbfb]/30 bg-[#070707] p-4 text-center rounded flex flex-col items-center shadow-none animate-pulse";
        citizen3.innerHTML = `
            <span class="material-symbols-outlined text-[#00fbfb]/60 text-3xl mb-1">lock</span>
            <span class="text-[10px] text-[#00fbfb]/80 font-bold">CITIZEN_3</span>
            <span class="text-[8px] text-outline mt-1 font-bold">PENDING</span>
        `;

        logEl.innerHTML += `<div class="text-[#00FBFB] mt-1">[SYS] Report found: ${messageId}. Initiating consensus unlock...</div>`;
        logEl.innerHTML += `<div class="text-white mt-1">[JURY] Requesting digital signature from Citizen 3...</div>`;
        logEl.scrollTop = logEl.scrollHeight;

        // Call sign endpoint for Juror 1 & Juror 2 first to ensure SSS key is stored
        await fetch(`${DASH_API_URL}/civicvault/sign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message_id: messageId, jury_id: 'citizen_jury_1', secret_share: 'share_01' })
        });
        await fetch(`${DASH_API_URL}/civicvault/sign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message_id: messageId, jury_id: 'citizen_jury_2', secret_share: 'share_02' })
        });

        // Simulate Citizen 3 signing after 1.5s
        setTimeout(async () => {
            try {
                // Submit the final unlocking signature
                const signRes = await fetch(`${DASH_API_URL}/civicvault/sign`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message_id: messageId, jury_id: 'citizen_jury_3', secret_share: 'share_03' })
                });
                const signData = await signRes.json();

                citizen3.className = "border border-green-500 bg-green-500/10 p-4 text-center rounded flex flex-col items-center shadow-[0_0_10px_rgba(34,197,94,0.3)] animate-none";
                citizen3.innerHTML = `
                    <span class="material-symbols-outlined text-green-400 text-3xl mb-1">lock_open</span>
                    <span class="text-[10px] text-green-400 font-bold">CITIZEN_3</span>
                    <span class="text-[8px] text-outline mt-1 font-bold">SIGNED</span>
                    <span class="text-[7px] text-green-400/80 truncate w-full mt-1">0x892a...</span>
                `;
                if (progressBar) progressBar.style.width = "60%";
                if (progressText) {
                    progressText.innerText = "3 OF 5 SIGNED (CONSENSUS UNLOCKED)";
                    progressText.className = "text-green-400 animate-pulse";
                }

                logEl.innerHTML += `<div class="text-green-400 font-bold mt-1">[JURY] Citizen 3 signature verified (0x892a...).</div>`;
                logEl.innerHTML += `<div class="text-[#00FBFB] mt-1">[SYS] Minimum of 3/5 signatures met. Compiling Shamir secret shares...</div>`;
                logEl.scrollTop = logEl.scrollHeight;

                // Reconstruct and decrypt payload after another 1.5s
                setTimeout(() => {
                    if (payloadBox) {
                        payloadBox.className = "text-[10px] text-green-400 font-bold break-all leading-tight max-w-[90%] animate-pulse";
                        payloadBox.innerText = `DECRYPTED PAYLOAD:
[RECORD ID: ${messageId}]
STATUS: ${signData.status}
JURY VERIFICATION BLOCK: #99A1-${Math.floor(100+Math.random()*900)}
${signData.decrypted_content}`;
                    }
                    logEl.innerHTML += `<div class="text-green-400 font-bold mt-1">[SYS] DECRYPTION SUCCESSFUL. Key reconstructed conceptually!</div>`;
                    logEl.scrollTop = logEl.scrollHeight;
                }, 1500);

            } catch (err) {
                console.error("Failed to sign report:", err);
            }
        }, 1500);

    } catch (err) {
        console.error("Failed to fetch latest CivicVault message:", err);
        logEl.innerHTML += `<div class="text-red-500 font-bold mt-1">⚠️ [ERROR] Connection failed.</div>`;
        logEl.scrollTop = logEl.scrollHeight;
    }
};

// ── Live PhantomPass Geotracking Opt-Out Consent Simulator ──────
let isConsentGranted = true;
let bufferInterval = null;

window.togglePhantomPassConsent = () => {
    const consentBtn = document.getElementById('phantompass-consent-btn');
    const webcam = document.getElementById('camera-feed-webcam');
    const mockImg = document.getElementById('camera-feed-mock');
    const shieldOverlay = document.getElementById('consent-shield-warning');
    const bufferOverlay = document.getElementById('buffer-countdown-overlay');
    const overlayTimer = document.getElementById('overlay-buffer-timer');
    const logEl = document.getElementById('panel-2-logs');

    if (!consentBtn) return;

    // Determine the active visual element
    const targetFeed = (webcam && !webcam.classList.contains('hidden')) ? webcam : mockImg;
    if (!targetFeed) return;

    if (isConsentGranted) {
        // Toggle state to REVOKED
        isConsentGranted = false;
        consentBtn.innerText = "CONSENT: REVOKED";
        consentBtn.className = "px-1.5 py-0.5 border border-red-500 text-red-500 text-[8px] font-bold hover:bg-red-500/10 active:scale-95 transition-all animate-pulse";
        
        if (logEl) {
            logEl.innerHTML += `<div class="text-yellow-500 font-bold mt-1">[PHANTOMPASS] Geotracking opt-out received for Token #TKN-9921 in Zone B.</div>`;
            logEl.innerHTML += `<div class="text-[#00FBFB] mt-1">[SYS] Grace period initiated: walkout buffer countdown started.</div>`;
            logEl.scrollTop = logEl.scrollHeight;
        }

        // Trigger Walkout Revocation Buffer Countdown (3.0s grace period)
        if (bufferOverlay && overlayTimer) {
            bufferOverlay.classList.remove('hidden');
            bufferOverlay.classList.add('flex');
            
            let timeLeft = 3.0;
            overlayTimer.innerText = `${timeLeft.toFixed(1)} SECS`;

            if (bufferInterval) clearInterval(bufferInterval);
            bufferInterval = setInterval(() => {
                timeLeft -= 0.1;
                if (timeLeft <= 0) {
                    clearInterval(bufferInterval);
                    bufferOverlay.classList.add('hidden');
                    bufferOverlay.classList.remove('flex');
                    
                    // Apply heavy blur
                    targetFeed.style.filter = "blur(25px) grayscale(80%)";
                    if (shieldOverlay) {
                        shieldOverlay.classList.remove('hidden');
                        shieldOverlay.classList.add('flex');
                    }
                    if (logEl) {
                        logEl.innerHTML += `<div class="text-red-500 font-black mt-1">[CONSENT_CAM] PRIVACY SHIELD LOCKED. Monitored video stream heavily blurred.</div>`;
                        logEl.scrollTop = logEl.scrollHeight;
                    }
                } else {
                    overlayTimer.innerText = `${timeLeft.toFixed(1)} SECS`;
                }
            }, 100);
        }
    } else {
        // Toggle state to GRANTED
        isConsentGranted = true;
        consentBtn.innerText = "CONSENT: GRANTED";
        consentBtn.className = "px-1.5 py-0.5 border border-[#00FBFB] text-[#00FBFB] text-[8px] font-bold hover:bg-[#00FBFB]/10 active:scale-95 transition-all";
        
        if (bufferInterval) clearInterval(bufferInterval);
        if (bufferOverlay) {
            bufferOverlay.classList.add('hidden');
            bufferOverlay.classList.remove('flex');
        }
        if (shieldOverlay) {
            shieldOverlay.classList.add('hidden');
            shieldOverlay.classList.remove('flex');
        }

        // Lift blur
        targetFeed.style.filter = "none";
        
        if (logEl) {
            logEl.innerHTML += `<div class="text-green-400 font-bold mt-1">[PHANTOMPASS] Zero-Knowledge Ward residency verified for Token #TKN-9921.</div>`;
            logEl.innerHTML += `<div class="text-[#00FBFB] mt-1">[SYS] Opt-out revoked. Re-authenticating camera stream access.</div>`;
            logEl.scrollTop = logEl.scrollHeight;
        }
    }
};

// ── PhantomPass Bulk Consent Controls ────────────────────────────────
window.revokeAllConsents = () => {
    if (typeof faceRegistry === 'undefined' || !window.faceRegistry) {
        // Access from camera-node.js scope via a shared global
        if (window._aegisFaceRegistry) {
            window._aegisFaceRegistry.forEach(e => { e.revoked = true; });
            if (window._aegisRenderRegistry) window._aegisRenderRegistry();
        }
        return;
    }
};

window.restoreAllConsents = () => {
    if (window._aegisFaceRegistry) {
        window._aegisFaceRegistry.forEach(e => { e.revoked = false; });
        if (window._aegisRenderRegistry) window._aegisRenderRegistry();
    }
};

// ── Live Simulated Telemetry Stream Generator (Disabled to prevent log clutter) ──
/*
(() => {
    const templates = [
        { text: "[TRANSIT] ZK proof resident nullifier token verified successfully.", color: "text-[#00FBFB]" },
        { text: "[AUDIT] SHAP Fairness Auditor evaluated prediction grid. Fairness: 98.4% (PASS).", color: "text-green-400" },
        { text: "[DATABASE] Zero-Knowledge proof ledger transaction committed to IPFS node.", color: "text-zinc-400 opacity-80" },
        { text: "[NETWORK] Encrypted socket handshake completed with camera node NODE_C3.", color: "text-[#00FBFB]" },
        { text: "[MEM_SYS] CUDA memory heap optimized on GPU backend (RTX 3050). Efficiency: 94.2%.", color: "text-zinc-400 opacity-80" },
        { text: "[PHANTOMPASS] Generated dynamic transient proof-of-residency nullifier.", color: "text-[#00FBFB]" },
        { text: "[SHIELD] Gaussian pixelation active on face bounding coordinates.", color: "text-green-400 opacity-90" },
        { text: "[CIVICVAULT] Sybil audit passed. Consensus weights verified across jury pool.", color: "text-[#00FBFB]" },
        { text: "[AUDIT] Demographics variance checked. Marginal parity deviation is inside nominal limits (0.04).", color: "text-green-400" },
        { text: "[TRANSIT] Walkout buffer window refreshed. Cooldown parameters stable.", color: "text-[#00FBFB]" },
    ];

    setInterval(() => {
        const consoleLogs = document.getElementById('panel-2-logs');
        if (!consoleLogs) return;

        // Skip generating synthetic logs if we are in SHUTDOWN / critical blackout (so it doesn't clutter important error logs)
        const dialStatus = document.getElementById('dial-status-text');
        if (dialStatus && dialStatus.innerText.includes('CRITICAL_BLACKOUT')) {
            return;
        }

        // Select random template
        const template = templates[Math.floor(Math.random() * templates.length)];
        
        // Remove flashing cursor temporarily
        const cursor = consoleLogs.querySelector('.cursor-active');
        if (cursor) cursor.remove();

        const logLine = document.createElement('div');
        logLine.className = `${template.color} mb-1`;
        
        const timestamp = new Date().toLocaleTimeString();
        logLine.innerText = `[${timestamp}] ${template.text}`;
        
        consoleLogs.appendChild(logLine);

        // Append cursor back at bottom
        const newCursor = document.createElement('div');
        newCursor.className = "text-white mb-1 animate-pulse cursor-active";
        newCursor.innerText = "_█";
        consoleLogs.appendChild(newCursor);

        // Auto Scroll
        consoleLogs.scrollTop = consoleLogs.scrollHeight;
    }, 4500); // Trigger every 4.5 seconds
})();
*/
