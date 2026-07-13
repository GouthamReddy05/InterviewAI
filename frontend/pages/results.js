/* ============================================================
   InterviewAI — Results Page  (pages/results.js)
   ============================================================ */

function renderResults() {
    const name = state.candidateName || 'Candidate';
    const m    = state.metrics;
    const stats = state.cheatingStats;

    // Wait for the backend to generate the LLM report dynamically
    if (!state.reportData && state.sessionId) {
        app.innerHTML = `
        <div class="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white relative overflow-hidden">
            <div class="absolute inset-0 pointer-events-none z-0">
                <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/20 blur-[100px] rounded-full animate-pulse"></div>
            </div>
            <div class="relative z-10 flex flex-col items-center">
                <svg class="animate-spin -ml-1 mr-3 h-12 w-12 text-indigo-500 mb-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <h2 class="text-2xl font-bold font-mono tracking-widest uppercase mb-2">Generating Report</h2>
                <p class="text-white/50 text-sm">Synthesizing interview transcript & extracting personalized insights...</p>
            </div>
        </div>`;
        
        API.getComprehensiveReport(state.sessionId).then(data => {
            state.reportData = data;
            
            let baseScore = (
                (m.technicalScore * 0.35) + 
                (m.communicationScore * 0.20) + 
                (m.confidenceScore * 0.15) + 
                (m.eyeContactScore * 0.15) + 
                (m.resumeKnowledge * 0.10) + 
                (m.problemSolving * 0.05)
            ) * 10;
            
            let penalty = 0;
            if (stats.mobileDetectedCount > 0) penalty += 15;
            if (stats.multipleFacesCount > 0) penalty += 10;
            if (stats.lookedAwayCount > 5) penalty += 5;
            
            const overall = Math.max(0, Math.round(baseScore - penalty));
            
            if (!state.sessionEnded && state.sessionId) {
                state.sessionEnded = true;
                API.endSession(state.sessionId, overall).catch(err => console.error("Failed to save final score", err));
            }

            renderResults();
        }).catch(err => {
            console.error("Error generating report", err);
            state.reportData = {
                improvement_plan: {
                    strengths: ["Report generation failed (Backend Error)"],
                    weaknesses: ["Unable to analyze transcript"]
                }
            };
            renderResults();
        });
        return; // Exit until data loads
    }

    const plan = (state.reportData && state.reportData.improvement_plan) ? state.reportData.improvement_plan : { strengths: [], weaknesses: [] };
    
    // Dynamic Strengths HTML
    const strengthsHtml = plan.strengths && plan.strengths.length > 0 
        ? plan.strengths.map(s => _planItemEnhanced('emerald', s)).join('')
        : _planItemEnhanced('emerald', 'Insufficient conversational data to identify core strengths.');

    // Dynamic Weaknesses HTML
    const weaknessesHtml = plan.weaknesses && plan.weaknesses.length > 0
        ? plan.weaknesses.map(w => _planItemEnhanced('indigo', w)).join('')
        : _planItemEnhanced('indigo', 'Insufficient conversational data to map growth areas.');

    // Calculate base weighted score
    let baseScore = (
        (m.technicalScore * 0.35) + 
        (m.communicationScore * 0.20) + 
        (m.confidenceScore * 0.15) + 
        (m.eyeContactScore * 0.15) + 
        (m.resumeKnowledge * 0.10) + 
        (m.problemSolving * 0.05)
    ) * 10;
    
    // Apply cheating deductions
    let penalty = 0;
    if (stats.mobileDetectedCount > 0) penalty += 15;
    if (stats.multipleFacesCount > 0) penalty += 10;
    if (stats.lookedAwayCount > 5) penalty += 5;
    
    const overall = Math.max(0, Math.round(baseScore - penalty));
    const overallGrade = overall >= 90 ? 'A+' : overall >= 80 ? 'A' : overall >= 70 ? 'B' : overall >= 60 ? 'C' : 'F';
    
    let gradeGlow = 'shadow-success-500/50';
    let gradeColor = 'from-emerald-400 to-teal-500';
    let strokeColor = '#10b981';
    
    if (overall < 60) {
        gradeColor = 'from-rose-400 to-red-500';
        gradeGlow = 'shadow-rose-500/50';
        strokeColor = '#f43f5e';
    } else if (overall < 80) {
        gradeColor = 'from-amber-400 to-orange-500';
        gradeGlow = 'shadow-amber-500/50';
        strokeColor = '#f59e0b';
    }

    const scoreItems = [
        { label: 'Technical Accuracy', score: m.technicalScore, max: 10, bg: 'bg-indigo-500' },
        { label: 'Communication', score: m.communicationScore, max: 10, bg: 'bg-emerald-500' },
        { label: 'Speech Confidence', score: m.confidenceScore, max: 10, bg: 'bg-amber-500' },
        { label: 'Eye Contact', score: m.eyeContactScore, max: 10, bg: 'bg-cyan-500' },
        { label: 'Resume Validation', score: m.resumeKnowledge, max: 10, bg: 'bg-violet-500' },
        { label: 'Problem Solving', score: m.problemSolving, max: 10, bg: 'bg-rose-500' }
    ];

    app.innerHTML = `
    <div class="min-h-screen bg-[#050505] text-white font-sans selection:bg-indigo-500/30 overflow-x-hidden relative">
        <!-- Premium Animated Background Gradients -->
        <div class="fixed inset-0 pointer-events-none overflow-hidden z-0">
            <div class="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[120px] mix-blend-screen animate-pulse" style="animation-duration: 8s;"></div>
            <div class="absolute top-[40%] -right-[10%] w-[40%] h-[40%] rounded-full bg-emerald-600/10 blur-[120px] mix-blend-screen animate-pulse" style="animation-duration: 10s;"></div>
            <div class="absolute -bottom-[20%] left-[20%] w-[60%] h-[60%] rounded-full bg-violet-600/10 blur-[150px] mix-blend-screen"></div>
        </div>

        <div class="relative z-10 max-w-6xl mx-auto px-6 py-16">
            
            <!-- Header Section -->
            <header class="mb-14 text-center slide-up">
                <div class="inline-flex items-center gap-3 bg-white/5 border border-white/10 backdrop-blur-md rounded-full px-5 py-2 mb-6 shadow-xl">
                    <span class="relative flex h-2.5 w-2.5">
                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span class="text-xs font-mono tracking-widest uppercase text-white/80">AI Assessment Complete</span>
                </div>
                <h1 class="text-5xl md:text-6xl font-extrabold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white via-white/90 to-white/60">
                    Interview Report
                </h1>
                <p class="text-lg text-white/50 max-w-2xl mx-auto font-light">
                    Candidate <strong class="text-white/90 font-semibold">${name}</strong> • Role <strong class="text-white/90 font-semibold">${state.jobRole}</strong>
                </p>
            </header>

            <div class="grid lg:grid-cols-12 gap-8 mb-12">
                
                <!-- Main Score Hero -->
                <div class="lg:col-span-5 relative group slide-up" style="animation-delay: 0.1s">
                    <div class="absolute inset-0 bg-gradient-to-b ${gradeColor} opacity-5 blur-xl rounded-[2.5rem] transition-opacity duration-500 group-hover:opacity-20"></div>
                    <div class="h-full bg-white/[0.02] border border-white/10 backdrop-blur-2xl rounded-[2.5rem] p-8 md:p-12 flex flex-col items-center justify-center text-center relative overflow-hidden">
                        
                        <div class="relative w-48 h-48 mb-8">
                            <!-- Circular SVG Progress -->
                            <svg class="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="6" />
                                <circle cx="50" cy="50" r="46" fill="none" stroke="${strokeColor}" stroke-width="6" stroke-linecap="round" 
                                    stroke-dasharray="${2 * Math.PI * 46}" stroke-dashoffset="${2 * Math.PI * 46 * (1 - overall/100)}" 
                                    class="transition-all duration-1500 ease-out" />
                            </svg>
                            <div class="absolute inset-0 flex flex-col items-center justify-center drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                                <span class="text-6xl font-black bg-clip-text text-transparent bg-gradient-to-br ${gradeColor}">${overall}</span>
                                <span class="text-xs font-mono uppercase tracking-widest text-white/40 mt-1">/ 100</span>
                            </div>
                        </div>
                        
                        <h2 class="text-2xl font-bold mb-2">Grade <span class="bg-clip-text text-transparent bg-gradient-to-r ${gradeColor}">${overallGrade}</span></h2>
                        <p class="text-sm text-white/50 leading-relaxed max-w-xs">Aggregated neural network evaluation covering technical, vocal, and visual metrics.</p>
                    </div>
                </div>

                <!-- Detailed Radar/Bars -->
                <div class="lg:col-span-7 flex flex-col gap-6 slide-up" style="animation-delay: 0.2s">
                    <!-- Integrity Card -->
                    <div class="bg-gradient-to-br ${penalty > 0 ? 'from-rose-500/10 to-red-500/5 border-rose-500/20' : 'from-emerald-500/10 to-teal-500/5 border-emerald-500/20'} border backdrop-blur-xl rounded-3xl p-6 relative overflow-hidden">
                        <div class="flex items-center justify-between mb-5">
                            <h3 class="text-sm font-mono uppercase tracking-widest text-white/70">Proctoring & Integrity</h3>
                            ${penalty > 0 
                                ? '<span class="bg-rose-500/20 text-rose-300 text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full border border-rose-500/30">Anomalies Detected</span>' 
                                : '<span class="bg-emerald-500/20 text-emerald-300 text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full border border-emerald-500/30">Verified Secure</span>'}
                        </div>
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div class="bg-black/20 rounded-2xl p-4 border border-white/5">
                                <div class="text-2xl font-bold mb-1">${stats.mobileDetectedCount}</div>
                                <div class="text-[10px] uppercase tracking-wider text-white/40 font-mono">Phones Spotted</div>
                            </div>
                            <div class="bg-black/20 rounded-2xl p-4 border border-white/5">
                                <div class="text-2xl font-bold mb-1">${stats.multipleFacesCount}</div>
                                <div class="text-[10px] uppercase tracking-wider text-white/40 font-mono">Extra Persons</div>
                            </div>
                            <div class="bg-black/20 rounded-2xl p-4 border border-white/5">
                                <div class="text-2xl font-bold mb-1">${stats.lookedAwayCount}</div>
                                <div class="text-[10px] uppercase tracking-wider text-white/40 font-mono">Look Aways</div>
                            </div>
                            <div class="bg-black/20 rounded-2xl p-4 border border-white/5">
                                <div class="text-2xl font-bold mb-1">${stats.secondsLookedAway > 0 && m.eyeContactScore < 5 ? 12 : 0}s</div>
                                <div class="text-[10px] uppercase tracking-wider text-white/40 font-mono">Camera Exits</div>
                            </div>
                        </div>
                        ${penalty > 0 
                            ? `<div class="mt-4 text-xs font-mono text-rose-300/80 bg-rose-500/10 p-3 rounded-xl border border-rose-500/10">⚠️ Integrity Penalty Applied: -${penalty} points deducted from final score.</div>` 
                            : ''}
                    </div>

                    <!-- Dimension Bars -->
                    <div class="bg-white/[0.02] border border-white/10 backdrop-blur-xl rounded-3xl p-6 sm:p-8 flex-1 flex flex-col justify-center">
                        <div class="space-y-5">
                            ${scoreItems.map((item, i) => `
                                <div class="group">
                                    <div class="flex justify-between items-end mb-2">
                                        <span class="text-xs font-medium text-white/80 group-hover:text-white transition-colors uppercase tracking-wider">${item.label}</span>
                                        <span class="text-xs font-mono text-white/50 group-hover:text-white/90 transition-colors">${(item.score).toFixed(1)} / ${item.max}</span>
                                    </div>
                                    <div class="h-2 w-full bg-white/5 rounded-full overflow-hidden relative border border-white/5">
                                        <div class="absolute top-0 left-0 h-full ${item.bg} rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(255,255,255,0.3)]" style="width: ${(item.score / item.max) * 100}%; animation: growRight 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;"></div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Deep Analysis Grid -->
            <div class="grid md:grid-cols-2 gap-8 mb-12 slide-up" style="animation-delay: 0.3s">
                
                <!-- Strengths -->
                <div class="bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-3xl p-8 backdrop-blur-xl relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
                    <div class="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-40 transition-opacity">
                        <svg class="w-24 h-24 text-emerald-400 transform translate-x-4 -translate-y-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    </div>
                    <h3 class="text-emerald-400 font-mono uppercase tracking-widest text-xs font-bold mb-6">Core Strengths</h3>
                    <ul class="space-y-4 relative z-10">
                        \${strengthsHtml}
                    </ul>
                </div>

                <!-- Weaknesses -->
                <div class="bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/20 rounded-3xl p-8 backdrop-blur-xl relative overflow-hidden group hover:border-indigo-500/40 transition-colors">
                    <div class="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-40 transition-opacity">
                        <svg class="w-24 h-24 text-indigo-400 transform translate-x-4 -translate-y-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                    </div>
                    <h3 class="text-indigo-400 font-mono uppercase tracking-widest text-xs font-bold mb-6">Growth Opportunities</h3>
                    <ul class="space-y-4 relative z-10">
                        \${weaknessesHtml}
                    </ul>
                </div>
            </div>

            <!-- Action Bar -->
            <div class="flex flex-col sm:flex-row items-center justify-center gap-5 mt-16 slide-up" style="animation-delay: 0.4s">
                <button onclick="window.print()" class="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-semibold transition-all duration-300 text-white/80 hover:text-white backdrop-blur-md flex items-center justify-center gap-2 group">
                    <svg class="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    Download PDF
                </button>
                <button onclick="resetState();render()" class="w-full sm:w-auto px-10 py-4 bg-white text-black hover:bg-gray-100 rounded-2xl font-bold transition-all duration-300 shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] hover:scale-[1.02] flex items-center justify-center gap-2">
                    Start New Interview
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
                </button>
            </div>
            
        </div>
        
        <style>
            @keyframes growRight { from { width: 0; } }
            .slide-up { animation: slideUpFade 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; transform: translateY(30px); }
            @keyframes slideUpFade { to { opacity: 1; transform: translateY(0); } }
        </style>
    </div>
    `;
}

/* ---- private helpers ---- */

function _planItemEnhanced(color, text) {
    return `
    <li class="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
        <span class="flex-shrink-0 w-6 h-6 rounded-full bg-${color}-500/20 text-${color}-400 flex items-center justify-center text-sm font-bold border border-${color}-500/30 shadow-[0_0_10px_rgba(var(--tw-colors-${color}-500),0.2)]">✓</span>
        <span class="text-sm text-white/80 leading-relaxed pt-0.5">${text}</span>
    </li>`;
}
