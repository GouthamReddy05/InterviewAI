/* ============================================================
   InterviewAI — Login Page  (pages/login.js)
   ============================================================ */

function renderLogin() {
    app.innerHTML = `
    <div class="ia-page font-sans selection:bg-blue-200/60 flex min-h-screen">
        <div class="hidden lg:flex w-[46%] bg-slate-950 text-white p-10 flex-col justify-between">
            <button onclick="state.step=0;render()" class="flex items-center gap-3 text-left">
                <span class="w-10 h-10 rounded-lg bg-white text-slate-950 flex items-center justify-center">
                    <i data-lucide="brain-circuit" class="w-5 h-5"></i>
                </span>
                <span class="font-semibold">InterviewAI</span>
            </button>
            <div>
                <div class="ia-chip bg-white/10 border-white/10 text-slate-200 mb-6">
                    <i data-lucide="lock-keyhole" class="w-3.5 h-3.5 text-emerald-300"></i>
                    Candidate workspace
                </div>
                <h1 class="text-4xl font-bold tracking-tight leading-tight max-w-md">Resume-aware practice, saved in your account.</h1>
                <div class="grid grid-cols-3 gap-3 mt-10 max-w-md">
                    ${[
                        ['Profile', 'file-text'],
                        ['Session', 'messages-square'],
                        ['Report', 'bar-chart-3']
                    ].map(item => `
                        <div class="rounded-lg bg-white/5 border border-white/10 p-4">
                            <i data-lucide="${item[1]}" class="w-5 h-5 text-blue-300 mb-4"></i>
                            <div class="text-sm font-semibold">${item[0]}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <p class="text-sm text-slate-400">Sign in to continue setup, reports, and admin access.</p>
        </div>

        <div class="flex-1 flex items-center justify-center px-4 py-10">
            <div class="w-full max-w-md">
                <button onclick="state.step=0;render()" class="lg:hidden mb-8 text-slate-600 hover:text-slate-950 flex items-center gap-2 text-sm font-semibold">
                    <i data-lucide="arrow-left" class="w-4 h-4"></i> Back
                </button>
                <div class="ia-card p-6 sm:p-8">
                    <div class="mb-8">
                        <div class="w-11 h-11 rounded-lg bg-slate-950 text-white flex items-center justify-center mb-5">
                            <i data-lucide="log-in" class="w-5 h-5"></i>
                        </div>
                        <h1 class="text-2xl font-bold tracking-tight text-slate-950">Welcome back</h1>
                        <p class="text-slate-600 text-sm mt-2">Sign in to open your interview workspace.</p>
                    </div>

                    <div id="errorBox" class="hidden border border-rose-200 bg-rose-50 text-rose-700 p-3 rounded-lg text-sm mb-5"></div>

                    <form id="loginForm" class="space-y-4">
                        <div>
                            <label class="block text-sm font-semibold text-slate-700 mb-1.5">Username</label>
                            <div class="relative">
                                <i data-lucide="user" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"></i>
                                <input type="text" id="username" required class="ia-input w-full pl-10 pr-3 py-2.5 text-sm" placeholder="Enter username">
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
                            <div class="relative">
                                <i data-lucide="key-round" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"></i>
                                <input type="password" id="password" required class="ia-input w-full pl-10 pr-3 py-2.5 text-sm" placeholder="Enter password">
                            </div>
                        </div>
                        <button type="submit" class="ia-button-primary w-full py-3 text-sm font-semibold flex items-center justify-center gap-2">
                            Log in <i data-lucide="arrow-right" class="w-4 h-4"></i>
                        </button>
                    </form>

                    <div class="mt-6 text-center text-sm text-slate-600">
                        Don't have an account?
                        <button onclick="state.step=7;render()" class="text-slate-950 font-semibold hover:underline">Sign up</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;

    setTimeout(() => {
        if (window.lucide) lucide.createIcons();
        document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const errorBox = document.getElementById('errorBox');
            
            const formData = new FormData();
            formData.append('username', username);
            formData.append('password', password);

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
