const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'weac.db');
const db = new sqlite3.Database(dbPath);

const initDatabase = () => {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS candidates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        candidate_number TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        email TEXT,
        status TEXT DEFAULT 'active'
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS certificates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        candidate_number TEXT NOT NULL,
        certificate_number TEXT UNIQUE NOT NULL,
        exam_type TEXT NOT NULL,
        exam_year INTEGER NOT NULL,
        status TEXT DEFAULT 'issued',
        verification_hash TEXT NOT NULL DEFAULT ''
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        candidate_number TEXT NOT NULL,
        subject TEXT NOT NULL,
        grade TEXT NOT NULL,
        exam_year INTEGER NOT NULL
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS verification_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        candidate_number TEXT NOT NULL,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL,
        pin TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    migrateVerificationRequestsTable();

    db.all('PRAGMA table_info(certificates)', (err, columns) => {
      if (err) {
        return;
      }

      const hasHashColumn = columns.some((column) => column.name === 'verification_hash');

      if (!hasHashColumn) {
        db.run('ALTER TABLE certificates ADD COLUMN verification_hash TEXT NOT NULL DEFAULT ""', () => {
          insertSeedData();
        });
        return;
      }

      insertSeedData();
    });
  });
};

function migrateVerificationRequestsTable() {
  db.get(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'verification_requests'",
    (err, row) => {
      if (err || !row || !row.sql) {
        return;
      }

      const tableSql = String(row.sql || '');

      if (!tableSql.includes('UNIQUE')) {
        return;
      }

      db.serialize(() => {
        db.run('ALTER TABLE verification_requests RENAME TO verification_requests_old');
        db.run(`
          CREATE TABLE verification_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            candidate_number TEXT NOT NULL,
            full_name TEXT NOT NULL,
            email TEXT NOT NULL,
            pin TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `);
        db.run(`
          INSERT INTO verification_requests (candidate_number, full_name, email, pin, created_at)
          SELECT candidate_number, full_name, email, pin, created_at
          FROM verification_requests_old
        `);
        db.run('DROP TABLE verification_requests_old');
      });
    }
  );
}

function insertSeedData() {
  db.run(
    `INSERT OR IGNORE INTO candidates (candidate_number, password, full_name, email, status) VALUES (?, ?, ?, ?, ?)`,
    ['4256789012', 'WAEC@2024', 'Badejo Emmanuel', 'badejo.emmanuel@waec.org', 'active']
  );

  db.run(
    `INSERT OR IGNORE INTO candidates (candidate_number, password, full_name, email, status) VALUES (?, ?, ?, ?, ?)`,
    ['4256789013', 'WAEC@2025', 'Akinola David', 'akinola.david@waec.org', 'active']
  );

  db.run(
    `INSERT OR IGNORE INTO certificates (candidate_number, certificate_number, exam_type, exam_year, status, verification_hash) VALUES (?, ?, ?, ?, ?, ?)`,
    ['4256789012', 'WAEC/2023/00045678', 'WASSCE', 2023, 'issued', 'waec-4256789012-2023-wassce-authentic']
  );

  db.run(
    `INSERT OR IGNORE INTO certificates (candidate_number, certificate_number, exam_type, exam_year, status, verification_hash) VALUES (?, ?, ?, ?, ?, ?)`,
    ['4256789013', 'WAEC/2024/00067891', 'WASSCE', 2024, 'issued', 'waec-4256789013-2024-wassce-authentic']
  );

  const results = [
    ['4256789012', 'English Language', 'A1', 2023],
    ['4256789012', 'Mathematics', 'B2', 2023],
    ['4256789012', 'Biology', 'A1', 2023],
    ['4256789012', 'Chemistry', 'B3', 2023],
    ['4256789012', 'Economics', 'A2', 2023],
    ['4256789013', 'English Language', 'B2', 2024],
    ['4256789013', 'Mathematics', 'A1', 2024],
    ['4256789013', 'Biology', 'A2', 2024],
    ['4256789013', 'Economics', 'B3', 2024],
    ['4256789013', 'Chemistry', 'A1', 2024]
  ];

  const resultStmt = db.prepare(
    `INSERT OR IGNORE INTO results (candidate_number, subject, grade, exam_year) VALUES (?, ?, ?, ?)`
  );

  results.forEach(([candidateNumber, subject, grade, examYear]) => {
    resultStmt.run(candidateNumber, subject, grade, examYear);
  });

  resultStmt.finalize();
}

module.exports = { db, initDatabase };
