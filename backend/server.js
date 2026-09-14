const express = require('express');
const cors = require('cors');
const { db, initDatabase } = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

const normalizeToken = (value) => String(value || '').trim().replace(/\s+/g, '').toUpperCase();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'WAEC backend is running' });
});

app.post('/api/verification-request', (req, res) => {
  const { candidateNumber, fullName, email, pin } = req.body || {};

  if (!candidateNumber || !fullName || !email || !pin) {
    return res.status(400).json({
      success: false,
      message: 'Candidate number, student name, email, and verification PIN are required.'
    });
  }

  const normalizedCandidate = normalizeToken(candidateNumber);
  const normalizedPin = String(pin || '').trim();
  const normalizedFullName = String(fullName || '').trim();
  const normalizedEmail = String(email || '').trim();

  db.get(
    'SELECT candidate_number FROM candidates WHERE candidate_number = ?',
    [normalizedCandidate],
    (err, row) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Unable to verify candidate registration.'
        });
      }

      if (!row) {
        return res.status(404).json({
          success: false,
          message: 'This candidate number is not registered or uploaded to the portal database yet.'
        });
      }

      db.run(
        `INSERT INTO verification_requests (candidate_number, full_name, email, pin)
         VALUES (?, ?, ?, ?)`,
        [normalizedCandidate, normalizedFullName, normalizedEmail, normalizedPin],
        function (runErr) {
          if (runErr) {
            return res.status(500).json({
              success: false,
              message: 'Unable to save the verification request.'
            });
          }

          return res.json({
            success: true,
            message: 'Verification PIN is active. The candidate may now sign in with their Candidate Number and PIN.',
            request: {
              candidateNumber: normalizedCandidate,
              fullName: normalizedFullName,
              email: normalizedEmail,
              pin: normalizedPin
            }
          });
        }
      );
    }
  );
});

app.post('/api/login', (req, res) => {
  const { candidateNumber, pin } = req.body || {};

  if (!candidateNumber || !pin) {
    return res.status(400).json({
      success: false,
      message: 'Candidate number and verification PIN are required.'
    });
  }

  const normalizedCandidate = normalizeToken(candidateNumber);
  const normalizedPin = String(pin || '').trim();

  db.get(
    'SELECT candidate_number, full_name, email FROM verification_requests WHERE candidate_number = ? AND pin = ?',
    [normalizedCandidate, normalizedPin],
    (err, row) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error.' });
      }

      if (!row) {
        return res.status(401).json({
          success: false,
          message: 'Invalid candidate number or verification PIN.'
        });
      }

      return res.json({
        success: true,
        message: 'Login successful.',
        candidate: {
          candidateNumber: row.candidate_number,
          fullName: row.full_name,
          email: row.email
        }
      });
    }
  );
});

app.post('/api/verify-certificate', (req, res) => {
  const { candidateNumber, certificateNumber, examYear, results } = req.body || {};

  if (!candidateNumber || !certificateNumber || !examYear) {
    return res.status(400).json({
      success: false,
      status: 'invalid',
      message: 'Candidate number, certificate number and exam year are required.'
    });
  }

  const normalizedCandidate = normalizeToken(candidateNumber);
  const normalizedCertificate = normalizeToken(certificateNumber);
  const normalizedYear = Number(examYear);

  if (!normalizedYear || Number.isNaN(normalizedYear)) {
    return res.status(400).json({
      success: false,
      status: 'invalid',
      message: 'Exam year must be a valid number.'
    });
  }

  db.get(
    `SELECT c.candidate_number, c.full_name, cert.certificate_number, cert.exam_type, cert.exam_year, cert.status, cert.verification_hash
     FROM candidates c
     INNER JOIN certificates cert ON cert.candidate_number = c.candidate_number
     WHERE c.candidate_number = ? AND cert.certificate_number = ? AND cert.exam_year = ?`,
    [normalizedCandidate, normalizedCertificate, normalizedYear],
    (err, row) => {
      if (err) {
        return res.status(500).json({ success: false, status: 'error', message: 'Database error.' });
      }

      if (!row) {
        return res.status(404).json({
          success: false,
          status: 'fake',
          message: 'Certificate not found. The record does not match any authentic WAEC entry.'
        });
      }

      if (row.status !== 'issued') {
        return res.json({
          success: false,
          status: 'tampered',
          message: 'This certificate record appears to be altered or revoked.',
          candidate: {
            candidateNumber: row.candidate_number,
            fullName: row.full_name
          },
          certificate: {
            certificateNumber: row.certificate_number,
            examType: row.exam_type,
            examYear: row.exam_year,
            hash: row.verification_hash
          }
        });
      }

      const fetchStoredResults = () => new Promise((resolve, reject) => {
        db.all(
          'SELECT subject, grade FROM results WHERE candidate_number = ? AND exam_year = ? ORDER BY id ASC',
          [normalizedCandidate, normalizedYear],
          (err2, storedRows) => {
            if (err2) return reject(err2);
            resolve((storedRows || []).map((item) => ({
              subject: String(item.subject || '').trim(),
              grade: String(item.grade || '').trim().toUpperCase()
            }))); 
          }
        );
      });

      const normalizedEnteredResults = Array.isArray(results)
        ? results
            .map((item) => ({
              subject: String(item?.subject || '').trim(),
              grade: String(item?.grade || '').trim().toUpperCase()
            }))
            .filter((item) => item.subject && item.grade)
        : [];

      if (normalizedEnteredResults.length > 0) {
        fetchStoredResults()
          .then((storedResults) => {
            const storedMap = new Map(
              (storedResults || []).map((item) => [String(item.subject || '').trim().toUpperCase(), String(item.grade || '').trim().toUpperCase()])
            );

            const mismatches = normalizedEnteredResults.filter((entry) => {
              const storedGrade = storedMap.get(String(entry.subject).trim().toUpperCase());
              return !storedGrade || storedGrade !== entry.grade;
            });

            if (mismatches.length > 0) {
              return res.json({
                success: false,
                status: 'tampered',
                message: 'The entered result details do not match the official WAEC results stored in the database.',
                candidate: {
                  candidateNumber: row.candidate_number,
                  fullName: row.full_name
                },
                certificate: {
                  certificateNumber: row.certificate_number,
                  examType: row.exam_type,
                  examYear: row.exam_year,
                  hash: row.verification_hash
                },
                mismatchCount: mismatches.length,
                results: storedResults
              });
            }

            return res.json({
              success: true,
              status: 'authentic',
              message: 'Certificate verified successfully. The certificate and submitted result details match the authentic WAEC database.',
              candidate: {
                candidateNumber: row.candidate_number,
                fullName: row.full_name
              },
              certificate: {
                certificateNumber: row.certificate_number,
                examType: row.exam_type,
                examYear: row.exam_year,
                hash: row.verification_hash
              },
              verifiedSubjects: normalizedEnteredResults.length,
              results: storedResults
            });
          })
          .catch(() => {
            return res.status(500).json({ success: false, status: 'error', message: 'Database error while checking result details.' });
          });
        return;
      }

      fetchStoredResults()
        .then((storedResults) => {
          return res.json({
            success: true,
            status: 'authentic',
            message: 'Certificate verified successfully. The record matches the authentic WAEC database.',
            candidate: {
              candidateNumber: row.candidate_number,
              fullName: row.full_name
            },
            certificate: {
              certificateNumber: row.certificate_number,
              examType: row.exam_type,
              examYear: row.exam_year,
              hash: row.verification_hash
            },
            results: storedResults
          });
        })
        .catch(() => {
          return res.status(500).json({ success: false, status: 'error', message: 'Database error while fetching certificate results.' });
        });
    }
  );
});

app.get('/api/admin/summary', (req, res) => {
  const currentYear = new Date().getFullYear();

  db.get('SELECT COUNT(*) AS totalCandidates FROM candidates', (err, candidateRow) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Database error.' });
    }

    db.get('SELECT COUNT(*) AS totalCertificates FROM certificates', (err2, certificateRow) => {
      if (err2) {
        return res.status(500).json({ success: false, message: 'Database error.' });
      }

      db.get('SELECT COUNT(*) AS totalResults FROM results', (err3, resultRow) => {
        if (err3) {
          return res.status(500).json({ success: false, message: 'Database error.' });
        }

        db.get('SELECT COUNT(*) AS newUploads FROM results WHERE exam_year = ?', [currentYear], (err4, uploadRow) => {
          if (err4) {
            return res.status(500).json({ success: false, message: 'Database error.' });
          }

          const totalCertificates = Number(certificateRow?.totalCertificates || 0);
          const authenticityRate = totalCertificates > 0 ? ((totalCertificates / totalCertificates) * 100).toFixed(1) : '0.0';

          return res.json({
            success: true,
            summary: {
              totalCandidates: Number(candidateRow?.totalCandidates || 0),
              totalCertificates,
              totalResults: Number(resultRow?.totalResults || 0),
              newUploads: Number(uploadRow?.newUploads || 0),
              authenticityRate: Number(authenticityRate)
            }
          });
        });
      });
    });
  });
});

app.get('/api/admin/records', (req, res) => {
  const query = `
    SELECT
      c.candidate_number AS candidateNumber,
      c.full_name AS fullName,
      cert.certificate_number AS certificateNumber,
      cert.exam_type AS examType,
      cert.exam_year AS examYear,
      (
        SELECT COUNT(*)
        FROM results r
        WHERE r.candidate_number = c.candidate_number
          AND r.exam_year = cert.exam_year
      ) AS subjectCount,
      (
        SELECT r.subject
        FROM results r
        WHERE r.candidate_number = c.candidate_number
          AND r.exam_year = cert.exam_year
        ORDER BY r.id DESC
        LIMIT 1
      ) AS latestSubject
    FROM candidates c
    INNER JOIN certificates cert ON cert.candidate_number = c.candidate_number
    ORDER BY cert.id DESC, c.id DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Database error.' });
    }

    const safeRows = (rows || []).map((row) => ({
      candidateNumber: row.candidateNumber,
      fullName: row.fullName,
      certificateNumber: row.certificateNumber || 'N/A',
      examType: row.examType || 'WASSCE',
      examYear: row.examYear || new Date().getFullYear(),
      subjectCount: Number(row.subjectCount || 0),
      latestSubject: row.latestSubject || '—'
    }));

    return res.json({ success: true, records: safeRows });
  });
});

app.post('/api/admin/delete-record', (req, res) => {
  const { candidateNumber, certificateNumber, examYear } = req.body || {};

  if (!candidateNumber || !certificateNumber || !examYear) {
    return res.status(400).json({
      success: false,
      message: 'Candidate number, certificate number, and exam year are required.'
    });
  }

  const normalizedCandidate = normalizeToken(candidateNumber);
  const normalizedCertificate = normalizeToken(certificateNumber);
  const normalizedYear = Number(examYear);

  if (!normalizedYear || Number.isNaN(normalizedYear)) {
    return res.status(400).json({
      success: false,
      message: 'Exam year must be a valid number.'
    });
  }

  db.run('DELETE FROM results WHERE candidate_number = ? AND exam_year = ?', [normalizedCandidate, normalizedYear], (err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Failed to delete result record.' });
    }

    db.run('DELETE FROM certificates WHERE candidate_number = ? AND certificate_number = ? AND exam_year = ?', [normalizedCandidate, normalizedCertificate, normalizedYear], (err2) => {
      if (err2) {
        return res.status(500).json({ success: false, message: 'Failed to delete certificate record.' });
      }

      db.run('DELETE FROM candidates WHERE candidate_number = ? AND candidate_number NOT IN (SELECT candidate_number FROM certificates)', [normalizedCandidate], (err3) => {
        if (err3) {
          return res.status(500).json({ success: false, message: 'Failed to clean candidate record.' });
        }

        return res.json({
          success: true,
          message: 'Record deleted successfully.'
        });
      });
    });
  });
});

app.post('/api/admin/results', (req, res) => {
  const { candidateNumber, fullName, certificateNumber, examType = 'WASSCE', examYear, results } = req.body || {};

  if (!candidateNumber || !fullName || !certificateNumber || !examYear || !Array.isArray(results) || results.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Candidate number, full name, certificate number, exam year, and at least one subject result are required.'
    });
  }

  const normalizedCandidate = normalizeToken(candidateNumber);
  const normalizedCertificate = normalizeToken(certificateNumber);
  const normalizedYear = Number(examYear);

  if (!normalizedYear || Number.isNaN(normalizedYear)) {
    return res.status(400).json({
      success: false,
      message: 'Exam year must be a valid number.'
    });
  }

  const generatedHash = `waec-${normalizedCandidate}-${normalizedYear}-${(examType || 'WASSCE').toLowerCase()}-authentic`;
  const defaultPassword = `WAEC@${normalizedYear}`;
  const safeEmail = `${fullName.trim().toLowerCase().replace(/\s+/g, '.')}@waec.org`;

  db.run(
    `INSERT OR IGNORE INTO candidates (candidate_number, password, full_name, email, status)
     VALUES (?, ?, ?, ?, 'active')`,
    [normalizedCandidate, defaultPassword, fullName.trim(), safeEmail]
  );

  db.run(
    `UPDATE candidates SET full_name = ?, email = ?, password = ? WHERE candidate_number = ?`,
    [fullName.trim(), safeEmail, defaultPassword, normalizedCandidate]
  );

  db.run(
    `INSERT OR IGNORE INTO certificates (candidate_number, certificate_number, exam_type, exam_year, status, verification_hash)
     VALUES (?, ?, ?, ?, 'issued', ?)`,
    [normalizedCandidate, normalizedCertificate, examType, normalizedYear, generatedHash]
  );

  db.run(
    `UPDATE certificates SET exam_type = ?, exam_year = ?, status = 'issued', verification_hash = ?
     WHERE certificate_number = ?`,
    [examType, normalizedYear, generatedHash, normalizedCertificate]
  );

  db.run('DELETE FROM results WHERE candidate_number = ? AND exam_year = ?', [normalizedCandidate, normalizedYear]);

  const resultStmt = db.prepare(
    `INSERT INTO results (candidate_number, subject, grade, exam_year) VALUES (?, ?, ?, ?)`
  );

  results.forEach(({ subject, grade }) => {
    if (!subject || !grade) return;
    resultStmt.run(normalizedCandidate, String(subject).trim(), String(grade).trim().toUpperCase(), normalizedYear);
  });

  resultStmt.finalize();

  return res.json({
    success: true,
    message: 'WAEC result uploaded successfully to the database.',
    candidateNumber: normalizedCandidate,
    certificateNumber: normalizedCertificate,
    uploadedSubjects: results.filter((item) => item.subject && item.grade).length
  });
});

app.get('/api/candidate/:candidateNumber', (req, res) => {
  const { candidateNumber } = req.params;

  db.get(
    'SELECT candidate_number, full_name, email, status FROM candidates WHERE candidate_number = ?',
    [candidateNumber],
    (err, row) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error.' });
      }

      if (!row) {
        return res.status(404).json({ success: false, message: 'Candidate not found.' });
      }

      return res.json({ success: true, candidate: row });
    }
  );
});

app.get('/api/certificates/:candidateNumber', (req, res) => {
  const { candidateNumber } = req.params;

  db.all(
    'SELECT * FROM certificates WHERE candidate_number = ?',
    [candidateNumber],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error.' });
      }

      return res.json({ success: true, certificates: rows });
    }
  );
});

app.get('/api/results/:candidateNumber', (req, res) => {
  const { candidateNumber } = req.params;

  db.all(
    'SELECT * FROM results WHERE candidate_number = ? ORDER BY id ASC',
    [candidateNumber],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error.' });
      }

      return res.json({ success: true, results: rows });
    }
  );
});

initDatabase();

app.listen(PORT, () => {
  console.log(`WAEC backend running on http://localhost:${PORT}`);
});
