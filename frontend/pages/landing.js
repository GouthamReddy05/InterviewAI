/* ============================================================
   InterviewAI — Landing Page  (pages/landing.js)
   ============================================================ */

function renderLanding() {
    app.innerHTML = `
    <div class="min-h-screen flex flex-col">
        <!-- Navbar -->
        <nav class="fixed top-0 w-full z-50 glass border-b border-surface-800">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex items-center justify-between h-16">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 bg-accent-600 rounded-lg flex items-center justify-center">
                            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                            </svg>
                        </div>
                        <span class="text-white font-semibold text-lg">InterviewAI</span>
                    </div>
                    <div class="hidden sm:flex items-center gap-8">
                        <a href="#features"    class="text-surface-400 hover:text-white transition-colors text-sm">Features</a>
                        <a href="#how-it-works" class="text-surface-400 hover:text-white transition-colors text-sm">How it Works</a>
                        <a href="#agents"      class="text-surface-400 hover:text-white transition-colors text-sm">Agents</a>
                    </div>
                    <button onclick="state.step=1;render()"
                        class="bg-accent-600 hover:bg-accent-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-lg hover:shadow-accent-600/20">
                        Start Interview
                    </button>
                </div>
            </div>
        </nav>

        <!-- Hero -->
        <main class="flex-1 flex items-center pt-16">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
                <div class="max-w-3xl mx-auto text-center">
                    <div class="inline-flex items-center gap-2 bg-surface-800/50 border border-surface-700/50 rounded-full px-4 py-1.5 mb-8">
                        <span class="w-2 h-2 bg-success-500 rounded-full animate-pulse"></span>
                        <span class="text-xs text-surface-400">Powered by Multi-Agent AI Architecture</span>
                    </div>
                    <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                        Practice interviews with an <span class="text-accent-400">AI that actually gets it</span>
                    </h1>
                    <p class="text-lg text-surface-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                        Real-time technical evaluation, communication analysis, body language tracking, and personalized feedback — all in one session.
                    </p>
                    <div class="flex flex-col sm:flex-row gap-4 justify-center">
                        <button onclick="state.step=1;render()"
                            class="bg-accent-600 hover:bg-accent-700 text-white px-8 py-3.5 rounded-xl text-base font-medium transition-all hover:shadow-xl hover:shadow-accent-600/25 hover:-translate-y-0.5">
                            Start Mock Interview
                        </button>
                        <button onclick="document.getElementById('how-it-works').scrollIntoView({behavior:'smooth'})"
                            class="glass-light hover:bg-surface-800/50 text-surface-300 px-8 py-3.5 rounded-xl text-base font-medium transition-all">
                            See How It Works
                        </button>
                    </div>

                    <!-- Stats -->
                    <div class="grid grid-cols-3 gap-6 mt-16 pt-12 border-t border-surface-800/50">
                        <div><div class="text-2xl font-bold text-white">7</div><div class="text-xs text-surface-500 mt-1">AI Agents Working</div></div>
                        <div><div class="text-2xl font-bold text-white">6</div><div class="text-xs text-surface-500 mt-1">Evaluation Metrics</div></div>
                        <div><div class="text-2xl font-bold text-white">Real-time</div><div class="text-xs text-surface-500 mt-1">Feedback & Analysis</div></div>
                    </div>
                </div>
            </div>
        </main>

        <!-- Features -->
        <section id="features" class="py-20 border-t border-surface-800/50">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 class="text-2xl font-bold text-white text-center mb-12">Everything you need to ace your next interview</h2>
                <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${_featureCards()}
                </div>
            </div>
        </section>

        <!-- How it works -->
        <section id="how-it-works" class="py-20 border-t border-surface-800/50">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 class="text-2xl font-bold text-white text-center mb-12">How it works</h2>
                <div class="max-w-3xl mx-auto">${_howItWorksSteps()}</div>
            </div>
        </section>

        <!-- Agents -->
        <section id="agents" class="py-20 border-t border-surface-800/50">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 class="text-2xl font-bold text-white text-center mb-4">Multi-Agent Architecture</h2>
                <p class="text-surface-400 text-center text-sm mb-12 max-w-xl mx-auto">Seven specialized AI agents working together to simulate a real interview experience</p>
                <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">${_agentCards()}</div>
            </div>
        </section>

        <!-- Footer -->
        <footer class="py-8 border-t border-surface-800/50 text-center text-surface-600 text-sm">
            <p>InterviewAI — Multi-Modal AI Mock Interview Simulator</p>
        </footer>
    </div>
    `;
}

/* ---- private helpers ---- */

function _featureCards() {
    const features = [
        { icon: '🎯', title: 'Technical Evaluation',    desc: 'AI evaluates your answers against ideal responses with scoring on correctness, depth, and completeness.' },
        { icon: '🎙️', title: 'Communication Analysis',  desc: 'Tracks speaking speed, filler words, pauses, and overall communication effectiveness.' },
        { icon: '👁️', title: 'Body Language Tracking',  desc: 'Monitors eye contact, face position, and detects looking-away behavior in real-time.' },
        { icon: '🧠', title: 'Emotion Detection',       desc: 'Analyzes facial expressions to gauge confidence, nervousness, and emotional state.' },
        { icon: '🔍', title: 'Cheating Detection',      desc: 'Detects multiple faces, mobile usage, and suspicious behavior during interviews.' },
        { icon: '📊', title: 'Personalized Feedback',   desc: 'Generates detailed improvement plans with specific recommendations based on your performance.' }
    ];
    return features.map(f => `
        <div class="glass rounded-xl p-6 hover:bg-surface-800/30 transition-all group">
            <div class="text-2xl mb-4 group-hover:scale-110 transition-transform">${f.icon}</div>
            <h3 class="text-white font-medium mb-2">${f.title}</h3>
            <p class="text-surface-400 text-sm leading-relaxed">${f.desc}</p>
        </div>
    `).join('');
}

function _howItWorksSteps() {
    const steps = [
        { num: '01', title: 'Upload Resume',        desc: "Upload your resume and select the job role you're preparing for." },
        { num: '02', title: 'AI Analysis',          desc: 'Our agents extract skills, projects, and experience from your resume.' },
        { num: '03', title: 'Mock Interview',       desc: 'AI interviewer asks questions based on your resume, role, and difficulty level.' },
        { num: '04', title: 'Real-time Monitoring', desc: 'Face tracking, communication analysis, and cheating detection run simultaneously.' },
        { num: '05', title: 'Detailed Report',      desc: 'Get comprehensive scores, feedback, and a personalized improvement plan.' }
    ];
    return steps.map((s, i) => `
        <div class="flex gap-6 mb-8 last:mb-0 fade-in" style="animation-delay:${i * 0.1}s">
            <div class="flex flex-col items-center">
                <div class="w-10 h-10 rounded-full bg-accent-600/20 text-accent-400 flex items-center justify-center font-mono text-sm font-bold">${s.num}</div>
                ${i < 4 ? '<div class="w-px h-12 bg-surface-700 mt-2"></div>' : ''}
            </div>
            <div class="pb-8">
                <h3 class="text-white font-medium mb-1">${s.title}</h3>
                <p class="text-surface-400 text-sm">${s.desc}</p>
            </div>
        </div>
    `).join('');
}

function _agentCards() {
    const agents = [
        { name: 'Resume Analyzer',        icon: '📄', tech: 'NLP, Llama, LangChain' },
        { name: 'Question Generator',     icon: '❓', tech: 'Llama, LangChain' },
        { name: 'AI Interviewer',         icon: '🤖', tech: 'Llama 3, LangChain' },
        { name: 'Technical Evaluator',    icon: '⚙️', tech: 'Llama, LangChain, RAG' },
        { name: 'Communication Evaluator',icon: '🎙️', tech: 'Whisper, Speech Analysis' },
        { name: 'Face Monitor',           icon: '👁️', tech: 'OpenCV, MediaPipe' },
        { name: 'Report Generator',       icon: '📊', tech: 'Llama, LangGraph' }
    ];
    return agents.map(a => `
        <div class="glass rounded-lg p-4 text-center hover:border-accent-600/30 transition-all">
            <div class="text-2xl mb-2">${a.icon}</div>
            <div class="text-white text-sm font-medium">${a.name}</div>
            <div class="text-surface-500 text-xs mt-1 font-mono">${a.tech}</div>
        </div>
    `).join('');
}
