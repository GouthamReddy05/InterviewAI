

function renderSignup() {
    app.innerHTML = `
    <div class="min-h-screen flex items-center justify-center relative overflow-hidden" style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);">
        <div class="absolute w-[400px] h-[400px] bg-purple-600 rounded-full blur-[80px] opacity-30 -top-10 -right-10 animate-pulse"></div>
        <div class="absolute w-[500px] h-[500px] bg-accent-600 rounded-full blur-[80px] opacity-20 -bottom-10 -left-10 animate-pulse" style="animation-delay: -3s;"></div>

        <div class="relative z-10 w-full max-w-md p-8 bg-surface-900/60 backdrop-blur-xl rounded-2xl border border-surface-700/50 shadow-2xl">
            <div class="absolute top-4 left-4">
                <button onclick="state.step=0;render()" class="text-surface-400 hover:text-white flex items-center gap-2 transition-colors text-sm">
                    <i data-lucide="arrow-left" class="w-4 h-4"></i> Back to Home
                </button>
            </div>
            <div class="text-center mb-8 mt-4">
                <h1 class="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-accent-400 mb-2">Create Account</h1>
                <p class="text-surface-400 text-sm">Join InterviewAI to start practicing</p>
            </div>
            <div id="errorBox" class="hidden bg-danger-500/10 border border-danger-500/20 text-danger-400 p-3 rounded-lg text-sm mb-6 text-center"></div>
            <form id="signupForm" class="space-y-5">
                <div>
                    <label class="block text-sm font-medium text-surface-200 mb-1.5">Username</label>
                    <input type="text" id="username" required class="w-full bg-surface-800/80 border border-surface-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all">
                </div>
                <div>
                    <label class="block text-sm font-medium text-surface-200 mb-1.5">Email</label>
                    <input type="email" id="email" required class="w-full bg-surface-800/80 border border-surface-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all">
                </div>
                <div>
                    <label class="block text-sm font-medium text-surface-200 mb-1.5">Password</label>
                    <input type="password" id="password" required class="w-full bg-surface-800/80 border border-surface-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all">
                </div>
                <button type="submit" class="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium py-3 rounded-xl shadow-[0_0_15px_rgba(147,51,234,0.3)] transition-all hover:-translate-y-0.5 mt-4">Sign Up</button>
            </form>
            <div class="mt-8 text-center text-sm text-surface-400">Already have an account? <button onclick="state.step=6;render()" class="text-purple-400 hover:text-purple-300 font-medium transition-colors">Sign in</button></div>
        </div>
    </div>`;

    setTimeout(() => {
        if (window.lucide) lucide.createIcons();
        document.getElementById('signupForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const errorBox = document.getElementById('errorBox');
            errorBox.classList.add('hidden');

            // Mirror the server-side rules so the user gets immediate feedback.
            const password = document.getElementById('password').value;
            if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
                errorBox.textContent = 'Password must be at least 8 characters and include a letter and a number.';
                errorBox.classList.remove('hidden');
                return;
            }

            const submitBtn = e.target.querySelector('button[type=submit]');
            if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Creating account...'; }
            try {
                const response = await fetch('/api/auth/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: document.getElementById('username').value,
                        email: document.getElementById('email').value,
                        password: password
                    })
                });
                const data = await response.json();
                if (response.ok) {
                    localStorage.setItem('interviewai_token', data.access_token);
                    state.step = 0;
                    render();
                } else {
                    errorBox.textContent = formatApiError(data, 'Signup failed');
                    errorBox.classList.remove('hidden');
                }
            } catch (error) {
                errorBox.textContent = 'Network error occurred';
                errorBox.classList.remove('hidden');
            } finally {
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Sign Up'; }
            }
        });
    }, 100);
}
