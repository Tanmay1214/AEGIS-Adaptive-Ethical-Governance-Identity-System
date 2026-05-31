/**
 * AEGIS Live Demo Caption Helper Overlay (Premium High-Contrast Edition)
 * Dynamically overlays an interactive caption bar at the bottom center of the screen
 * with perfect word wrapping, large readable text, and comprehensive feature coverage.
 */

(function () {
    // 1. Inject styling overrides for perfect word wrapping, layout flow, and glowing effects
    const style = document.createElement('style');
    style.innerHTML = `
        .demo-caption-pulse {
            animation: caption-pulse 2s infinite;
        }
        @keyframes caption-pulse {
            0%, 100% { 
                border-color: rgba(0, 251, 251, 0.6); 
                box-shadow: 0 0 20px rgba(0, 251, 251, 0.25), inset 0 0 10px rgba(0, 251, 251, 0.05); 
            }
            50% { 
                border-color: rgba(0, 251, 251, 0.3); 
                box-shadow: 0 0 8px rgba(0, 251, 251, 0.1), inset 0 0 5px rgba(0, 251, 251, 0.02); 
            }
        }
        .caption-text-glow {
            text-shadow: 0 0 8px rgba(255, 255, 255, 0.15);
        }
        .caption-accent-glow {
            text-shadow: 0 0 8px rgba(0, 251, 251, 0.4);
        }
    `;
    document.head.appendChild(style);

    // 2. Comprehensive, ultra-detailed slides covering EVERY feature of Members 1, 2, 3, and 4
    const slides = [
        {
            title: "AEGIS CORE SYSTEM OVERVIEW",
            text: "AEGIS (Adaptive Ethical Governance Identity System) is a monorepo full-stack smart city framework. It secures citizen privacy in public spaces using edge-computed computer vision shields, Zero-Knowledge residency tokens, consensus-driven encrypted secret-sharing vaults, and bias-suppressed crime forecasting pipelines. By default, face coordinates across all active cameras are heavily blurred at the hardware edge to enforce strict visual anonymity.",
            prompt: "ACTION: Review the monorepo grid panel layout, showing the active Leaflet Map and live camera nodes. Click [NEXT STEP] to demonstrate ConsentCam."
        },
        {
            title: "1. CONSENTCAM :: PRIVACY-BY-DEFAULT BLURRING & AUTHORIZED UNBLURRING",
            text: "Because AEGIS operates without any invasive identity-matching registry, every citizen's face is blurred initially by default (Privacy-by-Default). If official orders arrive from authorities to investigate a suspicious individual, the operator can selectively lift/revoke the blur on a live camera stream on the Operator Dashboard. This temporary visual bypass is fully-audited, logged in real-time, and dynamically reflected in the Privacy Trust Score dial.",
            prompt: "ACTION: Point to the blurred face overlays on the active camera feeds. Show how authorized unblur requests are logged and monitored on the Operator Dashboard."
        },
        {
            title: "2. PHANTOMPASS :: ZERO-KNOWLEDGE RESIDENCY PROOFS",
            text: "PhantomPass clears local checkpoints anonymously. When a citizen clicks 'GENERATE ZK-RESIDENCY PROOF' on the Citizen Portal (left), the system utilizes SHA-256 HMAC dynamic nullifiers to construct a ZK-Residency Proof token (#TKN-XXXX) for the target zone. The Operator Dashboard instantly registers this proof in the active registry ledger, starting a second-by-second live countdown timer ticker. When the validity period expires, the dashboard dynamically transitions the badge to a red, flashing REVOKED status.",
            prompt: "ACTION: Click 'GENERATE ZK-RESIDENCY PROOF' on the Citizen Portal. Watch the dashboard populate the ledger and initiate the real-time ticker."
        },
        {
            title: "3. CIVICVAULT :: 3-OF-5 SECRET SHARING CONSENSUS",
            text: "CivicVault secures sensitive incident reports behind cryptographic consensus. When a citizen submits a report on the Citizen Portal (left), the core Express backend splits the symmetric AES-like key into five unique coordinate shares using Shamir's Secret Sharing (SSS). On the Operator Dashboard, the report arrives in a LOCKED state. Click 'INITIATE DECRYPTION' to simulate citizen jurors co-signing. Only when a 3-of-5 signature threshold is gathered does the backend execute Lagrange finite-field polynomial interpolation to reconstruct the key and decrypt the payload.",
            prompt: "ACTION: File a report on the Citizen Portal, click 'INITIATE DECRYPTION' on the dashboard, and watch the green juror consensus co-sign live."
        },
        {
            title: "4. FAIRWATCH AI :: BIAS FORECAST SUPPRESSION & SHAP AUDITING",
            text: "FairWatch AI mitigates predictive redlining and discriminatory policing. When an operator runs a crime forecast, FastAPI runs the query against a trained Scikit-Learn Decision Tree classifier. It dynamically calculates SHAP demographic parity bias and income disparity weights. Running an unbiased majority profile displays a green PASSED audit badge. If parameters are shifted to a protected demographic (low-income/minority) on the Citizen Portal, the Fairness Score collapses below 65%, triggering automated suppression to block resource allocation.",
            prompt: "ACTION: Run an unbiased forecast (Passed), then run a low-income forecast on the Citizen Portal to witness the real-time AI suppression warning."
        },
        {
            title: "5. DEMO SPIKE :: CRITICAL THREAT & SYSTEMIC BLACKOUT",
            text: "We can simulate a critical privacy breach or bias attack. Click 'TRIGGER DEMO SPIKE (CRITICAL SHUTDOWN)' on the Operator Dashboard. The composite Privacy Trust Score instantly collapses below 50. In response, the system dynamically locks all video streams, applying heavy Gaussian visual blurs across all active camera feeds and initiating an emergency facial recognition blackout to protect public citizen anonymity.",
            prompt: "ACTION: Click the 'TRIGGER DEMO SPIKE (CRITICAL SHUTDOWN)' button on the right panel of the dashboard. Observe the complete systemic blackout response."
        },
        {
            title: "INTEGRATED DEMO COMPLETE :: PRIVACY BY DESIGN",
            text: "This concludes the silent live demonstration of the AEGIS architecture. By combining edge OpenCV/InsightFace face detection grids, multi-party Shamir Secret Sharing, time-locked ZK residency proof assertions, and FastAPI-based bias-suppressed SHAP forecasting models, AEGIS delivers a decentralized, robust, and mathematically sound model for next-generation smart city ethics.",
            prompt: "ACTION: Click [RESET] to restart the guided, captioned presentation flow."
        }
    ];

    let currentSlideIndex = 0;

    // 3. Create the caption box DOM elements with strict word wrapping and larger fonts
    const captionContainer = document.createElement('div');
    captionContainer.id = "aegis-demo-helper";
    captionContainer.className = "fixed bottom-5 left-1/2 -translate-x-1/2 z-[99999] w-[95%] max-w-4xl bg-[#070708]/98 border-2 border-[#00FBFB]/40 shadow-[0_0_30px_rgba(0,251,251,0.25)] p-5 rounded-[4px] backdrop-blur-xl flex flex-col gap-4 transition-all duration-300 demo-caption-pulse";
    
    // Text container
    const textSection = document.createElement('div');
    textSection.className = "w-full space-y-3 flex flex-col text-left";
    
    const header = document.createElement('div');
    header.className = "text-[#00FBFB] font-bold text-xs md:text-sm uppercase tracking-widest flex items-center gap-2 border-b border-[#00FBFB]/20 pb-2";
    header.innerHTML = `
        <span class="inline-block w-2.5 h-2.5 bg-[#00FBFB] rounded-full animate-ping"></span> 
        <span id="caption-title" class="caption-accent-glow">AEGIS CORE SYSTEM OVERVIEW</span>
    `;
    
    // Explicit styling for text wrapping and larger fonts
    const bodyText = document.createElement('p');
    bodyText.id = "caption-body";
    bodyText.className = "text-slate-100 font-mono text-[13px] md:text-[15px] leading-relaxed font-normal whitespace-normal break-words caption-text-glow";
    bodyText.style.cssText = "white-space: normal !important; word-wrap: break-word !important; overflow-wrap: break-word !important; word-break: normal !important; margin: 0; padding: 0;";

    const promptText = document.createElement('div');
    promptText.id = "caption-prompt";
    promptText.className = "text-yellow-400 text-[11px] md:text-[12px] font-bold uppercase tracking-wider bg-yellow-500/10 border border-yellow-500/20 px-3 py-1.5 rounded-[2px]";
    
    textSection.appendChild(header);
    textSection.appendChild(bodyText);
    textSection.appendChild(promptText);

    // Controls container
    const controls = document.createElement('div');
    controls.className = "w-full flex flex-row justify-between items-center gap-3 border-t border-emerald-500/20 pt-3 mt-1";

    const leftButtons = document.createElement('div');
    leftButtons.className = "flex gap-2";

    const btnPrev = document.createElement('button');
    btnPrev.className = "px-4 py-2 border border-emerald-500/35 hover:bg-emerald-500/10 text-emerald-400 text-[11px] font-bold rounded-[2px] transition-all min-w-[90px] uppercase tracking-wider active:scale-95";
    btnPrev.innerText = "PREV";
    btnPrev.onclick = () => navigate(-1);

    const btnToggle = document.createElement('button');
    btnToggle.className = "px-3 py-2 text-slate-500 hover:text-slate-300 text-[10px] font-mono transition-all uppercase";
    btnToggle.innerText = "[HIDE HUD]";
    btnToggle.onclick = () => {
        captionContainer.classList.add('hidden');
        showFloatingButton();
    };

    leftButtons.appendChild(btnPrev);
    leftButtons.appendChild(btnToggle);

    const btnNext = document.createElement('button');
    btnNext.className = "px-5 py-2.5 bg-[#00FBFB] text-black hover:bg-[#00fbfb]/80 text-[11px] font-black rounded-[2px] transition-all min-w-[120px] tracking-widest uppercase active:scale-95 shadow-[0_0_15px_rgba(0,251,251,0.3)]";
    btnNext.innerText = "NEXT STEP";
    btnNext.onclick = () => navigate(1);

    controls.appendChild(leftButtons);
    controls.appendChild(btnNext);

    captionContainer.appendChild(textSection);
    captionContainer.appendChild(controls);
    document.body.appendChild(captionContainer);

    // Floating activation button when hidden
    const floatBtn = document.createElement('button');
    floatBtn.id = "aegis-caption-float";
    floatBtn.className = "fixed bottom-5 right-5 z-[99999] bg-emerald-950 text-[#00FBFB] font-mono text-[10px] font-bold px-4 py-2.5 border border-[#00FBFB]/50 shadow-[0_0_20px_rgba(0,251,251,0.4)] hover:bg-[#00FBFB] hover:text-black rounded-[2px] transition-all hidden uppercase tracking-wider";
    floatBtn.innerText = "⚡ ACTIVATE CAPTION HUD";
    floatBtn.onclick = () => {
        floatBtn.classList.add('hidden');
        captionContainer.classList.remove('hidden');
    };
    document.body.appendChild(floatBtn);

    function showFloatingButton() {
        floatBtn.classList.remove('hidden');
    }

    // Typewriter state tracking
    let typewriterInterval = null;

    function navigate(direction) {
        currentSlideIndex += direction;
        if (currentSlideIndex < 0) currentSlideIndex = 0;
        if (currentSlideIndex >= slides.length) currentSlideIndex = slides.length - 1;
        
        updateSlide();
    }

    function updateSlide() {
        const slide = slides[currentSlideIndex];
        document.getElementById('caption-title').innerText = slide.title;
        document.getElementById('caption-prompt').innerText = slide.prompt;
        
        // Disable prev at first slide, change next text at last slide
        btnPrev.disabled = currentSlideIndex === 0;
        if (currentSlideIndex === 0) {
            btnPrev.className = "px-4 py-2 border border-zinc-800 text-zinc-600 text-[11px] font-bold rounded-[2px] cursor-not-allowed min-w-[90px] uppercase tracking-wider";
        } else {
            btnPrev.className = "px-4 py-2 border border-[#00FBFB]/30 hover:bg-[#00FBFB]/10 text-[#00FBFB] text-[11px] font-bold rounded-[2px] transition-all min-w-[90px] uppercase tracking-wider active:scale-95";
        }
        
        btnNext.innerText = currentSlideIndex === slides.length - 1 ? "RESET SYSTEM" : "NEXT STEP >>";
        if (currentSlideIndex === slides.length - 1) {
            btnNext.onclick = () => {
                currentSlideIndex = 0;
                updateSlide();
                btnNext.onclick = () => navigate(1);
            };
        } else {
            btnNext.onclick = () => navigate(1);
        }

        // Apply typewriter animation
        typewrite(slide.text);
    }

    function typewrite(text) {
        if (typewriterInterval) clearInterval(typewriterInterval);
        bodyText.innerText = "";
        let charIndex = 0;
        
        // Using substring slice rather than character accumulation to completely prevent dynamic word-breaking or spacing collapse
        typewriterInterval = setInterval(() => {
            if (charIndex <= text.length) {
                bodyText.textContent = text.slice(0, charIndex);
                charIndex++;
            } else {
                clearInterval(typewriterInterval);
            }
        }, 12); // snapped typewriter speed for smooth, professional visual progression
    }

    // Initialize first slide on load
    updateSlide();
})();
