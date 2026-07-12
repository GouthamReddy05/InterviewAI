/* ============================================================
   InterviewAI — Interview Setup Page  (pages/setup.js)
   ============================================================ */

function renderInterviewSetup() {
    const name = state.candidateName || 'Candidate';

    app.innerHTML = `
    <div class="min-h-screen bg-surface-950">
        <!-- Progress Bar -->
        <div class="fixed top-0 w-full z-40 bg-surface-950/90 backdrop-blur-sm border-b border-surface-800">
            <div class="max-w-3xl mx-auto px-4 py-4">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-white text-sm font-medium">Setup Interview</span>
                    <span class="text-surface-500 text-xs">Step 2 of 5</span>
                </div>
                <div class="w-full bg-surface-800 rounded-full h-1.5">
                    <div class="bg-accent-600 h-1.5 rounded-full" style="width:40%"></div>
                </div>
            </div>
        </div>

        <div class="max-w-2xl mx-auto px-4 pt-24 pb-16">
            <h1 class="text-2xl font-bold text-white mb-2">Ready, ${name}?</h1>
            <p class="text-surface-400 text-sm mb-8">Here's what your interview will look like.</p>

            <!-- Profile Summary -->
            <div class="glass rounded-xl p-6 mb-6 border border-surface-800">
                <h3 class="text-white font-medium mb-4 text-sm">Your Profile</h3>
                <div class="space-y-3">
                    <div>
                        <span class="text-surface-500 text-[10px] uppercase tracking-wider">Target Role</span>
                        <div class="text-white text-sm mt-0.5">${state.jobRole}</div>
                    </div>
                    <div>
                        <span class="text-surface-500 text-[10px] uppercase tracking-wider">Skills Extracted</span>
                        <div class="flex flex-wrap gap-2 mt-1">
                            ${state.skills.map(s => `
                                <span class="bg-accent-600/10 text-accent-400 text-xs px-2.5 py-1 rounded-full border border-accent-500/10">${s}</span>
                            `).join('')}
                        </div>
                    </div>
                    <div>
                        <span class="text-surface-500 text-[10px] uppercase tracking-wider">Projects Analyzed</span>
                        <div class="flex flex-wrap gap-2 mt-1">
                            ${state.projects.map(p => `
                                <span class="bg-surface-800 text-surface-300 text-xs px-2.5 py-1 rounded-full border border-surface-700/50">${p}</span>
                            `).join('')}
                        </div>
                    </div>
                    <div>
                        <span class="text-surface-500 text-[10px] uppercase tracking-wider">Experience Level</span>
                        <div class="text-white text-sm mt-0.5">${state.experience}</div>
                    </div>
                </div>
            </div>

            <!-- Difficulty Selector -->
            <div class="glass rounded-xl p-6 mb-6 border border-surface-800">
                <h3 class="text-white font-medium mb-2 text-sm">Select Interview Difficulty</h3>
                <p class="text-surface-400 text-xs mb-4">Adjust the complexity and types of technical questions you will be asked.</p>
                <div class="grid grid-cols-3 gap-3">
                    <button onclick="selectDifficulty('easy')"
                        class="p-3 rounded-lg border text-center transition-all text-xs font-medium
                               ${state.difficulty === 'easy'
                                   ? 'border-success-500 bg-success-500/10 text-success-400'
                                   : 'border-surface-700 bg-surface-900/50 text-surface-400 hover:border-surface-600 hover:text-surface-300'}" id="diff-easy">
                        🟢 Easy
                    </button>
                    <button onclick="selectDifficulty('medium')"
                        class="p-3 rounded-lg border text-center transition-all text-xs font-medium
                               ${state.difficulty === 'medium'
                                   ? 'border-warning-500 bg-warning-500/10 text-warning-400'
                                   : 'border-surface-700 bg-surface-900/50 text-surface-400 hover:border-surface-600 hover:text-surface-300'}" id="diff-medium">
                        🟡 Medium
                    </button>
                    <button onclick="selectDifficulty('hard')"
                        class="p-3 rounded-lg border text-center transition-all text-xs font-medium
                               ${state.difficulty === 'hard'
                                   ? 'border-danger-500 bg-danger-500/10 text-danger-400'
                                   : 'border-surface-700 bg-surface-900/50 text-surface-400 hover:border-surface-600 hover:text-surface-300'}" id="diff-hard">
                        🔴 Hard
                    </button>
                </div>
                <div class="text-surface-500 text-[11px] mt-3 italic text-center">
                    Planned: ${state.questions.length} questions (${state.difficulty.toUpperCase()} tier + Projects & Skills check)
                </div>
            </div>

            <!-- Guidelines -->
            <div class="glass rounded-xl p-6 mb-8 border border-surface-800">
                <h3 class="text-white font-medium mb-3 text-sm">Interview Guidelines</h3>
                <ul class="space-y-2 text-sm text-surface-400">
                    ${_guidelineItem('Speak your answers clearly — real-time transcription is active')}
                    ${_guidelineItem('Enable web camera to activate eye contact and emotion monitoring')}
                    ${_guidelineItem('Stay inside the camera frame — AI flags multiple faces or phone usage')}
                    ${_guidelineItem('Be ready for dynamic follow-ups based on the concepts you explain')}
                </ul>
            </div>

            <button onclick="startInterview()"
                class="w-full bg-accent-600 hover:bg-accent-700 text-white py-3.5 rounded-xl font-medium transition-all hover:shadow-lg hover:shadow-accent-600/20">
                Begin Interview
            </button>
            <button onclick="state.step=1;render()"
                class="w-full text-surface-400 hover:text-white py-3 text-sm mt-2 transition-colors">
                Go back
            </button>
        </div>
    </div>
    `;
}

function selectDifficulty(diff) {
    state.difficulty = diff;
    // Note: Questions are already fetched from backend, don't regenerate
    renderInterviewSetup();
}

/* ---- private ---- */

function _guidelineItem(text) {
    return `
    <li class="flex items-start gap-2">
        <svg class="w-4 h-4 text-accent-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        ${text}
    </li>`;
}
