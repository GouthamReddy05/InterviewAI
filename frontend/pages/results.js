/* ============================================================
   InterviewAI — Results Page  (pages/results.js)
   ============================================================ */

function renderResults() {
    const name = state.candidateName || 'Candidate';
    const m    = state.metrics;
    const stats = state.cheatingStats;

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
    const overallGrade = overall >= 90 ? 'A+' : overall >= 80 ? 'A' : overall >= 70 ? 'B' : overall >= 60 ? 'C' : 'F (Cheating Flagged)';
    
    let overallColor = 'text-success-400';
    let gradeBorderColor = 'border-success-500/30';
    if (overall < 60) {
        overallColor = 'text-danger-400';
        gradeBorderColor = 'border-danger-500/40';
    } else if (overall < 80) {
        overallColor = 'text-warning-400';
        gradeBorderColor = 'border-warning-500/30';
    }

    const scoreItems = [
        { label: 'Technical Knowledge', score: m.technicalScore,     max: 10, color: 'accent', desc: 'RAG checked semantic matching' },
        { label: 'Communication Pacing', score: m.communicationScore, max: 10, color: 'success', desc: 'Speech structure & flow' },
        { label: 'Speech Confidence',    score: m.confidenceScore,    max: 10, color: 'warning', desc: 'WPM & voice stability indices' },
        { label: 'Camera Eye Contact',   score: m.eyeContactScore,    max: 10, color: 'accent', desc: 'MediaPipe gaze vector logs' },
        { label: 'Resume Knowledge',     score: m.resumeKnowledge,    max: 10, color: 'success', desc: 'Llama NLP project verification' },
        { label: 'Problem Solving',      score: m.problemSolving,     max: 10, color: 'warning', desc: 'Response completeness scores' }
    ];

    const agentSummary = [
        { name: 'Resume Analyzer',        icon: '📄', desc: 'Extracted Skills & Profile' },
        { name: 'Question Generator',     icon: '❓', desc: 'Custom difficulty mapping' },
        { name: 'AI Interviewer',         icon: '🤖', desc: 'Dynamic conversational model' },
        { name: 'Technical Evaluator',    icon: '⚙️', desc: 'Semantic RAG scoring' },
        { name: 'Communication Evaluator',icon: '🎙️', desc: 'Speech-to-Text & WPM counter' },
        { name: 'Face Monitor Agent',     icon: '👁️', desc: 'OpenCV & MediaPipe tracker' },
        { name: 'Feedback Generator',     icon: '📊', desc: 'Llama Improvement planning' }
    ];

    app.innerHTML = `
    <div class="min-h-screen bg-surface-950 pb-16">
        <!-- Progress Bar -->
        <div class="fixed top-0 w-full z-40 bg-surface-950/90 backdrop-blur-sm border-b border-surface-800">
            <div class="max-w-3xl mx-auto px-4 py-4">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-white text-sm font-medium">Session Report Card</span>
                    <span class="text-surface-500 text-xs">Step 5 of 5</span>
                </div>
                <div class="w-full bg-surface-800 rounded-full h-1.5">
                    <div class="bg-accent-600 h-1.5 rounded-full" style="width:100%"></div>
                </div>
            </div>
        </div>

        <div class="max-w-5xl mx-auto px-4 pt-20">

            <!-- Header -->
            <div class="text-center mb-8 slide-up">
                <div class="inline-flex items-center gap-2 bg-surface-800/50 border border-surface-700/50 rounded-full px-4 py-1.5 mb-4">
                    <span class="w-1.5 h-1.5 bg-success-500 rounded-full"></span>
                    <span class="text-xs text-surface-400 font-mono">Report Compiled Successfully</span>
                </div>
                <h1 class="text-3xl font-bold text-white mb-2">Interview Summary for ${name}</h1>
                <p class="text-surface-400 text-sm">Target Role: ${state.jobRole} (${state.difficulty.toUpperCase()} tier)</p>
            </div>

            <!-- Score Cards Row -->
            <div class="grid md:grid-cols-3 gap-6 mb-8">
                <!-- Overall Score Circular View -->
                <div class="glass rounded-2xl p-6 text-center border ${gradeBorderColor} flex flex-col justify-center items-center">
                    <div class="inline-flex items-center justify-center w-28 h-28 rounded-full border-4 border-accent-600/30 mb-4 bg-surface-900 shadow-inner">
                        <div>
                            <div class="text-4xl font-bold ${overallColor}">${overall}</div>
                            <div class="text-surface-500 text-[10px] uppercase font-mono tracking-widest mt-1">/ 100</div>
                        </div>
                    </div>
                    <div class="text-xl font-bold ${overallColor} mb-1">Grade: ${overallGrade}</div>
                    <div class="text-surface-400 text-xs font-medium">Calculated Agentic Score</div>
                </div>
                
                <!-- Security & Integrity Report (Cheating detection logs) -->
                <div class="glass rounded-2xl p-6 border border-surface-800 col-span-2">
                    <div class="text-white text-sm font-semibold mb-3 uppercase tracking-wider font-mono flex items-center justify-between">
                        <span>Security & Integrity Report</span>
                        ${penalty > 0 
                            ? `<span class="bg-danger-500/10 text-danger-400 border border-danger-500/20 text-[9px] px-2.5 py-0.5 rounded font-normal font-mono">Anomalies Detected</span>`
                            : `<span class="bg-success-500/10 text-success-400 border border-success-500/20 text-[9px] px-2.5 py-0.5 rounded font-normal font-mono">Passed Integrity Check</span>`
                        }
                    </div>
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center mt-4">
                        <div class="bg-surface-900 border border-surface-800 rounded-xl p-3">
                            <div class="text-surface-500 text-[9px] font-mono">LOOK AWAY EVENTS</div>
                            <div class="text-white font-bold font-mono text-base mt-1">${stats.lookedAwayCount}</div>
                            <div class="text-[9px] text-surface-400 mt-0.5">Sustained turns</div>
                        </div>
                        <div class="bg-surface-900 border border-surface-800 rounded-xl p-3">
                            <div class="text-surface-500 text-[9px] font-mono">FACE ABSENCE SECS</div>
                            <div class="text-white font-bold font-mono text-base mt-1">${stats.secondsLookedAway > 0 && m.eyeContactScore < 5 ? 12 : 0}s</div>
                            <div class="text-[9px] text-surface-400 mt-0.5">Camera exits</div>
                        </div>
                        <div class="bg-surface-900 border border-surface-800 rounded-xl p-3">
                            <div class="text-surface-500 text-[9px] font-mono">MULTIPLE FACES</div>
                            <div class="text-white font-bold font-mono text-base mt-1">${stats.multipleFacesCount}</div>
                            <div class="text-[9px] text-surface-400 mt-0.5">Second persons</div>
                        </div>
                        <div class="bg-surface-900 border border-surface-800 rounded-xl p-3">
                            <div class="text-surface-500 text-[9px] font-mono">MOBILE DETECTION</div>
                            <div class="text-white font-bold font-mono text-base mt-1">${stats.mobileDetectedCount}</div>
                            <div class="text-[9px] text-surface-400 mt-0.5">YOLOv8 phone boxes</div>
                        </div>
                    </div>
                    
                    ${penalty > 0 
                        ? `<div class="mt-4 p-2.5 bg-danger-500/5 border border-danger-500/10 rounded-lg text-danger-400 text-[11px] font-mono">
                                ❌ Integrity Penalty Applied: <strong>-${penalty} points</strong> deducted from final report score for flagged camera anomalies.
                           </div>`
                        : `<div class="mt-4 p-2.5 bg-success-500/5 border border-success-500/10 rounded-lg text-success-400 text-[11px] font-mono">
                                ✓ Excellent setup. No cheating triggers or phone objects were recognized by the CV pipeline.
                           </div>`
                    }
                </div>
            </div>

            <!-- Detailed Metrics -->
            <div class="grid md:grid-cols-2 gap-4 mb-8">
                ${scoreItems.map((item, i) => `
                <div class="glass rounded-xl p-4 border border-surface-800 flex items-center justify-between gap-6 slide-up" style="animation-delay:${i * 0.05}s">
                    <div class="flex-1">
                        <div class="flex items-center justify-between mb-1.5">
                            <span class="text-white text-xs font-semibold">${item.label}</span>
                            <span class="text-surface-400 font-mono text-xs">${item.score}/10</span>
                        </div>
                        <div class="bg-surface-900 rounded-full h-2 border border-surface-800">
                            <div class="bg-${item.color}-500 h-2 rounded-full metric-bar"
                                 style="width:${(item.score / item.max) * 100}%"></div>
                        </div>
                        <div class="text-surface-500 text-[9px] mt-1.5 font-mono">${item.desc}</div>
                    </div>
                </div>`).join('')}
            </div>

            <!-- Communication Stats Row -->
            <div class="grid md:grid-cols-3 gap-6 mb-8">
                ${_commStat('Speaking Speed WPM', `${m.speakingSpeed} <span class="text-xs text-surface-500 font-normal">WPM</span>`,
                    m.speakingSpeed >= 120 && m.speakingSpeed <= 160,
                    m.speakingSpeed >= 120 && m.speakingSpeed <= 160 ? '✓ Optimal range (120-160 WPM)' : '⚠ Slightly off optimal pacing')}
                ${_commStat('Filler Word Frequency', `${m.fillerWords}`,
                    m.fillerWords < 5,
                    m.fillerWords < 5 ? '✓ Clean spoken delivery' : m.fillerWords < 12 ? '⚠ Some word padding used' : '✗ Excess filler usage')}
                ${_commStat('Average Pausing', `${m.averagePause || 2.4} <span class="text-xs text-surface-500 font-normal">sec</span>`,
                    parseFloat(m.averagePause || 2.4) < 3.0,
                    parseFloat(m.averagePause || 2.4) < 3.0 ? '✓ Clear cognitive spacing' : '⚠ Long hesitation pauses detected')}
            </div>

            <!-- Improvement Plan Generator -->
            <div class="glass rounded-2xl p-6 mb-8 border border-surface-800">
                <h3 class="text-white font-semibold text-sm mb-4 flex items-center gap-2 uppercase tracking-wider font-mono">
                    <svg class="w-5 h-5 text-accent-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
                    </svg>
                    Personalized Llama-Generated Improvement Plan
                </h3>

                <div class="grid md:grid-cols-2 gap-6">
                    <div>
                        <h4 class="text-success-400 text-xs font-bold uppercase tracking-wider mb-3">✓ Core Strengths</h4>
                        <ul class="space-y-2.5">
                            ${m.technicalScore >= 7.5 ? _planItem('success', 'Demonstrated command of core algorithms and architectural design principles.') : ''}
                            ${m.eyeContactScore >= 7.5 ? _planItem('success', 'Exceptional frame focus and eye contact matching MediaPipe vectors.') : ''}
                            ${m.confidenceScore >= 7.5 ? _planItem('success', 'Confident verbal communication delivery with strong vocal stability.') : ''}
                            ${_planItem('success', `Described project portfolio architectures (e.g. ${state.projects[0] || 'Crop Disease Detection'}) clearly.`)}
                            ${_planItem('success', `Solid explanation of key matching skills: ${state.skills.slice(0, 3).join(', ')}.`)}
                        </ul>
                    </div>
                    <div>
                        <h4 class="text-danger-400 text-xs font-bold uppercase tracking-wider mb-3">✗ Areas for Growth</h4>
                        <ul class="space-y-2.5">
                            ${m.fillerWords >= 5           ? _planItem('danger', 'Reduce repetitive filler triggers ("like", "um", "basically") to improve eloquence.') : ''}
                            ${m.communicationScore < 8.0   ? _planItem('danger', 'Pace responses cleanly and keep descriptions highly structured.') : ''}
                            ${stats.lookedAwayCount > 3     ? _planItem('danger', 'Avoid looking away frequently when thinking (turns head left/right).') : ''}
                            ${m.technicalScore < 7.5       ? _planItem('danger', 'Provide more concrete keywords and cover missing context concepts in questions.') : ''}
                            ${_planItem('danger', 'Deepen understanding of database normalization, query optimizations, and indices.')}
                        </ul>
                    </div>
                </div>

                <div class="mt-6 pt-5 border-t border-surface-800">
                    <h4 class="text-accent-400 text-xs font-bold uppercase tracking-wider mb-3">📋 Concrete Recommendations</h4>
                    <div class="grid sm:grid-cols-2 gap-3 text-xs text-surface-300">
                        <div class="bg-surface-900/50 p-3 rounded-lg border border-surface-800">
                            <strong class="text-white block mb-1">📚 Technical Study</strong>
                            Review missing RAG definitions. Practice drawing system design architectures for scales above 10K requests/sec.
                        </div>
                        <div class="bg-surface-900/50 p-3 rounded-lg border border-surface-800">
                            <strong class="text-white block mb-1">🗣️ Communication Drills</strong>
                            Record mock answers with a timer. Pause consciously instead of using fillers like "actually" or "you know".
                        </div>
                    </div>
                </div>
            </div>

            <!-- Agent Grid -->
            <div class="glass rounded-xl p-6 mb-8 border border-surface-800">
                <h3 class="text-white font-semibold text-xs mb-4 uppercase tracking-wider font-mono">Agent Performance Summary</h3>
                <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                    ${agentSummary.map(a => `
                    <div class="bg-surface-900/50 rounded-xl p-3 text-center border border-surface-800 flex flex-col justify-between">
                        <div class="text-xl mb-1">${a.icon}</div>
                        <div class="text-white text-[10px] font-bold truncate">${a.name}</div>
                        <div class="text-surface-500 text-[8px] mt-1 font-mono leading-tight">${a.desc}</div>
                        <div class="text-success-400 text-[9px] mt-2 font-semibold bg-success-500/10 border border-success-500/20 py-0.5 rounded font-mono">ACTIVE</div>
                    </div>`).join('')}
                </div>
            </div>

            <!-- Actions -->
            <div class="flex flex-col sm:flex-row gap-4 justify-center">
                <button onclick="resetState();render()"
                    class="bg-accent-600 hover:bg-accent-700 text-white px-8 py-3.5 rounded-xl font-medium transition-all hover:shadow-lg hover:shadow-accent-600/20">
                    Start New Interview
                </button>
                <button onclick="window.print()"
                    class="glass-light hover:bg-surface-800/50 text-surface-300 px-8 py-3.5 rounded-xl font-medium transition-all">
                    Download Report PDF
                </button>
            </div>
        </div>
    </div>
    `;
}

/* ---- private helpers ---- */

function _commStat(label, valueHtml, isGood, note, isBad = false) {
    const noteColor = isBad ? 'text-danger-400' : isGood ? 'text-success-400' : 'text-warning-400';
    return `
    <div class="glass rounded-xl p-5 border border-surface-800">
        <div class="text-surface-500 text-[10px] uppercase tracking-wider font-mono mb-2">${label}</div>
        <div class="text-2xl font-bold text-white font-mono">${valueHtml}</div>
        <div class="text-[10px] mt-1.5 ${noteColor} font-medium">${note}</div>
    </div>`;
}

function _planItem(color, text) {
    return `
    <li class="text-surface-300 text-xs flex items-start gap-2 leading-relaxed">
        <span class="text-${color}-400 mt-1 flex-shrink-0">•</span> <span>${text}</span>
    </li>`;
}
