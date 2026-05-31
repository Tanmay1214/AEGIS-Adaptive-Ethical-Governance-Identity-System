/**
 * AEGIS Live Demo Caption Helper Overlay
 * Dynamically overlays an interactive caption bar at the bottom center of the screen
 * for a silent, professional live demonstration with clear typewriter explanations.
 */

(function () {
    // 1. Create and inject Tailwind styles and font overrides if needed
    const style = document.createElement('style');
    style.innerHTML = `
        .demo-caption-pulse {
            animation: caption-pulse 2s infinite;
        }
        @keyframes caption-pulse {
            0%, 100% { opacity: 1; border-color: rgba(16, 185, 129, 0.6); box-shadow: 0 0 15px rgba(16, 185, 129, 0.3); }
            50% { opacity: 0.9; border-color: rgba(16, 185, 129, 0.3); box-shadow: 0 0 5px rgba(16, 185, 129, 0.1); }
        }
    `;
    document.head.appendChild(style);

    // 2. Define the storyboard slides
    const slides = [
        {
            title: "AEGIS :: SYSTEM OVERVIEW",
            text: "Welcome to AEGIS (Adaptive Ethical Governance Identity System). This is the Admin Operator Dashboard. By default, face coordinates across all cameras are heavily blurred at the hardware edge to enforce strict citizen anonymity in public surveillance networks.",
            prompt: "Action: Point to the live map and camera node grids. Click [NEXT STEP] to demonstrate ConsentCam."
        },
        {
            title: "1. CONSENTCAM :: DYNAMIC VISUAL SHIELDS",
            text: "ConsentCam allows citizens to control their privacy live. On the Citizen Portal (left screen), toggle Geolocation Consent OFF. The portal initiates a 3.0s grace delay, after which the Operator Dashboard applies full Gaussian blurs and lowers the Privacy Trust Score dial.",
            prompt: "Action: Try toggling consent ON & OFF on the Citizen Portal. Watch the dashboard react in real-time."
        },
        {
            title: "2. PHANTOMPASS :: ZERO-KNOWLEDGE PROOFS",
            text: "PhantomPass clears camera checkpoints anonymously. On the Citizen Portal (left), click 'GENERATE ZK-RESIDENCY PROOF'. A secure SHA-256 HMAC nullifier (#TKN-XXXX) is issued, and a second-by-second countdown timer ticks down live on the dashboard until it expires.",
            prompt: "Action: Click 'GENERATE ZK-RESIDENCY PROOF' on the Citizen Portal. Watch the live ticker countdown."
        },
        {
            title: "3. CIVICVAULT :: SHAMIR'S SECRET SHARING",
            text: "CivicVault locks reports behind key splits. On the Citizen Portal, write a report and click 'FILE CRYPTOGRAPHIC REPORT'. On the dashboard, click 'INITIATE DECRYPTION'. Five jurors review the alert; only when 3-of-5 co-sign is the Lagrange polynomial solved to decrypt the text.",
            prompt: "Action: File a report, click 'INITIATE DECRYPTION', and watch the green juror consensus co-sign live."
        },
        {
            title: "4. FAIRWATCH AI :: BIAS FORECAST SUPPRESSION",
            text: "FairWatch AI intercepts crime forecasting. Unbiased profiles (high-income/majority) run cleanly. If parameters are changed to a protected class (low-income/minority) on the Citizen Portal, the ML model suppressés it, flashing a red SUPPRESSED badge to prevent profiling.",
            prompt: "Action: Run both unbiased and low-income forecasts on the Citizen Portal to show real-time audits."
        },
        {
            title: "AEGIS :: DEMO COMPLETE",
            text: "This concludes the silent integrated live demonstration. AEGIS successfully combines edge-computed computer vision shields, threshold cryptosystems, ZK residency assertions, and bias-intercepting ML audits to forge an ethical smart city architecture.",
            prompt: "Press [RESET] to restart the guided caption flow."
        }
    ];

    let currentSlideIndex = 0;

    // 3. Create the caption box DOM
    const captionContainer = document.createElement('div');
    captionContainer.id = "aegis-demo-helper";
    captionContainer.className = "fixed bottom-5 left-1/2 -translate-x-1/2 z-[99999] w-[95%] max-w-3xl bg-black/95 border border-emerald-500/50 shadow-[0_0_25px_rgba(16,185,129,0.35)] text-emerald-400 font-mono text-xs md:text-sm p-4 rounded-[4px] backdrop-blur-lg flex flex-col md:flex-row justify-between items-stretch gap-4 transition-all duration-300 demo-caption-pulse";
    
    const textSection = document.createElement('div');
    textSection.className = "flex-grow space-y-1.5 flex flex-col justify-center pr-2";
    
    const header = document.createElement('div');
    header.className = "text-[#00FBFB] font-bold text-[10px] md:text-xs uppercase tracking-wider flex items-center gap-2";
    header.innerHTML = `<span class="inline-block w-2.5 h-2.5 bg-[#00FBFB] rounded-full animate-ping"></span> <span id="caption-title">AEGIS :: SYSTEM OVERVIEW</span>`;
    
    const bodyText = document.createElement('p');
    bodyText.id = "caption-body";
    bodyText.className = "text-slate-100 font-mono text-[11px] md:text-[12.5px] leading-relaxed";
    bodyText.innerText = "";

    const promptText = document.createElement('div');
    promptText.id = "caption-prompt";
    promptText.className = "text-yellow-400 text-[10px] md:text-[11px] font-bold uppercase tracking-tight";
    promptText.innerText = "";

    textSection.appendChild(header);
    textSection.appendChild(bodyText);
    textSection.appendChild(promptText);

    // Controls Section
    const controls = document.createElement('div');
    controls.className = "flex md:flex-col justify-between md:justify-center items-center gap-2 border-t md:border-t-0 md:border-l border-emerald-500/20 pt-3 md:pt-0 md:pl-4 min-w-[120px]";

    const btnPrev = document.createElement('button');
    btnPrev.className = "px-3 py-1.5 border border-emerald-500/35 hover:bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded-[2px] transition-all w-full text-center";
    btnPrev.innerText = "<< PREV";
    btnPrev.onclick = () => navigate(-1);

    const btnNext = document.createElement('button');
    btnNext.className = "px-3 py-1.5 bg-emerald-500 text-black hover:bg-emerald-400 text-[10px] font-black rounded-[2px] transition-all w-full text-center tracking-widest";
    btnNext.innerText = "NEXT >>";
    btnNext.onclick = () => navigate(1);

    const btnToggle = document.createElement('button');
    btnToggle.className = "px-2 py-1 text-slate-500 hover:text-slate-300 text-[9px] font-mono transition-all text-center mt-1";
    btnToggle.innerText = "[HIDE CAPTIONS]";
    btnToggle.onclick = () => {
        captionContainer.classList.add('hidden');
        showFloatingButton();
    };

    controls.appendChild(btnNext);
    controls.appendChild(btnPrev);
    controls.appendChild(btnToggle);

    captionContainer.appendChild(textSection);
    captionContainer.appendChild(controls);
    document.body.appendChild(captionContainer);

    // Floating activation button when hidden
    const floatBtn = document.createElement('button');
    floatBtn.id = "aegis-caption-float";
    floatBtn.className = "fixed bottom-5 right-5 z-[99999] bg-emerald-600 text-white font-mono text-[10px] font-bold px-3 py-2 border border-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.5)] hover:bg-emerald-500 rounded-[2px] transition-all hidden";
    floatBtn.innerText = "⚡ AEGIS DEMO CAPTIONS";
    floatBtn.onclick = () => {
        floatBtn.classList.add('hidden');
        captionContainer.classList.remove('hidden');
    };
    document.body.appendChild(floatBtn);

    function showFloatingButton() {
        floatBtn.classList.remove('hidden');
    }

    // Typewriter effect variables
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
        btnPrev.className = currentSlideIndex === 0
            ? "px-3 py-1.5 border border-zinc-800 text-zinc-600 text-[10px] font-bold rounded-[2px] cursor-not-allowed w-full text-center"
            : "px-3 py-1.5 border border-emerald-500/35 hover:bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded-[2px] transition-all w-full text-center";
        
        btnNext.innerText = currentSlideIndex === slides.length - 1 ? "RESET" : "NEXT >>";
        if (currentSlideIndex === slides.length - 1) {
            btnNext.onclick = () => {
                currentSlideIndex = 0;
                updateSlide();
                btnNext.onclick = () => navigate(1);
            };
        } else {
            btnNext.onclick = () => navigate(1);
        }

        // Apply typewriter animation to body text
        typewrite(slide.text);
    }

    function typewrite(text) {
        if (typewriterInterval) clearInterval(typewriterInterval);
        bodyText.innerText = "";
        let charIndex = 0;
        
        typewriterInterval = setInterval(() => {
            if (charIndex < text.length) {
                bodyText.innerText += text.charAt(charIndex);
                charIndex++;
            } else {
                clearInterval(typewriterInterval);
            }
        }, 15); // extremely snappy typewriter effect
    }

    // Initialize first slide
    updateSlide();

    // 4. Listen to standard socket integrations or dashboard state changes to auto-suggest navigation if available!
    window.addEventListener('message', function(event) {
        // Listening for messages between tabs if used
    });
})();
