

function renderLogin() {
    app.innerHTML = `
    <div class="min-h-screen flex items-center justify-center relative overflow-hidden" style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);">
        <div class="absolute w-[400px] h-[400px] bg-accent-600 rounded-full blur-[80px] opacity-30 -top-10 -left-10 animate-pulse"></div>
        <div class="absolute w-[500px] h-[500px] bg-purple-600 rounded-full blur-[80px] opacity-20 -bottom-10 -right-10 animate-pulse" style="animation-delay: -3s;"></div>

        <div class="relative z-10 w-full max-w-md p-8 bg-surface-900/60 backdrop-blur-xl rounded-2xl border border-surface-700/50 shadow-2xl">
            <div class="absolute top-4 left-4">
                <button onclick="state.step=0;render()" class="text-surface-400 hover:text-white flex items-center gap-2 transition-colors text-sm">
                    <i data-lucide="arrow-left" class="w-4 h-4"></i> Back to Home
                </button>
            </div>
            <div class="text-center mb-8 mt-4">
                <h1 class="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent-400 to-purple-400 mb-2">Welcome Back</h1>
                <p class="text-surface-400 text-sm">Sign in to continue to InterviewAI</p>
            </div>
            <div id="errorBox" class="hidden bg-danger-500/10 border border-danger-500/20 text-danger-400 p-3 rounded-lg text-sm mb-6 text-center"></div>
            <form id="loginForm" class="space-y-5">
                <div>
                    <label class="block text-sm font-medium text-surface-200 mb-1.5">Username</label>
                    <input type="text" id="username" required class="w-full bg-surface-800/80 border border-surface-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-all">
                </div>
                <div>
                    <label class="block text-sm font-medium text-surface-200 mb-1.5">Password</label>
                    <input type="password" id="password" required class="w-full bg-surface-800/80 border border-surface-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-all">
                </div>
                <button type="submit" class="w-full bg-accent-600 hover:bg-accent-500 text-white font-medium py-3 rounded-xl shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-all hover:-translate-y-0.5 mt-4">Sign In</button>
            </form>
            <div class="mt-8 text-center text-sm text-surface-400">Don't have an account? <button onclick="state.step=7;render()" class="text-accent-400 hover:text-accent-300 font-medium transition-colors">Sign up</button></div>
        </div>
    </div>`;

    setTimeout(() => {
        if (window.lucide) lucide.createIcons();
        document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const errorBox = document.getElementById('errorBox');
            const formData = new FormData();
            formData.append('username', document.getElementById('username').value);
            formData.append('password', document.getElementById('password').value);
            try {
                const response = await fetch('/api/auth/login', { method: 'POST', body: formData });
                const data = await response.json();
                if (response.ok) {
                    localStorage.setItem('interviewai_token', data.access_token);
                    state.step = 0;
                    render();
                } else {
                    errorBox.textContent = data.detail || 'Login failed';
                    errorBox.classList.remove('hidden');
                }
            } catch (error) {
                errorBox.textContent = 'Network error occurred';
                errorBox.classList.remove('hidden');
            }
        });
    }, 100);
}
