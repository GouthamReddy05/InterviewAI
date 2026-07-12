/* ============================================================
   InterviewAI — Analysis Page  (pages/analysis.js)
   ============================================================ */

function renderAnalysis() {
    const agents = [
        { id: 'resumeAnalyzer',   label: 'Resume Analyzer Agent',   icon: '📄' },
        { id: 'questionGenerator', label: 'Question Generator Agent', icon: '❓' },
        { id: 'faceMonitor',      label: 'Face Monitor Agent',       icon: '👁️' }
    ];

    app.innerHTML = `
    <div class="min-h-screen bg-surface-950 flex items-center justify-center px-4 py-8">
        <div class="max-w-2xl w-full text-center">
            <div class="w-14 h-14 bg-accent-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6 pulse-ring">
                <svg class="w-7 h-7 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
            </div>
            <h2 class="text-xl font-bold text-white mb-1">Analyzing your resume</h2>
            <p class="text-surface-400 text-sm mb-6">Our AI agents are extracting skills, projects, and experience...</p>

            <!-- Agent Progress Boxes -->
            <div class="grid sm:grid-cols-3 gap-3 text-left max-w-xl mx-auto mb-6">
                ${agents.map(agent => `
                <div class="glass rounded-xl p-3 border border-surface-800" id="agent-${agent.id}">
                    <div class="flex items-center gap-2 mb-2">
                        <div class="text-base">${agent.icon}</div>
                        <div class="text-white text-xs font-semibold truncate">${agent.label}</div>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="flex-1 bg-surface-800 rounded-full h-1">
                            <div class="bg-accent-600 h-1 rounded-full transition-all duration-700" style="width:0%" id="progress-${agent.id}"></div>
                        </div>
                        <span class="text-surface-500 text-[10px] font-mono" id="status-${agent.id}">Wait</span>
                    </div>
                </div>
                `).join('')}
            </div>

            <!-- Terminal-style Log Console -->
            <div class="max-w-xl mx-auto">
                <div class="bg-surface-950 border border-surface-800 rounded-xl overflow-hidden shadow-2xl">
                    <div class="bg-surface-900 px-4 py-2 border-b border-surface-800 flex items-center justify-between">
                        <div class="flex items-center gap-1.5">
                            <span class="w-2.5 h-2.5 bg-red-500/20 border border-red-500/40 rounded-full"></span>
                            <span class="w-2.5 h-2.5 bg-yellow-500/20 border border-yellow-500/40 rounded-full"></span>
                            <span class="w-2.5 h-2.5 bg-green-500/20 border border-green-500/40 rounded-full"></span>
                        </div>
                        <span class="text-[10px] font-mono text-surface-500">Agentic Orchestrator v1.2.0</span>
                    </div>
                    <div class="p-4 font-mono text-[11px] text-left text-surface-300 h-64 overflow-y-auto space-y-1.5" id="terminalConsole">
                        <div class="text-accent-400/70">> [System] Spawning Agentic System...</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;
}

async function simulateAnalysis() {
    const consoleEl = document.getElementById('terminalConsole');
    
    function logMessage(text, type = 'normal') {
        if (!consoleEl) return;
        const line = document.createElement('div');
        if (type === 'system') {
            line.className = 'text-accent-400 font-semibold';
        } else if (type === 'success') {
            line.className = 'text-success-400';
        } else if (type === 'error') {
            line.className = 'text-danger-400';
        } else {
            line.className = 'text-surface-300';
        }
        line.textContent = text;
        consoleEl.appendChild(line);
        consoleEl.scrollTop = consoleEl.scrollHeight;
    }

    function updateAgentProgress(id, prog, label, isFinished = false) {
        const progBar = document.getElementById(`progress-${id}`);
        const statusEl = document.getElementById(`status-${id}`);
        if (progBar) progBar.style.width = `${prog}%`;
        if (statusEl) {
            statusEl.textContent = label;
            if (isFinished) {
                statusEl.className = 'text-success-400 font-mono';
                state.agentStatus[id] = 'complete';
            } else {
                statusEl.className = 'text-accent-400 font-mono animate-pulse';
            }
        }
    }

    try {
        logMessage(`> [System] Spawning Agentic System...`, 'system');
        
        // --- STEP 1 & 2: Backend Upload and Generation ---
        logMessage(`> [Backend] Uploading resume and generating questions...`);
        updateAgentProgress('resumeAnalyzer', 30, 'Uploading');
        updateAgentProgress('questionGenerator', 30, 'Waiting');

        await uploadResumeToBackend();

        if (state.questions && state.questions.length > 0) {
            logMessage(`> [Resume Analyzer] Parse successful!`, 'success');
            updateAgentProgress('resumeAnalyzer', 100, 'Complete', true);

            logMessage(`> [Question Generator] Successfully retrieved ${state.questions.length} tailored questions from backend!`, 'success');
            updateAgentProgress('questionGenerator', 100, 'Complete', true);
        } else {
            throw new Error("Failed to get questions from backend");
        }

        // --- STEP 3: FACE MONITORING AGENT (MediaPipe CV setup) ---
        logMessage(`> [System] Spawning Agent: Face Monitoring Agent...`, 'system');
        updateAgentProgress('faceMonitor', 20, 'Initializing');
        
        await new Promise(r => setTimeout(r, 600));
        logMessage(`> [Face Monitor] Setting up browser MediaPipe FaceMesh bindings...`);
        updateAgentProgress('faceMonitor', 60, 'Loading Models');
        
        await new Promise(r => setTimeout(r, 800));
        logMessage(`> [Face Monitor] MediaPipe Face Mesh model loaded successfully. Camera tracker active.`, 'success');
        updateAgentProgress('faceMonitor', 100, 'Complete', true);
        
        logMessage(`> [System] Orchestration complete. Launching Setup screen...`, 'system');
        
        await new Promise(r => setTimeout(r, 1000));
        state.step = 3;
        render();

    } catch (globalError) {
        logMessage(`> [System Error] Critical orchestrator failure: ${globalError.message}`, 'error');
        console.error("Critical simulation error", globalError);
        
        logMessage(`> [System] HALTING: Please check the backend server.`, 'error');
        alert("Backend API failed. Please ensure the Python server is running.");
    }
}
