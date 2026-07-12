/* ============================================================
   InterviewAI — Admin Dashboard  (pages/admin.js)
   ============================================================ */

function renderAdmin() {
    app.innerHTML = `
    <div class="min-h-screen bg-surface-950 flex flex-col">
        <!-- Navbar -->
        <nav class="bg-surface-900 border-b border-surface-800 px-6 py-4 flex items-center justify-between">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-success-600 rounded-lg flex items-center justify-center">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                    </svg>
                </div>
                <h1 class="text-success-400 font-bold text-xl tracking-wide">Admin Dashboard</h1>
            </div>
            <div class="flex items-center gap-6">
                <button onclick="state.step=0;render()" class="text-surface-400 hover:text-white transition-colors text-sm font-medium">Back to Home</button>
                <button id="logoutBtn" class="text-danger-400 hover:text-danger-300 transition-colors text-sm font-medium">Logout</button>
            </div>
        </nav>

        <!-- Main Content -->
        <div class="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
            <div id="errorBox" class="hidden bg-danger-500/10 border border-danger-500/20 text-danger-400 p-4 rounded-xl text-sm mb-8 text-center font-medium"></div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <!-- Users Table -->
                <div class="bg-surface-900 border border-surface-800 rounded-2xl p-6 shadow-xl">
                    <div class="flex items-center justify-between mb-6">
                        <h2 class="text-white font-semibold text-lg flex items-center gap-2">
                            Registered Users 
                            <span id="userCount" class="bg-success-500/20 text-success-400 py-1 px-3 rounded-full text-xs font-bold">0</span>
                        </h2>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm text-left">
                            <thead class="text-xs text-surface-400 uppercase bg-surface-800/50">
                                <tr>
                                    <th class="px-4 py-3 rounded-tl-lg">ID</th>
                                    <th class="px-4 py-3">Username</th>
                                    <th class="px-4 py-3">Email</th>
                                    <th class="px-4 py-3 rounded-tr-lg">Role</th>
                                </tr>
                            </thead>
                            <tbody id="usersTableBody" class="divide-y divide-surface-800 text-surface-200">
                                <tr><td colspan="4" class="px-4 py-8 text-center text-surface-500">Loading...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Interviews Table -->
                <div class="bg-surface-900 border border-surface-800 rounded-2xl p-6 shadow-xl">
                    <div class="flex items-center justify-between mb-6">
                        <h2 class="text-white font-semibold text-lg flex items-center gap-2">
                            Interview Sessions 
                            <span id="interviewCount" class="bg-accent-500/20 text-accent-400 py-1 px-3 rounded-full text-xs font-bold">0</span>
                        </h2>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm text-left">
                            <thead class="text-xs text-surface-400 uppercase bg-surface-800/50">
                                <tr>
                                    <th class="px-4 py-3 rounded-tl-lg">User</th>
                                    <th class="px-4 py-3">Role</th>
                                    <th class="px-4 py-3">Status</th>
                                    <th class="px-4 py-3 rounded-tr-lg">Score</th>
                                </tr>
                            </thead>
                            <tbody id="interviewsTableBody" class="divide-y divide-surface-800 text-surface-200">
                                <tr><td colspan="4" class="px-4 py-8 text-center text-surface-500">Loading...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;

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
                    tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-8 text-center text-surface-500">No users found</td></tr>';
                }
                users.forEach(u => {
                    const roleBadge = u.is_admin 
                        ? '<span class="bg-accent-500/20 text-accent-400 py-1 px-2.5 rounded-full text-[10px] font-bold uppercase tracking-wide">Admin</span>' 
                        : '<span class="bg-surface-700 text-surface-300 py-1 px-2.5 rounded-full text-[10px] font-bold uppercase tracking-wide">User</span>';
                    tbody.innerHTML += `
                        <tr class="hover:bg-surface-800/30 transition-colors">
                            <td class="px-4 py-3 font-mono text-surface-400">#${u.id}</td>
                            <td class="px-4 py-3 font-medium text-white">${u.username}</td>
                            <td class="px-4 py-3">${u.email}</td>
                            <td class="px-4 py-3">${roleBadge}</td>
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
                    tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-8 text-center text-surface-500">No interviews found</td></tr>';
                }
                interviews.forEach(i => {
                    const statusClass = i.status === 'completed' ? 'text-success-400 bg-success-400/10' : 'text-warning-400 bg-warning-400/10';
                    const score = i.score !== null ? `<span class="font-bold text-white">${Math.round(i.score)}%</span>` : '<span class="text-surface-500">-</span>';
                    tbody.innerHTML += `
                        <tr class="hover:bg-surface-800/30 transition-colors">
                            <td class="px-4 py-3 font-medium text-white">${i.username}</td>
                            <td class="px-4 py-3">${i.job_role}</td>
                            <td class="px-4 py-3"><span class="px-2 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${statusClass}">${i.status}</span></td>
                            <td class="px-4 py-3">${score}</td>
                        </tr>`;
                });
            }
            
        } catch (err) {
            const errorBox = document.getElementById('errorBox');
            errorBox.textContent = err.message || 'Failed to load admin data';
            errorBox.classList.remove('hidden');
            document.getElementById('usersTableBody').innerHTML = '<tr><td colspan="4" class="px-4 py-8 text-center text-danger-400">Error loading data</td></tr>';
            document.getElementById('interviewsTableBody').innerHTML = '<tr><td colspan="4" class="px-4 py-8 text-center text-danger-400">Error loading data</td></tr>';
        }
    }, 100);
}
