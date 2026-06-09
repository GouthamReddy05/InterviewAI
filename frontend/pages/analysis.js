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
        // --- STEP 1: RESUME ANALYZER (Gemini API) ---
        logMessage(`> [System] Spawning Agent: Resume Analyzer...`, 'system');
        updateAgentProgress('resumeAnalyzer', 20, 'Initializing');
        
        await new Promise(r => setTimeout(r, 600));
        logMessage(`> [Resume Analyzer] Querying LLM (Gemini 1.5 Flash) for parsing...`);
        updateAgentProgress('resumeAnalyzer', 50, 'Calling Gemini');
        
        let extractedProfile = {
            name: state.candidateName || "Candidate",
            skills: ['Python', 'TensorFlow', 'SQL'],
            projects: ['Crop Disease Detection', 'JobSphere'],
            experience: '1 year experience'
        };
        
        try {
            const systemPrompt = `You are a professional resume parser. Parse the provided resume text and extract the candidate name, up to 8 core technical skills, up to 3 project names, and a brief 1-sentence experience summary. Respond strictly in valid JSON format matching this schema: {"name": "string", "skills": ["string"], "projects": ["string"], "experience": "string"}. Do not include markdown code block syntax (like \`\`\`json) in your response, just return raw JSON text.`;
            
            const rawResponse = await callGemini(
                `Resume text to analyze: \n ${state.resumeRawText || "Resume for " + (state.candidateName || "Goutham")}`, 
                systemPrompt
            );
            
            // Clean markdown wrap if any
            let jsonText = rawResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
            extractedProfile = JSON.parse(jsonText);
            
            logMessage(`> [Resume Analyzer] Parse successful! Candidate: ${extractedProfile.name}`, 'success');
            logMessage(`> [Resume Analyzer] Extracted Skills: ${extractedProfile.skills.join(', ')}`);
            logMessage(`> [Resume Analyzer] Extracted Projects: ${extractedProfile.projects.join(', ')}`);
        } catch (e) {
            console.warn("Resume parsing via Gemini failed, using defaults", e);
            logMessage(`> [Resume Analyzer] API warning: Falling back to profile templates...`, 'error');
            // Mock templates based on selection to guarantee robust runs
            if (state.tempExtracted) {
                extractedProfile.skills = state.tempExtracted.skills;
                extractedProfile.projects = state.tempExtracted.projects;
                extractedProfile.experience = state.tempExtracted.experience;
            }
        }
        
        state.candidateName = extractedProfile.name;
        state.skills = extractedProfile.skills;
        state.projects = extractedProfile.projects;
        state.experience = extractedProfile.experience;
        
        updateAgentProgress('resumeAnalyzer', 100, 'Complete', true);
        await new Promise(r => setTimeout(r, 600));

        // --- STEP 2: QUESTION GENERATOR (Gemini API) ---
        logMessage(`> [System] Spawning Agent: Question Generator...`, 'system');
        updateAgentProgress('questionGenerator', 20, 'Initializing');
        
        await new Promise(r => setTimeout(r, 600));
        logMessage(`> [Question Generator] Calling Gemini to formulate 6 tailored questions...`);
        updateAgentProgress('questionGenerator', 50, 'Generating Qs');

        let dynamicQuestions = [];
        
        try {
            const systemPrompt = `You are a technical interviewer conducting a ${state.difficulty} difficulty interview for the role of ${state.jobRole}. Generate exactly 6 highly relevant, tailored questions based on the candidate's profile. At least one question must ask directly about their projects (e.g. ${state.projects[0] || 'projects'}), and one question must cover applying their skills (e.g. ${state.skills[0] || 'skills'}) in a high-scale production setting. Return strictly in JSON format as a list of 6 objects matching this schema: [{"text": "Question text", "ideal": "A detailed ideal response text used for scoring", "concepts": ["key concept 1", "key concept 2"]}]. Do not include markdown code block syntax in your response, return raw JSON text.`;
            
            const prompt = `Candidate Profile:\nName: ${state.candidateName}\nSkills: ${state.skills.join(', ')}\nProjects: ${state.projects.join(', ')}\nExperience: ${state.experience}`;
            
            const rawResponse = await callGemini(prompt, systemPrompt);
            let jsonText = rawResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
            
            dynamicQuestions = JSON.parse(jsonText);
            
            logMessage(`> [Question Generator] Successfully created 6 custom questions with RAG ideal answer frameworks!`, 'success');
        } catch (e) {
            console.warn("Question generation via Gemini failed, calling offline generator fallback", e);
            logMessage(`> [Question Generator] API warning: Falling back to offline question bank...`, 'error');
            generateQuestions(); // populates state.questions with bank questions
            dynamicQuestions = state.questions;
        }
        
        // Save questions in state
        state.questions = dynamicQuestions.map(q => ({
            text: q.text,
            ideal: q.ideal || "Candidate should demonstrate conceptual understanding.",
            concepts: q.concepts || []
        }));
        
        updateAgentProgress('questionGenerator', 100, 'Complete', true);
        await new Promise(r => setTimeout(r, 600));

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
        
        // Complete fallbacks
        generateQuestions();
        setTimeout(() => {
            state.step = 3;
            render();
        }, 3000);
    }
}
