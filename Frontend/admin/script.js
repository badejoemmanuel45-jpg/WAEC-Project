document.addEventListener('DOMContentLoaded', () => {
  const AUTH_KEY = 'waecAdminAuth';
  const USERS_KEY = 'waecAdminUsers';
  const THEME_KEY = 'waecTheme';
  const pageName = document.body.dataset.page;

  const getApiBase = () => {
    const configured = (window.__WAEC_API_BASE__ || '').replace(/\/+$/, '');
    if (configured) {
      return configured;
    }

    const hostname = window.location.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' ? 'http://localhost:5000' : '';
  };

  const apiFetch = (path, options = {}) => fetch(`${getApiBase()}${path}`, options);

  const defaultAdmin = {
    fullName: 'WAEC Admin',
    adminId: 'admin',
    email: 'admin@waec.gov.ng',
    password: 'admin123'
  };

  const getStoredAdmins = () => {
    try {
      const raw = localStorage.getItem(USERS_KEY);
      let admins = raw ? JSON.parse(raw) : [];

      if (!Array.isArray(admins) || admins.length === 0) {
        admins = [defaultAdmin];
        localStorage.setItem(USERS_KEY, JSON.stringify(admins));
      }

      const hasDefaultAdmin = admins.some((admin) => admin.adminId === defaultAdmin.adminId);
      if (!hasDefaultAdmin) {
        admins.unshift(defaultAdmin);
        localStorage.setItem(USERS_KEY, JSON.stringify(admins));
      }

      return admins;
    } catch (error) {
      return [defaultAdmin];
    }
  };

  const saveAdmins = (admins) => {
    localStorage.setItem(USERS_KEY, JSON.stringify(admins));
  };

  const currentAdmin = () => {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  };

  const applyTheme = (theme) => {
    const selectedTheme = theme === 'dark' ? 'dark' : 'light';
    document.body.dataset.theme = selectedTheme;
    localStorage.setItem(THEME_KEY, selectedTheme);
  };

  const initialTheme = localStorage.getItem(THEME_KEY) || 'light';
  applyTheme(initialTheme);

  let themeToggle = document.querySelector('.theme-toggle');
  if (!themeToggle) {
    themeToggle = document.createElement('button');
    themeToggle.type = 'button';
    themeToggle.className = 'theme-toggle';
    themeToggle.setAttribute('aria-label', 'Toggle light and dark mode');
    themeToggle.textContent = document.body.dataset.theme === 'dark' ? '☀️' : '🌙';
    document.body.appendChild(themeToggle);
  }

  const syncThemeToggle = () => {
    const nextTheme = document.body.dataset.theme === 'dark' ? 'dark' : 'light';
    if (themeToggle) {
      themeToggle.textContent = nextTheme === 'dark' ? '☀️' : '🌙';
      themeToggle.title = nextTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    }
  };

  themeToggle.addEventListener('click', () => {
    const nextTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    syncThemeToggle();
  });

  syncThemeToggle();

  const redirectIfLoggedIn = () => {
    if (currentAdmin()) {
      window.location.href = 'admin.html';
    }
  };

  if (pageName === 'admin-login' || pageName === 'admin-register') {
    if (pageName === 'admin-login') {
      redirectIfLoggedIn();
    }
    if (pageName === 'admin-register') {
      redirectIfLoggedIn();
    }
  }

  const adminLoginForm = document.getElementById('adminLoginForm');
  const authMessage = document.getElementById('authMessage');

  if (adminLoginForm && authMessage) {
    adminLoginForm.addEventListener('submit', (event) => {
      event.preventDefault();

      const adminId = document.getElementById('adminId').value.trim();
      const password = document.getElementById('adminPassword').value.trim();

      if (!adminId || !password) {
        authMessage.textContent = 'Please enter your admin ID and password.';
        authMessage.classList.remove('success');
        return;
      }

      const admins = getStoredAdmins();
      const match = admins.find(
        (admin) => String(admin.adminId || '').trim() === String(adminId || '').trim() && String(admin.password || '').trim() === String(password || '').trim()
      );

      if (!match) {
        authMessage.textContent = 'Invalid admin ID or password.';
        authMessage.classList.remove('success');
        return;
      }

      localStorage.setItem(AUTH_KEY, JSON.stringify({
        adminId: match.adminId,
        fullName: match.fullName,
        email: match.email
      }));

      authMessage.textContent = 'Login successful. Redirecting...';
      authMessage.classList.add('success');

      setTimeout(() => {
        window.location.href = 'admin.html';
      }, 500);
    });
  }

  const adminRegisterForm = document.getElementById('adminRegisterForm');
  const registerMessage = document.getElementById('registerMessage');

  if (adminRegisterForm && registerMessage) {
    adminRegisterForm.addEventListener('submit', (event) => {
      event.preventDefault();

      const formData = new FormData(adminRegisterForm);
      const fullName = String(formData.get('fullName') || '').trim();
      const adminId = String(formData.get('adminId') || '').trim();
      const email = String(formData.get('email') || '').trim();
      const password = String(formData.get('password') || '').trim();
      const confirmPassword = String(formData.get('confirmPassword') || '').trim();

      if (!fullName || !adminId || !email || !password || !confirmPassword) {
        registerMessage.textContent = 'Please complete all fields.';
        registerMessage.classList.remove('success');
        return;
      }

      if (password !== confirmPassword) {
        registerMessage.textContent = 'Passwords do not match.';
        registerMessage.classList.remove('success');
        return;
      }

      const admins = getStoredAdmins();
      if (admins.some((admin) => admin.adminId === adminId)) {
        registerMessage.textContent = 'This admin ID is already registered.';
        registerMessage.classList.remove('success');
        return;
      }

      const newAdmin = {
        fullName,
        adminId,
        email,
        password
      };

      admins.push(newAdmin);
      saveAdmins(admins);

      registerMessage.textContent = 'Registration successful. Redirecting to sign in...';
      registerMessage.classList.add('success');

      setTimeout(() => {
        window.location.href = 'login.html';
      }, 600);
    });
  }

  if (pageName === 'admin') {
    const admin = currentAdmin();
    if (!admin) {
      window.location.href = 'login.html';
      return;
    }

    document.querySelectorAll('.nav-item[data-link]').forEach((item) => {
      item.addEventListener('click', () => {
        const link = item.dataset.link;
        if (link) {
          window.location.href = link;
        }
      });
    });

    document.querySelectorAll('.action-item[data-scroll-target]').forEach((item) => {
      item.addEventListener('click', () => {
        const targetSelector = item.dataset.scrollTarget;
        if (!targetSelector) return;

        const target = document.querySelector(targetSelector);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

    const nameTarget = document.getElementById('adminName');
    if (nameTarget) nameTarget.textContent = admin.fullName || 'Admin';

    const userMeta = document.querySelector('.user-detail strong');
    if (userMeta) userMeta.textContent = admin.fullName || 'Admin';

    const avatar = document.querySelector('.avatar');
    if (avatar) {
      avatar.textContent = (admin.fullName || 'A').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();
    }

    const totalRecords = document.getElementById('totalRecords');
    const newUploads = document.getElementById('newUploads');
    const authenticityRate = document.getElementById('authenticityRate');
    const databaseStatus = document.getElementById('databaseStatus');
    const adminUploadForm = document.getElementById('adminUploadForm');
    const adminMessage = document.getElementById('adminMessage');
    const resultRows = document.getElementById('resultRows');
    const addResultRowButton = document.getElementById('addResultRow');
    const adminRecordsBody = document.getElementById('adminRecordsBody');

    const addResultRow = () => {
      if (!resultRows) return;
      const row = document.createElement('div');
      row.className = 'result-row';
      row.innerHTML = `
        <input type="text" name="subject" placeholder="Subject" required />
        <input type="text" name="grade" placeholder="Grade" required />
        <button type="button" class="remove-row">Remove</button>
      `;
      row.querySelector('.remove-row').addEventListener('click', () => row.remove());
      resultRows.appendChild(row);
    };

    const renderSummary = async () => {
      try {
        const response = await apiFetch('/api/admin/summary');
        const data = await response.json();

        if (!response.ok || !data.success || !data.summary) {
          if (databaseStatus) databaseStatus.textContent = 'Connection issue';
          return;
        }

        if (databaseStatus) databaseStatus.textContent = 'Connected and updating records';

        const summary = data.summary;
        if (totalRecords) totalRecords.textContent = summary.totalRecords || summary.totalCertificates || 0;
        if (newUploads) newUploads.textContent = summary.newUploads || 0;
        if (authenticityRate) authenticityRate.textContent = `${Number(summary.authenticityRate || 0).toFixed(1)}%`;
      } catch (error) {
        if (databaseStatus) databaseStatus.textContent = 'Connection issue';
      }
    };

    const renderRecords = async () => {
      if (!adminRecordsBody) return;

      try {
        const response = await apiFetch('/api/admin/records');
        const data = await response.json();

        if (!response.ok || !data.success || !Array.isArray(data.records)) {
          adminRecordsBody.innerHTML = '<tr><td colspan="4" style="padding: 14px 8px; color: #b91c1c;">Unable to load admin records.</td></tr>';
          return;
        }

        if (data.records.length === 0) {
          adminRecordsBody.innerHTML = '<tr><td colspan="4" style="padding: 14px 8px; color: #64748b;">No uploaded records yet.</td></tr>';
          return;
        }

        adminRecordsBody.innerHTML = data.records.map((record) => `
          <tr style="border-top: 1px solid #e2e8f0; vertical-align: top;">
            <td style="padding: 12px 8px; font-weight: 600; color: #0f172a;">
              <div style="display: flex; flex-direction: column; gap: 2px; line-height: 1.2;">
                <span style="font-size: 1.05rem; font-weight: 700; color: #0f172a;">${record.fullName}</span>
                <span style="font-size: 0.8rem; color: #64748b; letter-spacing: 0.02em;">${record.candidateNumber}</span>
              </div>
            </td>
            <td style="padding: 12px 8px; color: #334155; font-weight: 600; vertical-align: top;">${record.certificateNumber}</td>
            <td style="padding: 12px 8px; color: #334155; vertical-align: top;">
              <div style="display: flex; flex-direction: column; gap: 4px; line-height: 1.3;">
                <span style="font-size: 0.95rem; font-weight: 700; color: #0f172a;">${record.examType}</span>
                <span style="font-size: 0.78rem; color: #64748b;">${record.examYear}</span>
              </div>
            </td>
            <td style="padding: 12px 8px; color: #334155; font-weight: 700; text-align: center; vertical-align: top;">${record.subjectCount}</td>
            <td style="padding: 12px 10px; text-align: center; vertical-align: middle;">
              <button type="button" class="delete-record-button" data-candidate-number="${record.candidateNumber}" data-certificate-number="${record.certificateNumber}" data-exam-year="${record.examYear}" style="background: #fef2f2; color: #c62828; border: 1px solid rgba(185, 28, 28, 0.18); border-radius: 12px; padding: 14px 22px; min-width: 120px; font-size: 1.02rem; font-weight: 800; cursor: pointer; letter-spacing: 0.01em; white-space: nowrap; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.7);">Delete</button>
            </td>
          </tr>
        `).join('');

        document.querySelectorAll('.delete-record-button').forEach((button) => {
          button.addEventListener('click', async () => {
            const candidateNumber = button.dataset.candidateNumber;
            const certificateNumber = button.dataset.certificateNumber;
            const examYear = button.dataset.examYear;

            if (!candidateNumber || !certificateNumber || !examYear) return;

            if (!window.confirm('Delete this WAEC record from the database?')) {
              return;
            }

            try {
              const response = await apiFetch('/api/admin/delete-record', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ candidateNumber, certificateNumber, examYear })
              });

              const result = await response.json();

              if (!response.ok || !result.success) {
                window.alert(result.message || 'Unable to delete this record.');
                return;
              }

              renderRecords();
              renderSummary();
            } catch (error) {
              window.alert('Unable to delete this record right now.');
            }
          });
        });
      } catch (error) {
        adminRecordsBody.innerHTML = '<tr><td colspan="4" style="padding: 14px 8px; color: #b91c1c;">Connection error while loading records.</td></tr>';
      }
    };

    if (addResultRowButton) {
      addResultRowButton.addEventListener('click', addResultRow);
    }

    if (resultRows) {
      addResultRow();
    }

    if (adminUploadForm && adminMessage && resultRows) {
      adminUploadForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const formData = new FormData(adminUploadForm);
        const candidateNumber = String(formData.get('candidateNumber') || '').trim();
        const fullName = String(formData.get('fullName') || '').trim();
        const certificateNumber = String(formData.get('certificateNumber') || '').trim();
        const examType = String(formData.get('examType') || 'WASSCE').trim();
        const examYear = String(formData.get('examYear') || '').trim();
        const rows = Array.from(resultRows.querySelectorAll('.result-row'));
        const results = rows
          .map((row) => {
            const subjectInput = row.querySelector('input[name="subject"]');
            const gradeInput = row.querySelector('input[name="grade"]');
            return {
              subject: subjectInput ? subjectInput.value.trim() : '',
              grade: gradeInput ? gradeInput.value.trim().toUpperCase() : ''
            };
          })
          .filter((entry) => entry.subject && entry.grade);

        if (!candidateNumber || !fullName || !certificateNumber || !examYear || results.length === 0) {
          adminMessage.textContent = 'Please complete all fields and add at least one subject result.';
          adminMessage.classList.remove('success');
          return;
        }

        adminMessage.textContent = 'Uploading WAEC result...';
        adminMessage.classList.remove('success');

        try {
          const response = await apiFetch('/api/admin/results', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ candidateNumber, fullName, certificateNumber, examType, examYear, results })
          });

          const data = await response.json();

          if (!response.ok || !data.success) {
            adminMessage.textContent = data.message || 'Result upload failed.';
            adminMessage.classList.remove('success');
            return;
          }

          adminMessage.textContent = data.message || 'WAEC result uploaded successfully.';
          adminMessage.classList.add('success');
          adminUploadForm.reset();
          resultRows.innerHTML = '';
          addResultRow();
          renderSummary();
          renderRecords();
        } catch (error) {
          adminMessage.textContent = 'Unable to connect to the backend. Please try again.';
          adminMessage.classList.remove('success');
        }
      });
    }

    const logoutButton = document.getElementById('adminLogout');
    if (logoutButton) {
      logoutButton.addEventListener('click', () => {
        localStorage.removeItem(AUTH_KEY);
        localStorage.removeItem('waecAdminUsers');
        sessionStorage.removeItem('waecAuthError');
        window.location.href = 'login.html';
      });
    }

    renderSummary();
    renderRecords();
  }
});
