const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('Data/tugarak.db');
const oldClubs = new sqlite3.Database('Data/clubs.db');
const oldTeachers = new sqlite3.Database('Data/teachers.db');
const oldStudents = new sqlite3.Database('Data/students.db');

async function migrate() {
    const hash = await bcrypt.hash('12345', 10);
    
    // Migrate Clubs
    oldClubs.all("SELECT * FROM clubs", (err, rows) => {
        if(rows) {
            rows.forEach(r => {
                db.run("INSERT OR IGNORE INTO clubs (id, title, paragraph, description, imagePath, created_at) VALUES (?, ?, ?, ?, ?, ?)", 
                    [r.id, r.title, r.paragraph, r.description, r.imagePath, r.created_at || new Date().toISOString()]);
            });
            console.log("Migrated clubs:", rows.length);
        }
    });

    // Migrate Teachers
    oldTeachers.all("SELECT * FROM teachers", (err, rows) => {
        if(rows) {
            rows.forEach(r => {
                const username = r.telefon || `teacher_${r.id}`;
                db.run("INSERT OR IGNORE INTO users (id, role, username, password, ism, familiya, telefon, info) VALUES (?, 'teacher', ?, ?, ?, ?, ?, ?)", 
                    [r.id + 100, username, hash, r.ism, r.familiya, r.telefon, r.fan]);
            });
            console.log("Migrated teachers:", rows.length);
        }
    });

    // Migrate Students
    oldStudents.all("SELECT * FROM students", (err, rows) => {
        if(rows) {
            rows.forEach(r => {
                const username = r.login || r.telefon || `student_${r.id}`;
                db.run("INSERT OR IGNORE INTO users (id, role, username, password, ism, familiya, telefon, info) VALUES (?, 'student', ?, ?, ?, ?, ?, ?)", 
                    [r.id + 1000, username, hash, r.ism, r.familiya, r.telefon, r.oqish_joyi + " " + r.tanlangan_fan]);
            });
            console.log("Migrated students:", rows.length);
        }
    });
}
migrate();
