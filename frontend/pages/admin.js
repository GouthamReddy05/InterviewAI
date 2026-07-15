/* ============================================================
   InterviewAI — Admin Dashboard  (pages/admin.js)
   ============================================================ */

function renderAdmin() {
    app.innerHTML = `
    <div class="ia-page font-sans selection:bg-blue-200/60 flex flex-col">
        <!-- Navbar -->
        <nav class="ia-topbar px-6 py-4 flex items-center justify-between sticky top-0 z-50">
            <div class="flex items-center gap-3">
                <span class="w-9 h-9 rounded-lg bg-slate-950 text-white flex items-center justify-center">
                    <i data-lucide="shield-check" class="w-5 h-5"></i>
                </span>
                <h1 class="text-slate-950 font-semibold text-lg tracking-tight">Admin Dashboard</h1>
            </div>
            <div class="flex items-center gap-6">
                <button onclick="state.step=0;render()" class="text-slate-600 hover:text-slate-950 transition-colors text-sm font-semibold">Home</button>
                <button id="logoutBtn" class="ia-button-secondary px-4 py-1.5 text-sm font-semibold">Logout</button>
            </div>
        </nav>

        <!-- Main Content -->
        <div class="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
            <div class="mb-8">
                <div class="ia-chip mb-4"><i data-lucide="database" class="w-3.5 h-3.5 text-blue-600"></i> Operations</div>
                <h2 class="text-3xl font-bold tracking-tight text-slate-950">Users and sessions</h2>
                <p class="text-sm text-slate-600 mt-2">A compact view of platform activity, roles, interview status, and scores.</p>
            </div>
            <div id="errorBox" class="hidden bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-lg text-sm mb-8 text-center"></div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <!-- Users Table -->
                <div class="ia-card p-6 relative overflow-hidden">
                    <div class="flex items-center justify-between mb-6">
                        <h2 class="text-slate-950 font-semibold text-lg flex items-center gap-2">
                            Registered Users 
                            <span id="userCount" class="bg-blue-50 text-blue-700 border border-blue-100 py-0.5 px-2.5 rounded-full text-[10px] uppercase tracking-wider font-mono">0</span>
                        </h2>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm text-left">
                            <thead class="text-xs text-slate-500 uppercase tracking-wider border-b border-slate-200">
                                <tr>
                                    <th class="px-4 py-3 font-normal">ID</th>
                                    <th class="px-4 py-3 font-normal">Username</th>
                                    <th class="px-4 py-3 font-normal">Email</th>
                                    <th class="px-4 py-3 font-normal">Role</th>
                                </tr>
                            </thead>
                            <tbody id="usersTableBody" class="divide-y divide-slate-100 text-slate-600">
                                <tr><td colspan="4" class="px-4 py-8 text-center text-slate-500">Loading...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Interviews Table -->
                <div class="ia-card p-6 relative overflow-hidden">
                    <div class="flex items-center justify-between mb-6">
                        <h2 class="text-slate-950 font-semibold text-lg flex items-center gap-2">
                            Interview Sessions 
                            <span id="interviewCount" class="bg-emerald-50 text-emerald-700 border border-emerald-100 py-0.5 px-2.5 rounded-full text-[10px] uppercase tracking-wider font-mono">0</span>
                        </h2>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm text-left">
                            <thead class="text-xs text-slate-500 uppercase tracking-wider border-b border-slate-200">
                                <tr>
                                    <th class="px-4 py-3 font-normal">User</th>
                                    <th class="px-4 py-3 font-normal">Role</th>
                                    <th class="px-4 py-3 font-normal">Status</th>
                                    <th class="px-4 py-3 font-normal">Score</th>
                                </tr>
                            </thead>
                            <tbody id="interviewsTableBody" class="divide-y divide-slate-100 text-slate-600">
                                <tr><td colspan="4" class="px-4 py-8 text-center text-slate-500">Loading...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;
    if(window.lucide) { setTimeout(() => lucide.createIcons(), 10); }

    setTimeout(async () => {
        const token = localStorage.getItem('interviewai_token');
        if (!token) {
            state.step = 6; // Go to login
            render();
            return;
        }

        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            localStorage.removeItem('interviewai_token');
            state.step = 6;
            render();
        });

        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            
            // Check if admin
            const userRes = await fetch('/api/auth/me', { headers });
            if (!userRes.ok) throw new Error('Authentication failed');
            const user = await userRes.json();
            
            if (!user.is_admin) {
                throw new Error('Access denied. Administrator privileges required.');
            }
            
            // Fetch Users
            const usersRes = await fetch('/api/admin/users', { headers });
            if (usersRes.ok) {
                const users = await usersRes.json();
                document.getElementById('userCount').textContent = users.length;
                
                const tbody = document.getElementById('usersTableBody');
                tbody.innerHTML = '';
                if (users.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-8 text-center text-slate-500">No users found</td></tr>';
                }
                users.forEach(u => {
                    const roleBadge = u.is_admin 
                        ? '<span class="bg-slate-950 text-white border border-slate-950 py-1 px-2.5 rounded-md text-[10px] font-semibold tracking-wide">Admin</span>' 
                        : '<span class="bg-slate-100 text-slate-600 border border-slate-200 py-1 px-2.5 rounded-md text-[10px] font-semibold tracking-wide">User</span>';
                    tbody.innerHTML += `
                        <tr class="hover:bg-slate-50 transition-colors">
                            <td class="px-4 py-4 font-mono text-slate-400 text-xs">#${u.id}</td>
                            <td class="px-4 py-4 font-semibold text-slate-950 text-sm">${u.username}</td>
                            <td class="px-4 py-4 text-sm">${u.email}</td>
                            <td class="px-4 py-4">${roleBadge}</td>
                        </tr>`;
                });
            }
            
            // Fetch Interviews
            const interviewsRes = await fetch('/api/admin/interviews', { headers });
            if (interviewsRes.ok) {
                const interviews = await interviewsRes.json();
                document.getElementById('interviewCount').textContent = interviews.length;
                
                const tbody = document.getElementById('interviewsTableBody');
                tbody.innerHTML = '';
                if (interviews.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-8 text-center text-slate-500">No interviews found</td></tr>';
                }
                interviews.forEach(i => {
                    const statusClass = i.status === 'completed' ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-amber-700 bg-amber-50 border-amber-100';
                    const score = i.score !== null ? `<span class="font-semibold text-slate-950">${Math.round(i.score)}</span><span class="text-slate-400 text-[10px]">/100</span>` : '<span class="text-slate-400">-</span>';
                    tbody.innerHTML += `
                        <tr class="hover:bg-slate-50 transition-colors">
                            <td class="px-4 py-4 font-semibold text-slate-950 text-sm">${i.username}</td>
                            <td class="px-4 py-4 text-sm">${i.job_role}</td>
                            <td class="px-4 py-4"><span class="px-2.5 py-1 border rounded-md text-[10px] font-medium tracking-wider ${statusClass}">${i.status}</span></td>
                            <td class="px-4 py-4 text-sm">${score}</td>
                        </tr>`;
                });
            }
            
        } catch (err) {
            const errorBox = document.getElementById('errorBox');
            errorBox.textContent = err.message || 'Failed to load admin data';
            errorBox.classList.remove('hidden');
            document.getElementById('usersTableBody').innerHTML = '<tr><td colspan="4" class="px-4 py-8 text-center text-rose-600">Error loading data</td></tr>';
            document.getElementById('interviewsTableBody').innerHTML = '<tr><td colspan="4" class="px-4 py-8 text-center text-rose-600">Error loading data</td></tr>';
        }
    }, 100);
}
