
    const loginSection = document.getElementById('loginSection');
    const dashboardSection = document.getElementById('dashboardSection');
    let allStudents = [];

    // Authentication
    const token = localStorage.getItem('adminToken');
    if (token) showDashboard();

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        try {
            const res = await fetch('http://localhost:3000/api/login', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (data.success) {
                localStorage.setItem('adminToken', data.token);
                showDashboard();
            } else {
                document.getElementById('loginError').textContent = data.message;
                document.getElementById('loginError').classList.remove('hidden');
            }
        } catch (err) {
            document.getElementById('loginError').textContent = "Server bilan ulanishda xatolik";
            document.getElementById('loginError').classList.remove('hidden');
        }
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('adminToken');
        loginSection.classList.remove('hidden');
        dashboardSection.classList.add('hidden');
    });

    function showDashboard() {
        loginSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');
        loadStudents();
    }

    // Tabs logic
    const titles = {
        'admins': 'Adminlar',
        'teachers': "O'qituvchilar",
        'students': "O'quvchilar ro'yxati",
        'clubs': "To'garaklar",
        'groups': "Guruhlar",
        'news': "Yangilik qo'shish"
    };

    function switchTab(tabId, element) {
    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    document.querySelectorAll('.view-panel').forEach(el => el.classList.add('hidden'));
    document.getElementById(`view-${tabId}`).classList.remove('hidden');
    document.getElementById('pageTitle').textContent = titles[tabId];

    if (tabId === 'teachers') loadTeachers();
    if (tabId === 'students') loadStudents();
    if (tabId === 'admins') loadAdmins();
    if (tabId === 'clubs') { loadClubs(); loadTeachers(); }
    if (tabId === 'groups') { loadGroups(); loadClubsForSelect(); loadTeachersForGroups(); }
}
// duplicate switchTab code removed

    // Load Students
    async function loadStudents() {
        try {
            const res = await fetch('http://localhost:3000/api/students', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
            });
            const data = await res.json();
            if (data.success) {
                allStudents = data.data;
                renderStudents(allStudents);
            }
        } catch (err) { console.error(err); }
    }

    function renderStudents(data) {
        const tbody = document.getElementById('studentsTableBody');
        tbody.innerHTML = data.map(s => `
            <tr class="hover:bg-gray-800/30 transition-colors">
                <td class="px-6 py-4 text-gray-500 font-mono">#${s.id}</td>
                <td class="px-6 py-4 font-medium text-white">${s.ism} ${s.familiya}</td>
                <td class="px-6 py-4 text-gray-300 font-mono">${s.telefon}</td>
                <td class="px-6 py-4 text-gray-400">${s.oqish_joyi || '-'}</td>
                <td class="px-6 py-4"><span class="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400">${s.tanlangan_fan}</span></td>
                <td class="px-6 py-4 text-gray-300 font-mono">${s.username}</td>
            </tr>
        `).join('');
    }

    document.getElementById('searchInput').addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        renderStudents(allStudents.filter(s => s.ism.toLowerCase().includes(q) || s.familiya.toLowerCase().includes(q) || s.tanlangan_fan.toLowerCase().includes(q)));
    });

    // Load & Add Teachers
    async function loadTeachers() {
        try {
            const res = await fetch('http://localhost:3000/api/teachers', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
            });
            const data = await res.json();
            if (data.success) {
                allTeachers = data.data;
                document.getElementById('teachersTableBody').innerHTML = data.data.map(t => `
                    <tr class="hover:bg-gray-800/30 transition-colors">
                        <td class="px-6 py-4 font-medium text-white">${t.ism} ${t.familiya}</td>
                        <td class="px-6 py-4"><span class="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400">${t.fan}</span></td>
                        <td class="px-6 py-4 text-gray-300 font-mono">${t.telefon}</td>
                        <td class="px-6 py-4 text-gray-300 font-mono">${t.username}</td>
                        <td class="px-6 py-4">
                            <button onclick="editTeacher(${t.id})" class="text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg mr-2 transition-colors">Tahrirlash</button>
                            <button onclick="deleteTeacher(${t.id})" class="text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors">O'chirish</button>
                        </td>
                    </tr>
                `).join('');
                const teacherSelect = document.getElementById('c_teacher');
                if (teacherSelect) {
                    teacherSelect.innerHTML = '<option value="">O\'qituvchini tanlang</option>' + 
                        data.data.map(t => `<option value="${t.id}">${t.ism} ${t.familiya}</option>`).join('');
                }
            }
        } catch (err) { console.error(err); }
    }

    document.getElementById('teacherForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('t_id').value;
        const payload = {
            ism: document.getElementById('t_ism').value,
            familiya: document.getElementById('t_familiya').value,
            telefon: document.getElementById('t_telefon').value,
            fan: document.getElementById('t_fan').value,
            username: document.getElementById('t_username').value,
            password: document.getElementById('t_password').value
        };
        const method = id ? 'PUT' : 'POST';
        const url = id ? `http://localhost:3000/api/teachers/${id}` : 'http://localhost:3000/api/teachers';
        try {
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                document.getElementById('teacherSuccess').classList.remove('hidden');
                resetTeacherForm();
                setTimeout(() => document.getElementById('teacherSuccess').classList.add('hidden'), 3000);
                loadTeachers();
            }
        } catch (err) { console.error(err); }
    });

    function resetTeacherForm() {
        document.getElementById('teacherForm').reset();
        document.getElementById('t_id').value = '';
        document.getElementById('teacherFormTitle').textContent = "O'qituvchi qo'shish";
        document.getElementById('cancelTeacherEdit').classList.add('hidden');
    }

    document.getElementById('cancelTeacherEdit').addEventListener('click', resetTeacherForm);

    let allTeachers = [];
    async function editTeacher(id) {
        const t = allTeachers.find(x => x.id === id);
        if (!t) return;
        document.getElementById('t_id').value = t.id;
        document.getElementById('t_ism').value = t.ism;
        document.getElementById('t_familiya').value = t.familiya;
        document.getElementById('t_telefon').value = t.telefon;
        document.getElementById('t_fan').value = t.fan;
        document.getElementById('t_username').value = t.username;
        document.getElementById('t_password').value = '';
        document.getElementById('teacherFormTitle').textContent = "O'qituvchini tahrirlash";
        document.getElementById('cancelTeacherEdit').classList.remove('hidden');
        document.getElementById('teacherForm').scrollIntoView({ behavior: 'smooth' });
    }

    async function deleteTeacher(id) {
        if (!confirm("Haqiqatan ham bu o'qituvchini o'chirmoqchimisiz?")) return;
        try {
            const res = await fetch(`http://localhost:3000/api/teachers/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
            });
            const data = await res.json();
            if (data.success) {
                loadTeachers();
            } else {
                alert(data.message);
            }
        } catch (err) { console.error(err); }
    }

    // Load & Add Admins
    async function loadAdmins() {
        try {
            const res = await fetch('http://localhost:3000/api/admins', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
            });
            const data = await res.json();
            if (data.success) {
                document.getElementById('adminsTableBody').innerHTML = data.data.map(a => `
                    <tr class="hover:bg-gray-800/30 transition-colors">
                        <td class="px-6 py-4 text-gray-500 font-mono">#${a.id}</td>
                        <td class="px-6 py-4 font-medium text-white">${a.username}</td>
                        <td class="px-6 py-4 text-gray-400 font-mono">${a.password}</td>
                        <td class="px-6 py-4">
                            <button onclick="deleteAdmin(${a.id})" class="text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors">
                                O'chirish
                            </button>
                        </td>
                    </tr>
                `).join('');
            }
        } catch (err) { console.error(err); }
    }

    document.getElementById('adminForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            username: document.getElementById('a_username').value,
            password: document.getElementById('a_password').value
        };
        try {
            const res = await fetch('http://localhost:3000/api/admins', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                document.getElementById('adminSuccess').classList.remove('hidden');
                document.getElementById('adminError').classList.add('hidden');
                document.getElementById('adminForm').reset();
                setTimeout(() => document.getElementById('adminSuccess').classList.add('hidden'), 3000);
                loadAdmins();
            } else {
                document.getElementById('adminError').textContent = data.message;
                document.getElementById('adminError').classList.remove('hidden');
            }
        } catch (err) { console.error(err); }
    });

    async function deleteAdmin(id) {
        if (!confirm("Haqiqatan ham bu adminni o'chirmoqchimisiz?")) return;
        try {
            const res = await fetch(`http://localhost:3000/api/admins/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
            });
            const data = await res.json();
            if (data.success) {
                loadAdmins();
            } else {
                alert(data.message);
            }
        } catch (err) { console.error(err); }
    }

    // Load & Manage Clubs
    let allClubs = [];
    async function loadClubs() {
        try {
            const res = await fetch('http://localhost:3000/api/clubs', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
            });
            const data = await res.json();
            if (data.success) {
                allClubs = data.data;
                document.getElementById('clubsTableBody').innerHTML = data.data.map(c => `
                    <tr class="hover:bg-gray-800/30 transition-colors">
                        <td class="px-6 py-4 text-gray-500 font-mono">#${c.id}</td>
                        <td class="px-6 py-4 font-medium text-white">${c.title}</td>
                        <td class="px-6 py-4"><img src="../${c.imagePath}" alt="${c.title}" class="h-12 w-12 object-cover rounded"/></td>
                        <td class="px-6 py-4">
                            <button onclick="editClub(${c.id})" class="text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg mr-2 transition-colors">Tahrirlash</button>
                            <button onclick="deleteClub(${c.id})" class="text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors">O'chirish</button>
                        </td>
                    </tr>`).join('');
            }
        } catch (err) { console.error(err); }
    }

    document.getElementById('clubForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('clubId').value;
        const formData = new FormData();
        formData.append('title', document.getElementById('c_title').value);
        formData.append('teacher_id', document.getElementById('c_teacher').value);
        const selectedTeacher = document.getElementById('c_teacher').options[document.getElementById('c_teacher').selectedIndex].text;
        formData.append('teacher_name', selectedTeacher !== "O'qituvchini tanlang" ? selectedTeacher : "");
        formData.append('paragraph', document.getElementById('c_paragraph').value);
        formData.append('description', document.getElementById('c_description').value);
        const imageFile = document.getElementById('c_image').files[0];
        if (imageFile) formData.append('image', imageFile);
        const url = id ? `http://localhost:3000/api/clubs/${id}` : 'http://localhost:3000/api/clubs';
        const method = id ? 'PUT' : 'POST';
        try {
            const res = await fetch(url, {
                method,
                headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` },
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                document.getElementById(id ? 'clubSuccess' : 'clubSuccess').textContent = data.message;
                document.getElementById('clubSuccess').classList.remove('hidden');
                document.getElementById('clubError').classList.add('hidden');
                document.getElementById('clubForm').reset();
                document.getElementById('clubId').value = '';
                document.getElementById('clubFormTitle').textContent = "Yangi To'garak qo'shish";
                setTimeout(() => document.getElementById('clubSuccess').classList.add('hidden'), 3000);
                loadClubs();
            } else {
                document.getElementById('clubError').textContent = data.message;
                document.getElementById('clubError').classList.remove('hidden');
            }
        } catch (err) { console.error(err); }
    });

    function editClub(id) {
        const club = allClubs.find(c => c.id === id);
        if (!club) return;
        document.getElementById('clubId').value = club.id;
        document.getElementById('c_title').value = club.title;
        if (club.teacher_id) document.getElementById('c_teacher').value = club.teacher_id;
        document.getElementById('c_paragraph').value = club.paragraph || '';
        document.getElementById('c_description').value = club.description || '';
        document.getElementById('clubFormTitle').textContent = "To'garakni tahrirlash";
        document.getElementById('clubForm').scrollIntoView({ behavior: 'smooth' });
    }

    async function deleteClub(id) {
        if (!confirm("Haqiqatan ham bu to'garakni o'chirmoqchimisiz?")) return;
        try {
            const res = await fetch(`http://localhost:3000/api/clubs/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
            });
            const data = await res.json();
            if (data.success) {
                loadClubs();
            } else {
                alert(data.message);
            }
        } catch (err) { console.error(err); }
    }

    // Load & Manage Groups
    async function loadGroups() {
        try {
            const res = await fetch('http://localhost:3000/api/groups', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
            });
            const data = await res.json();
            if (data.success) {
                document.getElementById('groupsTableBody').innerHTML = data.data.map(g => `
                    <tr class="hover:bg-gray-800/30 transition-colors">
                        <td class="px-6 py-4 font-medium text-white">${g.nomi}</td>
                        <td class="px-6 py-4 text-blue-400">${g.club_name}</td>
                        <td class="px-6 py-4">${g.teacher_name}</td>
                        <td class="px-6 py-4 text-gray-400 font-mono">${g.schedule}</td>
                        <td class="px-6 py-4"><button onclick="viewGroupStudents(${g.id})" class="text-xs font-medium text-purple-400 bg-purple-500/10 px-3 py-1.5 rounded-lg hover:bg-purple-500/20">O'quvchi qo'shish</button></td>
                        <td class="px-6 py-4">
                            <button onclick="deleteGroup(${g.id})" class="text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors">O'chirish</button>
                        </td>
                    </tr>`).join('');
            }
        } catch (err) { console.error(err); }
    }

    async function loadClubsForSelect() {
        try {
            const res = await fetch('http://localhost:3000/api/clubs');
            const data = await res.json();
            if (data.success) {
                document.getElementById('g_club').innerHTML = `<option value="">To'garakni tanlang</option>` + 
                    data.data.map(c => `<option value="${c.id}">${c.title}</option>`).join('');
            }
        } catch (err) { console.error(err); }
    }

    async function loadTeachersForGroups() {
        try {
            const res = await fetch('http://localhost:3000/api/teachers', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
            });
            const data = await res.json();
            if (data.success) {
                document.getElementById('g_teacher').innerHTML = `<option value="">O'qituvchini tanlang</option>` + 
                    data.data.map(t => `<option value="${t.id}">${t.ism} ${t.familiya}</option>`).join('');
            }
        } catch (err) { console.error(err); }
    }

    document.getElementById('groupForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            nomi: document.getElementById('g_nomi').value,
            club_id: document.getElementById('g_club').value,
            teacher_id: document.getElementById('g_teacher').value,
            schedule: document.getElementById('g_schedule').value
        };
        try {
            const res = await fetch('http://localhost:3000/api/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                document.getElementById('groupSuccess').classList.remove('hidden');
                document.getElementById('groupForm').reset();
                setTimeout(() => document.getElementById('groupSuccess').classList.add('hidden'), 3000);
                loadGroups();
            }
        } catch (err) { console.error(err); }
    });

    async function deleteGroup(id) {
        if (!confirm("Haqiqatan ham bu guruhni o'chirmoqchimisiz?")) return;
        try {
            const res = await fetch(`http://localhost:3000/api/groups/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
            });
            const data = await res.json();
            if (data.success) loadGroups();
        } catch (err) { console.error(err); }
    }

    async function viewGroupStudents(id) {
        const studentId = prompt("Guruhga qo'shish uchun O'quvchi ID sini kiriting:");
        if (!studentId) return;
        try {
            const res = await fetch(`http://localhost:3000/api/groups/${id}/students`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` },
                body: JSON.stringify({ student_id: studentId })
            });
            const data = await res.json();
            if (data.success) alert("O'quvchi guruhga muvaffaqiyatli biriktirildi!");
            else alert("Xatolik yuz berdi");
        } catch (err) { console.error(err); }
    }

