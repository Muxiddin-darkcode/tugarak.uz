require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/Img', express.static(path.join(__dirname, '..', 'Img')));
app.use('/Uploads', express.static(path.join(__dirname, '..', 'Uploads')));
app.use(express.static(path.join(__dirname, '..')));

// Multer setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let dir = path.join(__dirname, '..', 'Img');
        if (req.route.path.includes('assignments') || req.route.path.includes('submissions')) {
            dir = path.join(__dirname, '..', 'Uploads');
        }
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// Database Setup
const dataDir = path.join(__dirname, '..', 'Data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'tugarak.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('DB error', err);
    else {
        console.log('Connected to tugarak.db');
        db.serialize(() => {
            // Users
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                role TEXT NOT NULL,
                username TEXT UNIQUE,
                password TEXT NOT NULL,
                ism TEXT, familiya TEXT, telefon TEXT, info TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);
            
            // Clubs
            db.run(`CREATE TABLE IF NOT EXISTS clubs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL, paragraph TEXT, description TEXT,
                imagePath TEXT NOT NULL, teacher_id INTEGER, teacher_name TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Groups
            db.run(`CREATE TABLE IF NOT EXISTS groups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nomi TEXT NOT NULL, club_id INTEGER, teacher_id INTEGER, schedule TEXT
            )`);

            // Group Students
            db.run(`CREATE TABLE IF NOT EXISTS group_students (
                group_id INTEGER, student_id INTEGER, PRIMARY KEY(group_id, student_id)
            )`);

            // Lessons
            db.run(`CREATE TABLE IF NOT EXISTS lessons (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                group_id INTEGER, title TEXT NOT NULL, video_url TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Assignments
            db.run(`CREATE TABLE IF NOT EXISTS assignments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lesson_id INTEGER, title TEXT NOT NULL, description TEXT,
                file_url TEXT, deadline DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Submissions
            db.run(`CREATE TABLE IF NOT EXISTS submissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                assignment_id INTEGER, student_id INTEGER,
                file_url TEXT NOT NULL, grade INTEGER, comment TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Default Admin
            db.get("SELECT * FROM users WHERE role = 'admin' AND username = 'admin'", async (err, row) => {
                if (!row) {
                    const hash = await bcrypt.hash('admin123', 10);
                    db.run("INSERT INTO users (role, username, password) VALUES ('admin', 'admin', ?)", [hash]);
                }
            });
        });
    }
});

const teachersDbPath = path.join(dataDir, 'teachers.db');
const teachersDb = new sqlite3.Database(teachersDbPath, (err) => {
    if (err) console.error('Teachers DB error', err);
    else console.log('Connected to teachers.db');
});

// Auth Middleware
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ success: false, message: "Token yo'q" });
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ success: false, message: "Yaroqsiz token" });
        req.user = user;
        next();
    });
};
const adminMiddleware = (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: "Faqat admin uchun" });
    next();
};
const teacherMiddleware = (req, res, next) => {
    if (req.user.role !== 'teacher') return res.status(403).json({ success: false, message: "Faqat o'qituvchi uchun" });
    next();
};
const studentMiddleware = (req, res, next) => {
    if (req.user.role !== 'student') return res.status(403).json({ success: false, message: "Faqat o'quvchi uchun" });
    next();
};

// --- AUTH API ---
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
        if (user) {
            const valid = await bcrypt.compare(password, user.password);
            if (!valid && password !== user.password) return res.status(401).json({ success: false, message: "Login/parol xato" });
            const token = jwt.sign({ id: user.id, role: user.role, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
            return res.json({ success: true, token, role: user.role, id: user.id });
        }
        
        teachersDb.get("SELECT * FROM teachers WHERE username = ?", [username], async (err, teacher) => {
            if (err || !teacher) return res.status(401).json({ success: false, message: "Login/parol xato" });
            let valid = false;
            try { valid = await bcrypt.compare(password, teacher.password); } catch(e){}
            if (!valid && password !== teacher.password) return res.status(401).json({ success: false, message: "Login/parol xato" });
            const token = jwt.sign({ id: teacher.id, role: 'teacher', username: teacher.username }, JWT_SECRET, { expiresIn: '24h' });
            res.json({ success: true, token, role: 'teacher', id: teacher.id });
        });
    });
});

app.post('/api/register', async (req, res) => {
    const { ism, familiya, telefon, fan, username, password } = req.body;
    if (!username || !password) return res.status(400).json({ success: false });
    db.get("SELECT * FROM users WHERE username = ?", [username], async (err, row) => {
        if (row) return res.status(400).json({ success: false, message: "Login band!" });
        const hash = await bcrypt.hash(password, 10);
        db.run("INSERT INTO users (role, username, password, ism, familiya, telefon, info) VALUES ('student', ?, ?, ?, ?, ?, ?)",
            [username, hash, ism, familiya, telefon, fan], function(err) {
                res.json({ success: true, message: "Muvaffaqiyatli ro'yxatdan o'tdingiz!" });
            });
    });
});
// --- ADMIN API (Users & Clubs) ---
app.get('/api/admins', authMiddleware, adminMiddleware, (req, res) => {
    db.all("SELECT id, username FROM users WHERE role = 'admin'", [], (err, rows) => res.json({ success: true, data: rows }));
});
app.get('/api/teachers', authMiddleware, (req, res) => {
    teachersDb.all("SELECT id, ism, familiya, telefon, fan, username FROM teachers", [], (err, rows) => res.json({ success: true, data: rows }));
});

// --- ADMIN CRUD (Create & Delete) ---
app.post('/api/admins', authMiddleware, adminMiddleware, async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, message: 'Username and password required' });
    const hash = await bcrypt.hash(password, 10);
    db.run("INSERT INTO users (role, username, password) VALUES ('admin', ?, ?)",
        [username, hash], function(err) {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.json({ success: true });
        });
});

app.delete('/api/admins/:id', authMiddleware, adminMiddleware, (req, res) => {
    db.run("DELETE FROM users WHERE id=? AND role='admin'", [req.params.id], function(err) {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true });
    });
});

app.post('/api/teachers', authMiddleware, adminMiddleware, async (req, res) => {
    const { ism, familiya, telefon, fan, username, password } = req.body;
    const login = username || telefon || `t_${Date.now()}`;
    const pass = password || 'teacher123';
    teachersDb.run("INSERT INTO teachers (ism, familiya, telefon, fan, username, password) VALUES (?, ?, ?, ?, ?, ?)",
        [ism, familiya, telefon, fan, login, pass], function(err) { 
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.json({ success: true }); 
        });
});
app.put('/api/teachers/:id', authMiddleware, adminMiddleware, async (req, res) => {
    const { ism, familiya, telefon, fan, username, password } = req.body;
    let query = "UPDATE teachers SET ism=?, familiya=?, telefon=?, fan=?, username=? WHERE id=?";
    let params = [ism, familiya, telefon, fan, username, req.params.id];
    if (password) {
        query = "UPDATE teachers SET ism=?, familiya=?, telefon=?, fan=?, username=?, password=? WHERE id=?";
        params = [ism, familiya, telefon, fan, username, password, req.params.id];
    }
    
    teachersDb.run(query, params, function(err) { 
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (this.changes === 0) return res.status(404).json({ success: false, message: "O'qituvchi topilmadi" });
        
        const full_name = `${ism} ${familiya}`;
        db.run("UPDATE clubs SET teacher_name=? WHERE teacher_id=?", [full_name, req.params.id]);
        
        res.json({ success: true }); 
    });
});
app.delete('/api/teachers/:id', authMiddleware, adminMiddleware, (req, res) => {
    teachersDb.run("DELETE FROM teachers WHERE id=?", [req.params.id], function(err) { 
        if (err) return res.status(500).json({ success: false, message: err.message });
        
        db.run("UPDATE clubs SET teacher_id=NULL, teacher_name=NULL WHERE teacher_id=?", [req.params.id]);
        res.json({ success: true }); 
    });
});
app.get('/api/students', authMiddleware, adminMiddleware, (req, res) => {
    db.all("SELECT id, ism, familiya, telefon, info as tanlangan_fan, username FROM users WHERE role = 'student'", [], (err, rows) => res.json({ success: true, data: rows }));
});
app.put('/api/students/:id', authMiddleware, adminMiddleware, async (req, res) => {
    const { ism, familiya, telefon, tanlangan_fan, username, password } = req.body;
    let query = "UPDATE users SET ism=?, familiya=?, telefon=?, info=?, username=? WHERE id=? AND role='student'";
    let params = [ism, familiya, telefon, tanlangan_fan, username, req.params.id];
    if (password) {
        const hash = await bcrypt.hash(password, 10);
        query = "UPDATE users SET ism=?, familiya=?, telefon=?, info=?, username=?, password=? WHERE id=? AND role='student'";
        params = [ism, familiya, telefon, tanlangan_fan, username, hash, req.params.id];
    }
    db.run(query, params, function(err) {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true });
    });
});
app.delete('/api/students/:id', authMiddleware, adminMiddleware, (req, res) => {
    db.run("DELETE FROM users WHERE id=? AND role='student'", [req.params.id], function(err) {
        if (err) return res.status(500).json({ success: false, message: err.message });
        db.run("DELETE FROM group_students WHERE student_id=?", [req.params.id]);
        db.run("DELETE FROM submissions WHERE student_id=?", [req.params.id]);
        res.json({ success: true });
    });
});

app.get('/api/clubs', (req, res) => {
    db.all("SELECT * FROM clubs ORDER BY created_at DESC", [], (err, rows) => res.json({ success: true, data: rows }));
});
app.post('/api/clubs', authMiddleware, adminMiddleware, upload.single('image'), (req, res) => {
    const { title, paragraph, description, teacher_id, teacher_name } = req.body;
    db.run(`INSERT INTO clubs (title, paragraph, description, imagePath, teacher_id, teacher_name) VALUES (?, ?, ?, ?, ?, ?)`,
        [title, paragraph, description, path.join('Img', req.file.filename), teacher_id, teacher_name], function(err) {
            res.json({ success: true });
        });
});

// --- GROUPS API ---
app.get('/api/groups', authMiddleware, adminMiddleware, (req, res) => {
    db.all(`SELECT g.*, c.title as club_name, t.ism || ' ' || t.familiya as teacher_name 
            FROM groups g 
            LEFT JOIN clubs c ON g.club_id = c.id 
            LEFT JOIN users t ON g.teacher_id = t.id`, [], (err, rows) => {
        res.json({ success: true, data: rows });
    });
});
app.post('/api/groups', authMiddleware, adminMiddleware, (req, res) => {
    const { nomi, club_id, teacher_id, schedule } = req.body;
    db.run("INSERT INTO groups (nomi, club_id, teacher_id, schedule) VALUES (?, ?, ?, ?)",
        [nomi, club_id, teacher_id, schedule], function(err) { res.json({ success: true }); });
});
app.delete('/api/groups/:id', authMiddleware, adminMiddleware, (req, res) => {
    db.run("DELETE FROM groups WHERE id = ?", [req.params.id], () => { res.json({ success: true }); });
});

app.get('/api/groups/:id/students', authMiddleware, (req, res) => {
    db.all(`SELECT u.id, u.ism, u.familiya FROM group_students gs JOIN users u ON gs.student_id = u.id WHERE gs.group_id = ?`, 
        [req.params.id], (err, rows) => res.json({ success: true, data: rows }));
});
app.post('/api/groups/:id/students', authMiddleware, adminMiddleware, (req, res) => {
    const { student_id } = req.body;
    db.run("INSERT OR IGNORE INTO group_students (group_id, student_id) VALUES (?, ?)", [req.params.id, student_id], function(err) {
        res.json({ success: true });
    });
});

// --- TEACHER API ---
app.get('/api/teacher/groups', authMiddleware, teacherMiddleware, (req, res) => {
    db.all(`SELECT g.*, c.title as club_name FROM groups g LEFT JOIN clubs c ON g.club_id = c.id WHERE g.teacher_id = ?`, 
        [req.user.id], (err, rows) => res.json({ success: true, data: rows }));
});
app.post('/api/teacher/lessons', authMiddleware, teacherMiddleware, (req, res) => {
    const { group_id, title, video_url } = req.body;
    db.run("INSERT INTO lessons (group_id, title, video_url) VALUES (?, ?, ?)", [group_id, title, video_url], function(err) {
        res.json({ success: true });
    });
});
app.post('/api/teacher/assignments', authMiddleware, teacherMiddleware, upload.single('file'), (req, res) => {
    const { lesson_id, title, description, deadline } = req.body;
    const file_url = req.file ? path.join('Uploads', req.file.filename) : null;
    db.run("INSERT INTO assignments (lesson_id, title, description, file_url, deadline) VALUES (?, ?, ?, ?, ?)",
        [lesson_id, title, description, file_url, deadline], function(err) { res.json({ success: true }); });
});
app.post('/api/teacher/submissions/:id/grade', authMiddleware, teacherMiddleware, (req, res) => {
    const { grade, comment } = req.body;
    db.run("UPDATE submissions SET grade=?, comment=? WHERE id=?", [grade, comment, req.params.id], function(err) {
        res.json({ success: true });
    });
});

// --- STUDENT API ---
app.get('/api/student/groups', authMiddleware, studentMiddleware, (req, res) => {
    db.all(`SELECT g.*, c.title as club_name, t.ism || ' ' || t.familiya as teacher_name 
            FROM groups g 
            JOIN group_students gs ON g.id = gs.group_id 
            LEFT JOIN clubs c ON g.club_id = c.id
            LEFT JOIN users t ON g.teacher_id = t.id
            WHERE gs.student_id = ?`, [req.user.id], (err, rows) => res.json({ success: true, data: rows }));
});
app.post('/api/student/submissions', authMiddleware, studentMiddleware, upload.single('file'), (req, res) => {
    const { assignment_id } = req.body;
    if (!req.file) return res.status(400).json({ success: false, message: "Fayl majburiy" });
    const file_url = path.join('Uploads', req.file.filename);
    db.run("INSERT INTO submissions (assignment_id, student_id, file_url) VALUES (?, ?, ?)",
        [assignment_id, req.user.id, file_url], function(err) { res.json({ success: true }); });
});

// --- COMMON API (Lessons & Assignments) ---
app.get('/api/groups/:id/lessons', authMiddleware, (req, res) => {
    db.all("SELECT * FROM lessons WHERE group_id = ? ORDER BY created_at DESC", [req.params.id], (err, rows) => res.json({ success: true, data: rows }));
});
app.get('/api/lessons/:id/assignments', authMiddleware, (req, res) => {
    db.all("SELECT * FROM assignments WHERE lesson_id = ? ORDER BY created_at DESC", [req.params.id], (err, rows) => res.json({ success: true, data: rows }));
});
app.get('/api/assignments/:id/submissions', authMiddleware, (req, res) => {
    db.all(`SELECT s.*, u.ism, u.familiya FROM submissions s 
            JOIN users u ON s.student_id = u.id WHERE s.assignment_id = ?`, 
        [req.params.id], (err, rows) => res.json({ success: true, data: rows }));
});

// --- PUBLIC STATS API ---
app.get('/api/stats', (req, res) => {
    db.get("SELECT COUNT(*) as clubsCount FROM clubs", (err, clubRow) => {
        if (err) return res.status(500).json({ success: false });
        db.get("SELECT COUNT(*) as studentsCount FROM users WHERE role = 'student'", (err, studentRow) => {
            if (err) return res.status(500).json({ success: false });
            res.json({
                success: true,
                data: {
                    clubs: clubRow.clubsCount,
                    students: studentRow.studentsCount
                }
            });
        });
    });
});

// Removed regenerateClubsHTML as requested
app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
