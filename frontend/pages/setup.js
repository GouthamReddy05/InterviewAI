/* ============================================================
   InterviewAI — Interview Setup Page  (pages/setup.js)
   ============================================================ */

function renderInterviewSetup() {
    const name = state.candidateName || 'Candidate';

    app.innerHTML = `
    <div class="ia-page font-sans selection:bg-blue-500/30 pb-16 bg-slate-950 text-slate-200 min-h-screen">
        <!-- Progress Bar -->
        <div class="fixed top-0 w-full z-40 bg-slate-950/80 backdrop-blur-md border-b border-white/10">
            <div class="max-w-5xl mx-auto px-4 py-4">
                <div class="flex items-center justify-between mb-3">
                    <span class="text-white text-sm font-semibold tracking-tight">Interview Parameters</span>
                    <span class="text-slate-400 text-xs font-mono">Step 2 of 5</span>
                </div>
                <div class="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                    <div class="bg-blue-500 h-1.5 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" style="width:40%"></div>
                </div>
            </div>
        </div>

        <div class="max-w-5xl mx-auto px-4 pt-28">
            <div class="mb-10 max-w-3xl">
                <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-6">
                    <i data-lucide="sliders-horizontal" class="w-3.5 h-3.5"></i> Session setup
                </div>
                <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                    <div>
                        <h1 class="text-4xl font-bold text-white mb-3 tracking-tight">Ready, ${name}?</h1>
                        <p class="text-slate-400 text-sm max-w-xl leading-6">Set the pace for this session. Your interviewer will adapt follow-ups to match the level you choose.</p>
                    </div>
                    <div class="text-right shrink-0">
                        <div class="text-[10px] uppercase tracking-[.2em] text-slate-500 font-bold">Session length</div>
                        <div class="text-white font-semibold mt-1">${state.questions.length} questions</div>
                    </div>
                </div>
            </div>
            <div class="grid lg:grid-cols-[1fr_1fr] gap-8">

            <!-- Profile Summary -->
            <div class="interview-panel p-6 backdrop-blur-xl">
                <h3 class="text-white font-semibold mb-6 text-sm flex items-center gap-2">
                    <i data-lucide="user" class="w-4 h-4 text-blue-400"></i> Candidate Profile
                </h3>
                <div class="space-y-6">
                    <div>
                        <span class="text-slate-500 text-[10px] uppercase tracking-widest font-bold mb-1.5 block">Target Role</span>
                        <div class="text-slate-200 text-sm font-semibold bg-white/5 border border-white/10 px-3 py-2 rounded-lg inline-block">${state.jobRole}</div>
                    </div>
                    <div>
                        <span class="text-slate-500 text-[10px] uppercase tracking-widest font-bold mb-2.5 block">Skills Extracted</span>
                        <div class="flex flex-wrap gap-2">
                            ${state.skills.map(s => `
                                <span class="bg-blue-500/10 text-blue-300 text-xs px-2.5 py-1 rounded-md border border-blue-500/20">${s}</span>
                            `).join('')}
                        </div>
                    </div>
                    <div>
                        <span class="text-slate-500 text-[10px] uppercase tracking-widest font-bold mb-2.5 block">Projects Analyzed</span>
                        <div class="flex flex-wrap gap-2">
                            ${state.projects.map(p => `
                                <span class="bg-emerald-500/10 text-emerald-300 text-xs px-2.5 py-1 rounded-md border border-emerald-500/20">${p}</span>
                            `).join('')}
                        </div>
                    </div>
                    <div>
                        <span class="text-slate-500 text-[10px] uppercase tracking-widest font-bold mb-1.5 block">Experience Level</span>
                        <div class="text-slate-300 text-sm font-medium">${state.experience}</div>
                    </div>
                </div>
            </div>

            <div class="space-y-8">
            <!-- Difficulty Selector -->
            <div class="interview-panel p-6 backdrop-blur-xl">
                <h3 class="text-white font-semibold mb-2 text-sm flex items-center gap-2">
                    <i data-lucide="bar-chart" class="w-4 h-4 text-emerald-400"></i> Interview Difficulty
                </h3>
                <p class="text-slate-400 text-xs mb-5">Choose how much challenge you want in technical depth and follow-up questions.</p>
                <div class="grid md:grid-cols-3 gap-3">
                    <button onclick="selectDifficulty('easy')"
                        class="setup-option relative p-4 rounded-xl border text-left transition-all duration-300 text-sm font-medium flex flex-col items-start gap-2 overflow-hidden group
                               ${state.difficulty === 'easy'
                                   ? 'is-selected border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                                   : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-slate-200 hover:bg-white/10'}" id="diff-easy">
                        <span class="flex items-center justify-between w-full"><i data-lucide="sprout" class="w-5 h-5 ${state.difficulty === 'easy' ? 'text-emerald-400' : 'group-hover:text-slate-200'}"></i>${state.difficulty === 'easy' ? '<span class="text-[9px] uppercase tracking-widest text-emerald-300">Selected</span>' : ''}</span>
                        <span class="text-white font-semibold mt-2">Warm-up</span>
                        <span class="text-xs text-slate-400 leading-5">Build confidence with foundational prompts.</span>
                        ${state.difficulty === 'easy' ? '<div class="absolute inset-0 bg-emerald-500/20 blur-xl -z-10 rounded-xl"></div>' : ''}
                    </button>
                    <button onclick="selectDifficulty('medium')"
                        class="setup-option relative p-4 rounded-xl border text-left transition-all duration-300 text-sm font-medium flex flex-col items-start gap-2 overflow-hidden group
                               ${state.difficulty === 'medium'
                                   ? 'is-selected border-blue-500/50 bg-blue-500/10 text-blue-300'
                                   : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-slate-200 hover:bg-white/10'}" id="diff-medium">
                        <span class="flex items-center justify-between w-full"><i data-lucide="target" class="w-5 h-5 ${state.difficulty === 'medium' ? 'text-blue-400' : 'group-hover:text-slate-200'}"></i>${state.difficulty === 'medium' ? '<span class="text-[9px] uppercase tracking-widest text-blue-300">Selected</span>' : ''}</span>
                        <span class="text-white font-semibold mt-2">Balanced</span>
                        <span class="text-xs text-slate-400 leading-5">A realistic mix of breadth, depth, and follow-ups.</span>
                        ${state.difficulty === 'medium' ? '<div class="absolute inset-0 bg-blue-500/20 blur-xl -z-10 rounded-xl"></div>' : ''}
                    </button>
                    <button onclick="selectDifficulty('hard')"
                        class="setup-option relative p-4 rounded-xl border text-left transition-all duration-300 text-sm font-medium flex flex-col items-start gap-2 overflow-hidden group
                               ${state.difficulty === 'hard'
                                   ? 'is-selected border-rose-500/50 bg-rose-500/10 text-rose-300'
                                   : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-slate-200 hover:bg-white/10'}" id="diff-hard">
                        <span class="flex items-center justify-between w-full"><i data-lucide="flame" class="w-5 h-5 ${state.difficulty === 'hard' ? 'text-rose-400' : 'group-hover:text-slate-200'}"></i>${state.difficulty === 'hard' ? '<span class="text-[9px] uppercase tracking-widest text-rose-300">Selected</span>' : ''}</span>
                        <span class="text-white font-semibold mt-2">Stretch</span>
                        <span class="text-xs text-slate-400 leading-5">Push into ambiguous scenarios and deeper reasoning.</span>
                        ${state.difficulty === 'hard' ? '<div class="absolute inset-0 bg-rose-500/20 blur-xl -z-10 rounded-xl"></div>' : ''}
                    </button>
                </div>
                <div class="text-slate-400 text-xs mt-6 text-center font-mono bg-white/5 py-2 rounded-lg border border-white/5">
                    Planned: ${state.questions.length} questions (${state.difficulty.toUpperCase()} tier)
                </div>
            </div>

            <!-- Guidelines -->
            <div class="bg-white/[0.02] border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-xl">
                <h3 class="text-white font-semibold mb-4 text-sm flex items-center gap-2">
                    <i data-lucide="info" class="w-4 h-4 text-amber-400"></i> Guidelines
                </h3>
                <ul class="space-y-3 text-sm text-slate-300">
                    ${_guidelineItem('Speak clearly — real-time transcription is active')}
                    ${_guidelineItem('Enable webcam for eye contact and emotion metrics')}
                    ${_guidelineItem('Stay in frame — AI flags multiple faces or phone usage')}
                    ${_guidelineItem('Expect dynamic follow-ups based on your explanations')}
                </ul>
            </div>

            <div class="flex flex-col gap-3">
                <button onclick="startInterview()"
                    class="w-full bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-300 shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] group">
                    Begin Interview <i data-lucide="arrow-right" class="w-4 h-4 group-hover:translate-x-1 transition-transform"></i>
                </button>
                <button onclick="state.step=1;render()"
                    class="w-full text-slate-400 hover:text-white py-3 text-sm transition-colors font-semibold bg-white/5 hover:bg-white/10 rounded-xl border border-white/5">
                    Go back
                </button>
            </div>

            </div>
            </div>
        </div>
    </div>
    `;

    if(window.lucide) { setTimeout(() => lucide.createIcons(), 10); }
}

function selectDifficulty(diff) {
    state.difficulty = diff;
    // Note: Questions are already fetched from backend, don't regenerate
    renderInterviewSetup();
}

/* ---- private ---- */

function _guidelineItem(text) {
    return `
    <li class="flex items-start gap-3">
        <i data-lucide="check-circle" class="w-4 h-4 text-emerald-400 mt-0.5 shrink-0"></i>
        <span>${text}</span>
    </li>`;
}
