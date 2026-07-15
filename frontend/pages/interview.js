/* ============================================================
   InterviewAI — Active Interview Page  (pages/interview.js)
   ============================================================ */

let recognition = null;
let faceMesh = null;
let cameraInstance = null;
let cvAnimationId = null;
let cheatCheckInterval = null;
let lookAwaySeconds = 0;
let silenceSeconds = 0;
let recordingStartTime = 0;

/* -------- Entry point -------- */

async function startInterview() {
    try {
        state.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch (e) {
        console.warn('Camera access denied or unavailable, simulating video feed');
        state.stream = null;
    }
    
    state.step            = 4;
    state.interviewActive = true;
    state.currentQuestion = 0;
    state.chatMessages    = [];
    state.answers         = [];
    state.warnings        = [];
    state.isFollowUpActive = false;
    state.lastEvaluation  = null;
    state.evaluations     = [];
    state.cheatingStats   = { lookedAwayCount: 0, multipleFacesCount: 0, mobileDetectedCount: 0, secondsLookedAway: 0 };
    state.simulations     = { lookAway: false, noFace: false, multipleFaces: false, phoneUsage: false };
    
    render();
    initSpeechRecognition();
    startInterviewFlow();
    startRealtimeSimulation();
    
    // Bind Real MediaPipe Face Mesh if camera stream exists
    setTimeout(() => {
        if (state.stream) {
            initMediaPipe();
        } else {
            startCvCanvas();
        }
    }, 500);
}

/* -------- MediaPipe CV Camera Integration -------- */

function initMediaPipe() {
    const video = document.getElementById('webcam');
    const canvas = document.getElementById('cvCanvas');
    if (!video || !canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    try {
        faceMesh = new FaceMesh({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
            }
        });

        faceMesh.setOptions({
            maxNumFaces: 2,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        faceMesh.onResults((results) => {
            if (!state.interviewActive) return;
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const w = canvas.width;
            const h = canvas.height;

            // A. Check for Face Absence
            if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
                if (!state.simulations.noFace) {
                    state.simulations.noFace = true;
                    const warningMsg = 'Face missing. Return to the camera viewport.';
                    if (!state.warnings.includes(warningMsg)) {
                        state.warnings.unshift(warningMsg);
                        updateWarningsList();
                        showTopBanner('FACE NOT DETECTED');
                    }
                }
                
                ctx.fillStyle = 'rgba(10, 10, 10, 0.85)';
                ctx.fillRect(0, 0, w, h);
                return;
            }

            state.simulations.noFace = false;
            // Clear the immediate warning if they return
            state.warnings = state.warnings.filter(w => !w.includes('Face missing'));
            updateWarningsList();

            // B. Check for Multiple People (Cheating Detection)
            if (results.multiFaceLandmarks.length > 1) {
                if (!state.simulations.multipleFaces) {
                    state.simulations.multipleFaces = true;
                    const warningMsg = 'Multiple people detected in frame!';
                    if (!state.warnings.includes(warningMsg)) {
                        state.warnings.unshift(warningMsg);
                        state.cheatingStats.multipleFacesCount++;
                        updateWarningsList();
                        showTopBanner('MULTIPLE PEOPLE DETECTED');
                    }
                }
            } else {
                state.simulations.multipleFaces = false;
                state.warnings = state.warnings.filter(w => !w.includes('Multiple people detected'));
                updateWarningsList();
            }

            // Loop and draw landmarks for detected faces
            for (let fIdx = 0; fIdx < results.multiFaceLandmarks.length; fIdx++) {
                const landmarks = results.multiFaceLandmarks[fIdx];
                
                // Find face bounding rect
                let minX = 1, maxX = 0, minY = 1, maxY = 0;
                landmarks.forEach(pt => {
                    if (pt.x < minX) minX = pt.x;
                    if (pt.x > maxX) maxX = pt.x;
                    if (pt.y < minY) minY = pt.y;
                    if (pt.y > maxY) maxY = pt.y;
                });
                
                const bX = minX * w;
                const bY = minY * h;
                const bW = (maxX - minX) * w;
                const bH = (maxY - minY) * h;

                // Gaze tracking logic for the main candidate (face index 0)
                if (fIdx === 0 && landmarks.length > 473) {
                    const iris = landmarks[468]; // left iris center
                    const outerCorner = landmarks[33]; // left eye outer
                    const innerCorner = landmarks[133]; // left eye inner
                    
                    if (iris && outerCorner && innerCorner) {
                        const eyeWidth = Math.abs(outerCorner.x - innerCorner.x);
                        const irisRatio = Math.abs(iris.x - outerCorner.x) / eyeWidth;
                        
                        // Deviances outside center range represent looking far left/right
                        if (irisRatio < 0.30 || irisRatio > 0.70) {
                            state.simulations.lookAway = true;
                        } else {
                            state.simulations.lookAway = false;
                        }
                    }
                }

                // Decide coloring based on status
                let borderCol = '#22c55e'; // default green
                let tagText = `FACE TRACKED (CONF: ${Math.round((landmarks[0].z + 1.2) * 100)}%)`;
                
                if (fIdx === 0 && state.simulations.lookAway) {
                    borderCol = '#eab308'; // yellow look-away
                    tagText = 'WARNING: LOOKING AWAY';
                }
                if (fIdx > 0) {
                    borderCol = '#ef4444'; // red cheat alert
                    tagText = 'WARNING: MULTIPLE FACES DETECTED';
                }

                // Draw bounding box
                ctx.strokeStyle = borderCol;
                ctx.lineWidth = 1.5;
                ctx.strokeRect(bX - 5, bY - 5, bW + 10, bH + 10);
                
                // Premium label background
                ctx.fillStyle = borderCol;
                const textWidth = ctx.measureText(tagText).width;
                ctx.fillRect(bX - 5, bY - 20, textWidth + 10, 15);
                
                ctx.fillStyle = '#111'; // Dark text for contrast
                ctx.font = 'bold 9px monospace';
                ctx.textAlign = 'left';
                ctx.fillText(tagText, bX, bY - 10);

                // Draw specific facial landmarks (lips, eyes, outline)
                ctx.fillStyle = fIdx > 0 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(51, 163, 255, 0.5)';
                const indices = [
                    10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
                    33, 160, 158, 133, 153, 144, 468, // Left eye + iris
                    362, 385, 387, 263, 373, 380, 473, // Right eye + iris
                    1, 2, 98, 327, // Nose
                    78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308 // Lips
                ];
                
                indices.forEach(idx => {
                    const pt = landmarks[idx];
                    if (pt) {
                        ctx.beginPath();
                        ctx.arc(pt.x * w, pt.y * h, 1.2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                });

                // Draw gaze vector line extending from left eye iris
                if (fIdx === 0 && landmarks[468]) {
                    const lIris = landmarks[468];
                    const lx = lIris.x * w;
                    const ly = lIris.y * h;
                    
                    ctx.strokeStyle = state.simulations.lookAway ? '#ef4444' : '#22c55e';
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.moveTo(lx, ly);
                    if (state.simulations.lookAway) {
                        ctx.lineTo(lx - 50, ly + 15);
                    } else {
                        ctx.lineTo(lx, ly - 25);
                    }
                    ctx.stroke();
                }
            }

            // Draw YOLO Phone Bounding box overlay if simulated
            if (state.simulations.phoneUsage) {
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 2;
                const px = w - 100;
                const py = h - 110;
                ctx.strokeRect(px, py, 50, 80);
                
                ctx.fillStyle = '#ef4444';
                ctx.font = 'bold 8px monospace';
                ctx.fillText('YOLOv8: CELL PHONE DETECTED', px, py - 4);
                
                ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
                ctx.fillRect(px, py, 50, 80);
            }
        });

        // Initialize Camera utility
        cameraInstance = new Camera(video, {
            onFrame: async () => {
                if (!state.interviewActive) return;
                
                // Run FaceMesh (runs fast, optimized for 30fps)
                if (faceMesh) {
                    await faceMesh.send({ image: video });
                }
            },
            width: 640,
            height: 480
        });
        
        cameraInstance.start().catch(err => {
            console.warn("Camera frame capture throw. Falling back to offline mesh simulator.", err);
            startCvCanvas();
        });
    } catch(err) {
        console.error("Failed to initialize MediaPipe Face Mesh, running offline scan grids", err);
        startCvCanvas();
    }
}

/* -------- Speech Recognition -------- */

let mediaRecorder = null;
let audioChunks = [];

function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        console.warn('Web Speech API is not supported in this browser. Falling back to typing.');
        return;
    }
    
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
        // state.isRecording = true; handled by startRecording
        recordingStartTime = Date.now();
        state.transcript = '';
        render();
    };
    
    recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        
        const fullTranscript = (state.transcript + ' ' + finalTranscript + ' ' + interimTranscript).trim();
        
        // Show in text input
        const input = document.getElementById('textInput');
        if (input) {
            input.value = fullTranscript;
        }
        
        // Count filler words live
        let words = fullTranscript.toLowerCase().split(/\s+/);
        let fillerCount = 0;
        words.forEach(w => {
            if (FILLER_WORDS.includes(w) || w === 'um' || w === 'ah') fillerCount++;
        });
        
        state.metrics.fillerWords = fillerCount;
        const liveFillers = document.getElementById('liveFillerWords');
        if (liveFillers) liveFillers.textContent = fillerCount;
        
        // Calculate WPM live
        const durationSec = (Date.now() - recordingStartTime) / 1000;
        if (durationSec > 2) {
            const wpm = Math.round((words.length / durationSec) * 60);
            state.metrics.speakingSpeed = wpm;
            const liveWPM = document.getElementById('liveWPM');
            if (liveWPM) liveWPM.textContent = wpm;
        }
    };
    
    recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        if (event.error === 'not-allowed') {
            alert('Microphone access blocked. Please type your answers instead.');
            stopRecording();
        }
    };
    
    recognition.onend = () => {
        if (state.isRecording && recognition) {
            try { recognition.start(); } catch(e) {}
        }
    };
}

async function startRecording() {
    if (state.isRecording) {
        await stopRecording();
        return;
    }
    
    // Mute any active AI speech output when recording starts
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    
    if (recognition) {
        try { recognition.start(); } catch(e) { console.error('Failed to start recognition', e); }
    }
    
    if (state.stream) {
        audioChunks = [];
        mediaRecorder = new MediaRecorder(state.stream);
        mediaRecorder.ondataavailable = e => {
            if (e.data.size > 0) audioChunks.push(e.data);
        };
        mediaRecorder.start();
        state.isRecording = true;
        recordingStartTime = Date.now();
        render();
    }
}

function stopRecording() {
    return new Promise((resolve) => {
        if (!state.isRecording) {
            resolve();
            return;
        }
        
        state.isRecording = false;
        
        if (recognition) {
            try { recognition.stop(); } catch(e) {}
        }
        
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const input = document.getElementById('textInput');
                if (input) input.placeholder = "Transcribing with Whisper...";
                render();
                
                try {
                    const response = await API.transcribeAudio(audioBlob);
                    if (response.status === 'success' && response.transcription && response.transcription.text) {
                        state.transcript = response.transcription.text;
                        if (input) input.value = state.transcript;
                    }
                } catch (err) {
                    console.error("Backend transcription failed", err);
                }
                
                if (input) input.placeholder = "Type your answer or use microphone...";
                render();
                resolve();
            };
            mediaRecorder.stop();
        } else {
            const input = document.getElementById('textInput');
            if (input && input.value.trim()) {
                state.transcript = input.value.trim();
            }
            render();
            resolve();
        }
    });
}

/* -------- Renderer -------- */

function renderActiveInterview() {
    const name     = state.candidateName || 'Candidate';
    const question = state.questions[state.currentQuestion];
    const totalQ   = state.questions.length;
    
    const progressText = state.isFollowUpActive 
        ? `Follow-up to Q${state.currentQuestion + 1}` 
        : `Q${state.currentQuestion + 1} of ${totalQ}`;

    app.innerHTML = `
    <div class="interview-shell min-h-screen text-slate-100 font-sans selection:bg-blue-300/30">
        <!-- Top Bar -->
        <div class="fixed top-0 w-full z-40 bg-slate-950/88 backdrop-blur-md border-b border-white/10">
            <div class="max-w-7xl mx-auto px-4 py-3">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="flex items-center gap-2">
                            <div class="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse"></div>
                            <span class="text-white text-xs font-semibold uppercase tracking-wider">Live Session</span>
                        </div>
                        <span class="text-white/20">|</span>
                        <span class="text-slate-300 text-xs hidden sm:inline">${name} &middot; ${state.jobRole}</span>
                    </div>
                    <div class="flex items-center gap-4">
                        <span class="text-slate-200 text-xs font-mono bg-white/5 border border-white/10 px-2.5 py-1 rounded-md">${progressText}</span>
                        <button onclick="endInterview()" class="text-rose-300 hover:text-white transition-colors text-xs font-semibold border border-rose-400/30 hover:bg-rose-500 px-3 py-1.5 rounded-md">
                            End Session
                        </button>
                    </div>
                </div>
                <div class="w-full bg-white/10 rounded-full h-1 mt-2.5 overflow-hidden">
                    <div class="bg-gradient-to-r from-blue-400 to-emerald-400 h-1 rounded-full transition-all duration-500"
                         style="width:${((state.currentQuestion) / totalQ) * 100}%"></div>
                </div>
            </div>
        </div>

        <div class="max-w-7xl mx-auto px-4 pt-20 pb-8">
            <div class="flex items-center justify-between pt-4 pb-2">
                <div>
                    <p class="text-[10px] uppercase tracking-[.24em] text-blue-300 font-bold">Interview workspace</p>
                    <h1 class="text-xl sm:text-2xl font-semibold text-white mt-1">Stay present. Think out loud.</h1>
                </div>
                <div class="hidden sm:flex items-center gap-2 text-[10px] text-slate-400 uppercase tracking-widest"><span class="w-2 h-2 bg-emerald-400 rounded-full"></span>Secure session</div>
            </div>
            <div class="grid lg:grid-cols-3 gap-6">

                <!-- Left Column (Video HUD & Chat) -->
                <div class="lg:col-span-2 space-y-6">
                    ${_cameraPanel()}
                    ${_chatPanel(question)}
                </div>

                <!-- Right Column (Simulator Panels & Logs) -->
                <div class="space-y-6">
                    ${_questionInfo(question)}
                    ${_simulationPanel()}
                    ${_liveMetrics()}
                    ${_ragEvaluatorPanel()}
                    ${_warningsPanel()}
                    ${_agentStatusPanel()}
                </div>
            </div>
        </div>
    </div>
    `;

    if(window.lucide) { setTimeout(() => lucide.createIcons(), 10); }

    const video = document.getElementById('webcam');
    if (video && state.stream) {
        video.srcObject = state.stream;
    }
}

/* -------- Fallback Computer Vision Drawer -------- */

function startCvCanvas() {
    const canvas = document.getElementById('cvCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
    }
    resizeCanvas();
    
    const baseKeypoints = [];
    for (let i = 0; i < 40; i++) {
        baseKeypoints.push({
            x: 0.5 + (Math.random() - 0.5) * 0.25,
            y: 0.55 + (Math.random() - 0.5) * 0.35
        });
    }

    function draw() {
        if (!state.interviewActive) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const w = canvas.width;
        const h = canvas.height;

        if (state.simulations.noFace) {
            ctx.fillStyle = 'rgba(10, 10, 10, 0.85)';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 13px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('🔴 FACE NOT DETECTED', w / 2, h / 2 - 10);
            cvAnimationId = requestAnimationFrame(draw);
            return;
        }

        const driftX = Math.sin(Date.now() / 400) * 8;
        const driftY = Math.cos(Date.now() / 600) * 5;
        let faceCenterX = w / 2 + driftX;
        let faceCenterY = h / 2 + 15 + driftY;
        
        let isLookedAway = state.simulations.lookAway;
        let boxColor = isLookedAway ? '#eab308' : '#22c55e';
        let boxText = isLookedAway ? 'WARNING: LOOKING AWAY' : 'FACE TRACKED (98.4%)';
        
        if (isLookedAway) faceCenterX -= 40;

        ctx.strokeStyle = boxColor;
        ctx.lineWidth = 1.5;
        const boxW = 120;
        const boxH = 150;
        ctx.strokeRect(faceCenterX - boxW/2, faceCenterY - boxH/2, boxW, boxH);
        
        ctx.fillStyle = boxColor;
        ctx.font = 'bold 8px monospace';
        ctx.fillText(boxText, faceCenterX - boxW/2 + 2, faceCenterY - boxH/2 - 5);

        // Draw points
        ctx.fillStyle = isLookedAway ? 'rgba(234, 179, 8, 0.6)' : 'rgba(51, 163, 255, 0.7)';
        baseKeypoints.forEach(pt => {
            const px = faceCenterX + (pt.x - 0.5) * boxW;
            const py = faceCenterY + (pt.y - 0.55) * boxH;
            ctx.beginPath();
            ctx.arc(px, py, 1.2, 0, Math.PI * 2);
            ctx.fill();
        });

        cvAnimationId = requestAnimationFrame(draw);
    }
    
    cvAnimationId = requestAnimationFrame(draw);
}

/* -------- Realtime Simulations (1s ticker) -------- */

let frameAnalysisInterval = null;

function startRealtimeSimulation() {
    cheatCheckInterval = setInterval(() => {
        if (!state.interviewActive) {
            clearInterval(cheatCheckInterval);
            return;
        }

        if (state.simulations.lookAway) {
            lookAwaySeconds++;
            state.cheatingStats.secondsLookedAway++;
            state.metrics.eyeContactScore = Math.max(1.0, (state.metrics.eyeContactScore - 0.7).toFixed(1));
            
            if (lookAwaySeconds >= 3) {
                const warningMsg = 'Looking away detected for >3 seconds. Please maintain eye contact.';
                if (!state.warnings.includes(warningMsg)) {
                    state.warnings.unshift(warningMsg);
                    state.cheatingStats.lookedAwayCount++;
                    
                    const banner = document.getElementById('cheatingWarning');
                    if (banner) {
                        banner.textContent = `⚠️ Please maintain eye contact with the camera`;
                        banner.classList.remove('hidden');
                        setTimeout(() => banner.classList.add('hidden'), 3500);
                    }
                    updateWarningsList();
                }
            }
        } else {
            lookAwaySeconds = 0;
            state.metrics.eyeContactScore = Math.min(9.8, parseFloat(state.metrics.eyeContactScore) + 0.1).toFixed(1);
        }

        if (state.simulations.noFace) {
            state.metrics.eyeContactScore = Math.max(0.0, (state.metrics.eyeContactScore - 1.2).toFixed(1));
        }

        if (state.simulations.multipleFaces) {
            state.metrics.eyeContactScore = Math.max(0.0, (state.metrics.eyeContactScore - 0.5).toFixed(1));
        }

        if (state.simulations.phoneUsage) {
            const warningMsg = 'Mobile phone usage detected (YOLOv8)';
            if (!state.warnings.includes(warningMsg)) {
                state.warnings.unshift(warningMsg);
                state.cheatingStats.mobileDetectedCount++;
                updateWarningsList();
                showTopBanner('MOBILE PHONE DETECTED');
            }
        } else {
            state.warnings = state.warnings.filter(w => !w.includes('Mobile phone usage detected'));
            updateWarningsList();
        }

        const liveEye = document.getElementById('liveEyeContact');
        if (liveEye) liveEye.textContent = `${Math.round(state.metrics.eyeContactScore * 10)}%`;
        
        // Dynamic emotion changes
        if (state.isRecording) {
            state.metrics.emotion = state.metrics.fillerWords > 3 ? 'Nervous' : 'Confident';
        } else {
            state.metrics.emotion = 'Neutral';
        }
        
        const emotionLabel = document.getElementById('emotionLabel');
        if (emotionLabel) emotionLabel.textContent = state.metrics.emotion;

        updateHUDMetrics();

    }, 1000);

    // Start periodic frame analysis (every 2 seconds)
    startFrameAnalysis();
}

/**
 * Periodic frame analysis from video element
 */
function startFrameAnalysis() {
    frameAnalysisInterval = setInterval(async () => {
        if (!state.interviewActive) {
            clearInterval(frameAnalysisInterval);
            return;
        }

        const video = document.getElementById('webcam');
        if (!video || !video.srcObject) return;

        try {
            // Shrink the image to 320x240 to drastically speed up network & backend inference
            const offscreenCanvas = document.createElement('canvas');
            offscreenCanvas.width = 320;
            offscreenCanvas.height = 240;
            const offCtx = offscreenCanvas.getContext('2d');
            offCtx.drawImage(video, 0, 0, offscreenCanvas.width, offscreenCanvas.height);

            const frameBlob = await new Promise(resolve => offscreenCanvas.toBlob(resolve, 'image/jpeg', 0.6));
            if (frameBlob) {
                // Send to backend for YOLO analysis
                const result = await API.analyzeFrame(frameBlob);
                
                    const faceAnalysis = result.face_analysis;
                    const objectAnalysis = result.object_analysis;
                    
                    // Fallback to backend Face Analysis if frontend Mesh failed
                    if (faceAnalysis && faceAnalysis.status !== 'skipped') {
                        if (faceAnalysis.looking_away) {
                            state.simulations.lookAway = true;
                        }
                        
                        if (faceAnalysis.status === 'no_face') {
                            if (!state.simulations.noFace) {
                                state.simulations.noFace = true;
                                const msg = 'Face missing. Return to the camera viewport.';
                                if (!state.warnings.includes(msg)) {
                                    state.warnings.unshift(msg);
                                    showTopBanner('FACE NOT DETECTED');
                                    updateWarningsList();
                                }
                            }
                        } else if (faceAnalysis.status === 'multiple_faces') {
                            if (!state.simulations.multipleFaces) {
                                state.simulations.multipleFaces = true;
                                const msg = 'Multiple people detected in frame!';
                                if (!state.warnings.includes(msg)) {
                                    state.warnings.unshift(msg);
                                    showTopBanner('MULTIPLE PEOPLE DETECTED');
                                    updateWarningsList();
                                }
                            }
                        } else {
                            // Reset backend triggers if face is good
                            state.simulations.noFace = false;
                            state.simulations.multipleFaces = false;
                            state.warnings = state.warnings.filter(w => !w.includes('Face missing') && !w.includes('Multiple people'));
                            updateWarningsList();
                        }
                    }

                    if (objectAnalysis) {
                        state.simulations.phoneUsage = objectAnalysis.phone_detected || false;
                        
                        // Handle new suspicious objects
                        const newObjects = objectAnalysis.prohibited_objects || [];
                        const oldObjects = state.simulations.prohibitedObjects || [];
                        
                        // Add warnings for newly detected objects
                        newObjects.forEach(obj => {
                            const warningMsg = `Suspicious object: ${obj.toUpperCase()}`;
                            if (!state.warnings.includes(warningMsg)) {
                                state.warnings.unshift(warningMsg);
                                showTopBanner(warningMsg);
                            }
                        });
                        
                        // Remove warnings for objects that are no longer in frame
                        oldObjects.forEach(obj => {
                            if (!newObjects.includes(obj)) {
                                const warningMsg = `Suspicious object: ${obj.toUpperCase()}`;
                                state.warnings = state.warnings.filter(w => w !== warningMsg);
                            }
                        });
                        
                        state.simulations.prohibitedObjects = newObjects;
                        updateWarningsList();
                    }
            }
        } catch (error) {
            console.debug('Optimized frame analysis failed:', error);
        }
    }, 3000); // Super fast 3000ms interval for near real-time detection without overloading
}

function showTopBanner(text) {
    const banner = document.getElementById('cheatingWarning');
    const textEl = document.getElementById('cheatingWarningText');
    if (banner && textEl) {
        textEl.textContent = text;
        banner.classList.remove('hidden');
        banner.classList.add('flex');
        setTimeout(() => {
            banner.classList.add('hidden');
            banner.classList.remove('flex');
        }, 3500);
    }
}

function toggleSimulation(type, isChecked) {
    state.simulations[type] = isChecked;
}

function updateWarningsList() {
    const list = document.getElementById('warningsList');
    if (!list) return;
    
    if (state.warnings.length === 0) {
        list.innerHTML = `<div class="text-surface-600 text-[10px] italic">No active warnings</div>`;
        return;
    }
    
    list.innerHTML = state.warnings.map(w => `
        <div class="flex items-start gap-1.5 text-[11px] leading-tight text-warning-400 bg-warning-500/5 border border-warning-500/10 rounded px-2 py-1 fade-in">
            <span class="mt-0.5 flex-shrink-0">⚠️</span>
            <span>${w}</span>
        </div>
    `).join('');
}

function updateHUDMetrics() {
    const techEl = document.getElementById('metric-tech');
    const commEl = document.getElementById('metric-comm');
    const confEl = document.getElementById('metric-conf');
    const eyeEl = document.getElementById('metric-eye');
    
    if (techEl) techEl.textContent = `${state.metrics.technicalScore}/10`;
    if (commEl) commEl.textContent = `${state.metrics.communicationScore}/10`;
    if (confEl) confEl.textContent = `${state.metrics.confidenceScore}/10`;
    if (eyeEl) eyeEl.textContent = `${state.metrics.eyeContactScore}/10`;

    _setBarWidth('bar-tech', state.metrics.technicalScore * 10);
    _setBarWidth('bar-comm', state.metrics.communicationScore * 10);
    _setBarWidth('bar-conf', state.metrics.confidenceScore * 10);
    _setBarWidth('bar-eye', state.metrics.eyeContactScore * 10);
}

function _setBarWidth(id, percent) {
    const bar = document.getElementById(id);
    if (bar) bar.style.width = `${percent}%`;
}

/* -------- Interview Flow -------- */

function startInterviewFlow() {
    state.agentStatus.technicalEvaluator = 'waiting';
    state.agentStatus.communicationEvaluator = 'monitoring';
    state.agentStatus.faceMonitor = 'tracking';

    setTimeout(() => {
        addMessage('ai', state.questions[0].text || state.questions[0].primary_question);
        render();
    }, 1000);
}

async function speakText(text) {
    if ('speechSynthesis' in window) {
        // Cancel current speech synthesis to avoid queuing overlap
        window.speechSynthesis.cancel();
    }
    
    // Clean text of emojis and special bold markdown markers
    let cleanText = text.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '');
    cleanText = cleanText.replace(/\*\*/g, '').trim();
    
    try {
        const response = await API.generateSpeech(cleanText);
        if (response.status === 'success' && response.audio) {
            playAudioFromBase64(response.audio);
            return; // Successfully played with ElevenLabs
        }
    } catch (err) {
        console.error("ElevenLabs TTS via backend failed, falling back to Web Speech", err);
    }

    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        
        // Pick a professional English voice
        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) ||
                      voices.find(v => v.lang.startsWith('en')) ||
                      voices[0];
        if (voice) {
            utterance.voice = voice;
        }
        
        window.speechSynthesis.speak(utterance);
    }
}

function addMessage(sender, text) {
    state.chatMessages.push({ sender, text });
    
    // Trigger voice output for AI responses
    if (sender === 'ai') {
        speakText(text);
    }
    
    const chat = document.getElementById('chatContainer');
    if (!chat) return;

    const typing = document.getElementById('typingIndicator');
    if (typing) typing.classList.add('hidden');

    const div = document.createElement('div');
    div.className = `flex ${sender === 'ai' ? 'justify-start' : 'justify-end'} fade-in`;
    div.innerHTML = `
        <div class="chat-bubble ${sender === 'ai' ? 'ai text-surface-200 bg-surface-900 border border-surface-800' : 'user text-white bg-accent-600/15 border border-accent-600/25'}">
            <div class="text-[10px] text-surface-500 uppercase tracking-widest mb-0.5 font-mono">
                ${sender === 'ai' ? 'AI INTERVIEWER' : 'CANDIDATE'}
            </div>
            <div class="text-[13px] leading-relaxed">${text}</div>
        </div>
    `;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
}

/* -------- Answer Submission & LLM Evaluation -------- */

async function submitAnswer() {
    if (state.isRecording) {
        await stopRecording();
    }
    
    const input = document.getElementById('textInput');
    let answerText = '';
    
    if (input && input.value.trim()) {
        answerText = input.value.trim();
        input.value = '';
    } else if (state.transcript) {
        answerText = state.transcript;
    }
    
    if (!answerText) return;
    
    state.transcript = '';
    addMessage('user', answerText);
    
    state.answers.push(answerText);
    processAnswer(answerText);
}

async function processAnswer(userAnswer) {
    const typing = document.getElementById('typingIndicator');
    if (typing) typing.classList.remove('hidden');
    const chat = document.getElementById('chatContainer');
    if (chat) chat.scrollTop = chat.scrollHeight;

    const currentQ = state.questions[state.currentQuestion];

    // Activate Evaluator status
    state.agentStatus.technicalEvaluator = 'analyzing';
    
    try {
        const response = await API.submitAnswer(state.sessionId, userAnswer);
        if (response.status !== 'success') throw new Error("Backend submission failed");
        
        let evaluation = response.evaluation;
        const ev = {
            question: currentQ.text,
            candidateAnswer: userAnswer,
            score: evaluation.rating || evaluation.score || 5,
            feedback: evaluation.feedback || "Good response.",
        };
        state.lastEvaluation = ev;
        state.evaluations.push(ev);
        
        // Update global average metrics
        state.metrics.technicalScore = Math.min(10.0, parseFloat(((state.metrics.technicalScore * (state.evaluations.length - 1) + ev.score) / state.evaluations.length).toFixed(1)));
        
        // Comm and Confidence evaluation logic
        const wordCount = userAnswer.split(/\s+/).length;
        const recordedWPM = state.metrics.speakingSpeed || 140;
        state.metrics.speakingSpeed = Math.round((state.metrics.speakingSpeed + recordedWPM) / 2);
        
        let commScore = 9.5;
        if (state.metrics.fillerWords > 7) commScore -= 2.0;
        if (wordCount < 15) commScore -= 1.5;
        state.metrics.communicationScore = Math.min(10.0, parseFloat(((state.metrics.communicationScore * (state.evaluations.length - 1) + commScore) / state.evaluations.length).toFixed(1)));
        
        let confScore = 9.8;
        if (state.metrics.fillerWords > 5) confScore -= 1.5;
        if (state.simulations.lookAway) confScore -= 2.0;
        state.metrics.confidenceScore = Math.min(10.0, parseFloat(((state.metrics.confidenceScore * (state.evaluations.length - 1) + confScore) / state.evaluations.length).toFixed(1)));
        
        state.agentStatus.technicalEvaluator = 'idle';
        renderActiveInterview();

        if (response.action === 'follow_up') {
            state.isFollowUpActive = true;
            state.agentStatus.questionGenerator = 'idle';
            setTimeout(() => {
                if (typing) typing.classList.add('hidden');
                addMessage('ai', response.follow_up_question);
            }, 1500);
        } else {
            state.isFollowUpActive = false;
            setTimeout(() => {
                if (response.next_question_available) {
                    state.currentQuestion++;
                    if (typing) typing.classList.add('hidden');
                    let nextText = response.next_question;
                    if (typeof nextText === 'object') nextText = nextText.primary_question || nextText.text;
                    addMessage('ai', nextText);
                    render();
                } else {
                    const typing = document.getElementById('typingIndicator');
                    if (typing) typing.classList.add('hidden');
                    addMessage('ai', `Thank you ${state.candidateName || ''}. We have completed the interview. The system is now preparing your feedback report...`);
                    setTimeout(() => {
                        state.step = 5;
                        render();
                        if (typeof renderResults === 'function') {
                            renderResults();
                        }
                    }, 4000);
                }
            }, 1500);
        }
        
    } catch (e) {
        console.error("Backend evaluation failed", e);
        state.agentStatus.technicalEvaluator = 'idle';
        if (typing) typing.classList.add('hidden');
        alert("Backend submission failed. Ensure the server is running.");
    }
}

/**
 * Offline evaluation fallback
 */
function evaluateAnswerAgainstIdeal(candidateAnswer, questionObj) {
    const text = candidateAnswer.toLowerCase();
    const concepts = questionObj.concepts || [];
    const mentioned = concepts.filter(c => text.includes(c.toLowerCase()));
    const missing = concepts.filter(c => !mentioned.includes(c));
    
    let completeness = 3.0;
    if (concepts.length > 0) {
        completeness = Math.round((mentioned.length / concepts.length) * 10);
    }
    
    const words = candidateAnswer.split(/\s+/).length;
    let depth = words > 50 ? 9.0 : words > 25 ? 7.5 : 5.0;
    let correctness = mentioned.length > 0 ? 5.0 + (mentioned.length / concepts.length) * 4.5 : 4.0;
    const score = Math.round(((correctness + depth + completeness) / 3) * 10) / 10;
    
    return {
        question: questionObj.text,
        candidateAnswer,
        idealAnswer: questionObj.ideal,
        concepts,
        conceptsMentioned: mentioned,
        missingConcepts: missing,
        correctness: Math.round(correctness * 10) / 10,
        depth: Math.round(depth * 10) / 10,
        completeness: Math.round(completeness * 10) / 10,
        score
    };
}

/* -------- End Interview -------- */

function endInterview() {
    if (state.stream) {
        state.stream.getTracks().forEach(track => track.stop());
        state.stream = null;
    }
    
    if (cvAnimationId) cancelAnimationFrame(cvAnimationId);
    if (cheatCheckInterval) clearInterval(cheatCheckInterval);
    if (frameAnalysisInterval) clearInterval(frameAnalysisInterval);
    
    // Close MediaPipe instances if they exist
    if (cameraInstance) {
        try { cameraInstance.stop(); } catch(e) {}
        cameraInstance = null;
    }
    if (faceMesh) {
        try { faceMesh.close(); } catch(e) {}
        faceMesh = null;
    }
    
    state.interviewActive = false;
    
    state.agentStatus.technicalEvaluator = 'complete';
    state.agentStatus.communicationEvaluator = 'complete';
    state.agentStatus.faceMonitor = 'complete';
    state.agentStatus.feedbackGenerator = 'complete';
    state.agentStatus.reportGenerator = 'complete';
    
    state.step = 5;
    render();
}

/* -------- HTML Partials -------- */

function _cameraPanel() {
    return `
    <div class="video-container interview-panel aspect-video relative overflow-hidden">
        ${state.stream ? `
            <video id="webcam" autoplay playsinline muted class="w-full h-full object-cover scale-x-[-1]"></video>
        ` : `
            <div class="w-full h-full flex items-center justify-center bg-slate-900 relative">
                <div class="text-center z-10">
                    <div class="w-12 h-12 bg-white/5 rounded-lg flex items-center justify-center mx-auto mb-3 border border-white/10">
                        <i data-lucide="video-off" class="w-5 h-5 text-slate-300"></i>
                    </div>
                    <p class="text-white text-sm font-semibold">Camera tracking offline</p>
                    <p class="text-slate-400 text-[10px] mt-1 font-mono uppercase tracking-widest">Webcam unlinked</p>
                </div>
            </div>
        `}
        <canvas id="cvCanvas" class="absolute top-0 left-0 w-full h-full pointer-events-none z-10"></canvas>
        
        <div class="absolute top-3 left-3 flex items-center gap-2 bg-slate-950/80 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/10 z-20">
            <span class="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
            <span class="text-[9px] font-mono text-white tracking-widest uppercase">Feed Active</span>
        </div>
        
        <div class="absolute top-3 right-3 z-20">
            <div class="bg-slate-950/80 backdrop-blur-md rounded-md px-3 py-1.5 border border-white/10 text-[10px] font-mono">
                <span class="text-slate-400 uppercase tracking-widest">Session:</span>
                <span class="text-white ml-2 font-medium">${(state.currentQuestion || 0) + 1} of ${state.questions?.length || 6}</span>
            </div>
        </div>
        
        <div id="cheatingWarning" class="absolute inset-0 bg-[#ef4444]/10 backdrop-blur-md hidden flex-col items-center justify-center z-[100] transition-all duration-300">
            <div class="absolute inset-0 border-2 border-[#ef4444]/50 animate-pulse"></div>
            <div class="bg-slate-950 border border-rose-400/50 p-6 rounded-lg flex flex-col items-center shadow-2xl">
                <div class="w-12 h-12 rounded-lg bg-rose-500/20 flex items-center justify-center mb-4">
                    <i data-lucide="alert-triangle" class="w-6 h-6 text-rose-300"></i>
                </div>
                <div id="cheatingWarningText" class="text-rose-300 text-sm font-semibold tracking-wide text-center uppercase">
                    Please maintain focus
                </div>
            </div>
        </div>
    </div>`;
}

function _chatPanel(question) {
    const micBtnClass = state.isRecording 
        ? 'bg-rose-500 hover:bg-rose-600 text-white' 
        : 'bg-blue-500 hover:bg-blue-600 text-white';

    const micIndicator = state.isRecording
        ? `<div class="flex gap-1 items-center justify-center">
               <span class="w-1 h-1 bg-white rounded-full animate-bounce" style="animation-delay: 0ms"></span>
               <span class="w-1 h-1 bg-white rounded-full animate-bounce" style="animation-delay: 150ms"></span>
               <span class="w-1 h-1 bg-white rounded-full animate-bounce" style="animation-delay: 300ms"></span>
           </div>`
        : `<i data-lucide="mic" class="w-4 h-4"></i>`;

    return `
    <div class="interview-panel-light text-slate-950 overflow-hidden">
        <div class="bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between">
            <div class="flex items-center gap-2">
                <span class="w-2 h-2 bg-blue-600 rounded-full"></span>
                <span class="text-slate-950 text-xs font-bold uppercase tracking-wider">Dialogue</span>
            </div>
            <span class="text-slate-500 text-[10px] font-mono tracking-widest uppercase">Active</span>
        </div>

        <div id="chatContainer" class="p-5 space-y-4 max-h-[300px] overflow-y-auto" style="min-height:260px">
            ${state.chatMessages.map(msg => `
            <div class="flex ${msg.sender === 'ai' ? 'justify-start' : 'justify-end'} fade-in">
                <div class="max-w-[85%] rounded-lg px-4 py-2.5 ${msg.sender === 'ai' ? 'bg-slate-100 border border-slate-200 text-slate-800' : 'bg-slate-950 text-white'}">
                    <div class="text-[9px] ${msg.sender === 'ai' ? 'text-slate-500' : 'text-slate-300'} uppercase tracking-widest mb-1 font-mono">
                        ${msg.sender === 'ai' ? 'INTERVIEWER' : 'YOU'}
                    </div>
                    <div class="text-[13px] leading-relaxed">${msg.text}</div>
                </div>
            </div>`).join('')}
            
            <div id="typingIndicator" class="flex justify-start hidden">
                <div class="bg-[#111111] border border-[#222222] rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
                    <div class="w-1.5 h-1.5 bg-[#888888] rounded-full animate-bounce" style="animation-delay: 0ms"></div>
                    <div class="w-1.5 h-1.5 bg-[#888888] rounded-full animate-bounce" style="animation-delay: 150ms"></div>
                    <div class="w-1.5 h-1.5 bg-[#888888] rounded-full animate-bounce" style="animation-delay: 300ms"></div>
                </div>
            </div>
        </div>

        <div class="border-t border-slate-200 p-4 bg-slate-50">
            <div class="flex items-center gap-3">
                <button onclick="startRecording()" id="micBtn"
                    class="w-10 h-10 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 ${micBtnClass}">
                    ${micIndicator}
                </button>
                <input type="text" id="textInput" placeholder="Type your response..."
                    class="flex-1 bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-950 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-[13px] transition-colors"
                    onkeydown="if(event.key==='Enter')submitAnswer()">
                <button onclick="submitAnswer()"
                    class="w-10 h-10 rounded-lg bg-slate-950 hover:bg-slate-800 text-white flex items-center justify-center transition-colors flex-shrink-0">
                    <i data-lucide="send" class="w-4 h-4"></i>
                </button>
            </div>
            ${state.isRecording ? `<div class="mt-2 text-center"><span class="text-rose-600 text-[10px] font-mono uppercase tracking-widest animate-pulse">Recording audio...</span></div>` : ''}
        </div>
    </div>`;
}

function _questionInfo(question) {
    const header = state.isFollowUpActive ? 'FOLLOW-UP QUESTION' : 'CURRENT QUESTION';
    const desc = question ? question.text : 'Preparing next question...';
    return `
    <div class="interview-panel-light p-5 text-slate-950">
        <div class="flex items-center gap-2 mb-2">
            <i data-lucide="help-circle" class="w-4 h-4 text-blue-600"></i>
            <div class="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold">${header}</div>
        </div>
        <div class="text-slate-950 text-[13px] leading-relaxed font-semibold">${desc}</div>
    </div>`;
}

function _simulationPanel() {
    return ''; // Removed - Integrity Simulator no longer needed
}

function _liveMetrics() {
    const m = state.metrics;
    const bars = [
        { label: 'Technical Score', value: m.technicalScore,     id: 'metric-tech', barId: 'bar-tech' },
        { label: 'Communication',   value: m.communicationScore, id: 'metric-comm', barId: 'bar-comm' },
        { label: 'Confidence',      value: m.confidenceScore,    id: 'metric-conf', barId: 'bar-conf' }
    ];
    return `
    <div class="interview-panel-light p-5 text-slate-950">
        <div class="text-slate-950 text-xs font-bold mb-4 flex items-center gap-2">
            <i data-lucide="bar-chart-2" class="w-4 h-4 text-emerald-600"></i>
            Live Performance Metrics
        </div>
        <div class="space-y-4">
            ${bars.map(b => `
            <div>
                <div class="flex justify-between text-[11px] mb-1.5">
                    <span class="text-slate-500 font-bold tracking-wide uppercase font-mono">${b.label}</span>
                    <span class="text-slate-950 font-bold font-mono" id="${b.id}">${b.value}/10</span>
                </div>
                <div class="bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div class="bg-emerald-500 h-1.5 rounded-full score-fill transition-all duration-300" id="${b.barId}" style="width:${b.value * 10}%"></div>
                </div>
            </div>`).join('')}
        </div>
    </div>`;
}

function _ragEvaluatorPanel() {
    const evalObj = state.lastEvaluation;
    
    let contentHtml = '';
    if (!evalObj) {
        contentHtml = `
            <div class="text-center py-6 text-slate-500 text-xs font-semibold">
                Waiting for response to evaluate...
            </div>
        `;
    } else {
        contentHtml = `
            <div class="space-y-4 mt-2">
                <div>
                    <div class="text-slate-500 text-[9px] uppercase tracking-widest font-mono mb-1.5">Reference Ideal Answer</div>
                    <div class="text-slate-700 bg-slate-50 border border-slate-200 p-3 rounded-lg leading-relaxed text-[11px] max-h-24 overflow-y-auto">
                        ${evalObj.idealAnswer}
                    </div>
                </div>
                <div class="grid grid-cols-3 gap-3 text-center">
                    <div class="bg-blue-50 p-2.5 rounded-lg border border-blue-100">
                        <div class="text-blue-700 text-[8px] font-mono uppercase tracking-widest">Correctness</div>
                        <div class="text-slate-950 font-bold font-mono text-sm mt-1">${evalObj.correctness}/10</div>
                    </div>
                    <div class="bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
                        <div class="text-emerald-700 text-[8px] font-mono uppercase tracking-widest">Depth</div>
                        <div class="text-slate-950 font-bold font-mono text-sm mt-1">${evalObj.depth}/10</div>
                    </div>
                    <div class="bg-amber-50 p-2.5 rounded-lg border border-amber-100">
                        <div class="text-amber-700 text-[8px] font-mono uppercase tracking-widest">Completeness</div>
                        <div class="text-slate-950 font-bold font-mono text-sm mt-1">${evalObj.completeness}/10</div>
                    </div>
                </div>
                
                <div>
                    <div class="text-slate-500 text-[9px] uppercase tracking-widest font-mono mb-2">Concept Alignment</div>
                    <div class="flex flex-wrap gap-2">
                        ${evalObj.conceptsMentioned.map(c => `
                            <span class="bg-emerald-600 text-white text-[9px] px-2 py-1 rounded-md font-medium tracking-wide">✓ ${c}</span>
                        `).join('')}
                        ${evalObj.missingConcepts.map(c => `
                            <span class="bg-slate-100 text-slate-600 border border-slate-200 text-[9px] px-2 py-1 rounded-md font-medium tracking-wide">Missing: ${c}</span>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    return `
    <div class="interview-panel-light p-5 text-slate-950">
        <div class="text-slate-950 text-xs font-bold mb-3 flex items-center justify-between">
            <span class="flex items-center gap-2"><i data-lucide="check-square" class="w-4 h-4 text-blue-600"></i> Answer Evaluation</span>
            <span class="text-[9px] bg-blue-50 text-blue-700 px-2 py-1 rounded-md border border-blue-100 font-mono uppercase tracking-widest">Real-time</span>
        </div>
        ${contentHtml}
    </div>`;
}

function _warningsPanel() {
    return `
    <div class="interview-panel-light p-5 text-slate-950">
        <div class="text-slate-950 text-xs font-bold mb-3 flex items-center gap-2">
            <i data-lucide="alert-triangle" class="w-4 h-4 text-amber-600"></i> Integrity Alerts
        </div>
        <div id="warningsList" class="space-y-2 max-h-32 overflow-y-auto">
            ${state.warnings.length === 0
                ? `<div class="text-slate-500 text-xs font-semibold">No anomalies flagged</div>`
                : state.warnings.map(w => `
                    <div class="flex items-start gap-2 text-[11px] leading-tight text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-md px-3 py-2 fade-in">
                        <i data-lucide="alert-circle" class="w-3.5 h-3.5 flex-shrink-0 mt-px"></i>
                        <span class="font-medium">${w}</span>
                    </div>`).join('')
            }
        </div>
    </div>`;
}

function _agentStatusPanel() {
    const agents = [
        { label: 'Interviewer', key: 'questionGenerator' },
        { label: 'Answer Evaluator', key: 'technicalEvaluator' },
        { label: 'Speech & Comm Analyzer', key: 'communicationEvaluator' },
        { label: 'Face Monitor', key: 'faceMonitor' }
    ];
    return `
    <div class="interview-panel-light p-5 text-slate-950">
        <div class="text-slate-950 text-xs font-bold mb-4 flex items-center gap-2">
            <i data-lucide="activity" class="w-4 h-4 text-emerald-600"></i> System Tasks
        </div>
        <div class="space-y-3">
            ${agents.map(a => {
                const status = state.agentStatus[a.key] || 'idle';
                let indicatorColor = 'bg-[#333333]';
                let textClass = 'text-[#666666]';
                let statusLabel = 'Idle';
                
                if (status === 'running' || status === 'tracking' || status === 'monitoring') {
                    indicatorColor = 'bg-green-500';
                    textClass = 'text-emerald-600';
                    statusLabel = 'Monitoring';
                } else if (status === 'analyzing' || status === 'generating') {
                    indicatorColor = 'bg-blue-500 animate-pulse';
                    textClass = 'text-blue-600 font-medium';
                    statusLabel = 'Processing';
                } else if (status === 'waiting') {
                    indicatorColor = 'bg-amber-500';
                    textClass = 'text-amber-600';
                    statusLabel = 'Awaiting Answer';
                } else if (status === 'complete') {
                    indicatorColor = 'bg-slate-400';
                    textClass = 'text-slate-500';
                    statusLabel = 'Active';
                }
                
                return `
                <div class="flex items-center justify-between">
                    <span class="text-slate-600 text-xs font-semibold">${a.label}</span>
                    <span class="flex items-center gap-2">
                        <span class="w-1.5 h-1.5 ${indicatorColor} rounded-full"></span>
                        <span class="${textClass} text-[10px] font-mono uppercase tracking-widest">${statusLabel}</span>
                    </span>
                </div>`;
            }).join('')}
        </div>
    </div>`;
}
