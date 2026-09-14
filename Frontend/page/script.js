document.addEventListener('DOMContentLoaded', () => {
  const pageName = document.body.dataset.page;
  const THEME_KEY = 'waecTheme';

  const getApiBase = () => {
    const configured = (window.__WAEC_API_BASE__ || '').replace(/\/+$/, '');
    if (configured) {
      return configured;
    }

    const hostname = window.location.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' ? 'http://localhost:5000' : '';
  };

  const apiFetch = (path, options = {}) => fetch(`${getApiBase()}${path}`, options);
  const USERS_KEY = 'waecUsers';
  const ACTIVE_USER_KEY = 'waecCandidate';
  const REMEMBERED_USERS_KEY = 'waecRememberedUsers';
  const VERIFICATION_REQUESTS_KEY = 'waecVerificationRequests';
  const protectedPages = new Set([
    'dashboard',
    'admin',
    'certification',
    'results',
    'request',
    'verify',
    'profile',
    'support'
  ]);

  const getStoredUsers = () => {
    try {
      const raw = localStorage.getItem(USERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      return [];
    }
  };

  const saveUsers = (users) => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  };

  const getStoredCandidate = () => {
    try {
      const raw = localStorage.getItem(ACTIVE_USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  };

  const getStoredVerificationRequests = () => {
    try {
      const raw = localStorage.getItem(VERIFICATION_REQUESTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      return [];
    }
  };

  const saveVerificationRequests = (requests) => {
    localStorage.setItem(VERIFICATION_REQUESTS_KEY, JSON.stringify(requests));
  };

  const saveVerificationRequestForCandidate = ({ fullName, candidateNumber, email, pin }) => {
    const normalizedCandidate = normalizeCandidateNumber(candidateNumber);
    const normalizedPin = String(pin || '').trim();
    const safeFullName = String(fullName || '').trim();
    const safeEmail = String(email || '').trim();

    if (!normalizedCandidate || !normalizedPin || !safeFullName || !safeEmail) {
      return;
    }

    const requests = getStoredVerificationRequests();
    const updated = requests.filter((request) => normalizeCandidateNumber(request.candidateNumber) !== normalizedCandidate);
    updated.unshift({
      fullName: safeFullName,
      candidateNumber: normalizedCandidate,
      email: safeEmail,
      pin: normalizedPin
    });
    saveVerificationRequests(updated);
  };

  const normalizeCandidateNumber = (value) => String(value || '').trim().replace(/\s+/g, '').toUpperCase();

  const getRememberedUsers = () => {
    try {
      const raw = localStorage.getItem(REMEMBERED_USERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      return [];
    }
  };

  const saveRememberedUsers = (users) => {
    localStorage.setItem(REMEMBERED_USERS_KEY, JSON.stringify(users));
  };

  const clearSignedInSession = () => {
    localStorage.removeItem(ACTIVE_USER_KEY);
    localStorage.removeItem(REMEMBERED_USERS_KEY);
    sessionStorage.removeItem('waecAuthError');
  };

  const findLocalUser = (candidateNumber, password) => {
    const normalizedCandidateNumber = normalizeCandidateNumber(candidateNumber);
    const normalizedPassword = String(password || '').trim();

    return getStoredUsers().find((user) => {
      const storedCandidateNumber = normalizeCandidateNumber(user.candidateNumber);
      const storedPassword = String(user.password || '').trim();
      const exactMatch = storedCandidateNumber === normalizedCandidateNumber && storedPassword === normalizedPassword;
      const legacyMatch = storedCandidateNumber === normalizedCandidateNumber && storedPassword.toUpperCase() === normalizedPassword.toUpperCase();
      return exactMatch || legacyMatch;
    });
  };

  const findLocalVerificationRequest = (candidateNumber, pin) => {
    const normalizedCandidateNumber = normalizeCandidateNumber(candidateNumber);
    const normalizedPin = String(pin || '').trim();

    return getStoredVerificationRequests().find((request) => {
      const storedCandidateNumber = normalizeCandidateNumber(request.candidateNumber);
      const storedPin = String(request.pin || '').trim();
      return storedCandidateNumber === normalizedCandidateNumber && storedPin === normalizedPin;
    });
  };

  const rememberSignedInUser = (user) => {
    if (!user || !user.candidateNumber) return;

    const remembered = getRememberedUsers();
    const normalizedCandidateNumber = normalizeCandidateNumber(user.candidateNumber);
    const nextList = remembered.filter((entry) => normalizeCandidateNumber(entry.candidateNumber) !== normalizedCandidateNumber);
    nextList.unshift({
      candidateNumber: normalizedCandidateNumber,
      fullName: user.fullName,
      email: user.email,
      certificateNumber: user.certificateNumber || 'WAEC/2024/00067891'
    });

    saveRememberedUsers(nextList.slice(0, 10));
  };

  const setInitials = (fullName, target) => {
    if (!target) return;
    const initials = (fullName || 'WA')
      .split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
    target.textContent = initials || 'WA';
  };

  const renderLoggedInUser = (candidate) => {
    if (!candidate) return;

    document.querySelectorAll('.user-detail strong, #userFullName, #profileFullName').forEach((element) => {
      element.textContent = candidate.fullName || element.textContent;
    });

    document.querySelectorAll('.avatar, #userAvatar, #profileAvatar').forEach((element) => {
      setInitials(candidate.fullName, element);
    });

    const nameValue = document.getElementById('candidateNameValue');
    if (nameValue) nameValue.textContent = candidate.fullName;

    const examTypeValue = document.getElementById('examTypeValue');
    if (examTypeValue) examTypeValue.textContent = 'WASSCE';

    const examYearValue = document.getElementById('examYearValue');
    if (examYearValue) examYearValue.textContent = new Date().getFullYear();

    const candidateNumberValue = document.getElementById('candidateNumberValue');
    if (candidateNumberValue) candidateNumberValue.textContent = candidate.candidateNumber;

    const certificateNumberValue = document.getElementById('certificateNumberValue');
    if (certificateNumberValue) certificateNumberValue.textContent = candidate.certificateNumber || 'WAEC/2024/00067891';

    if (document.getElementById('profileCandidateId')) {
      document.getElementById('profileCandidateId').textContent = `Candidate ID: ${candidate.candidateNumber}`;
    }

    if (document.getElementById('profileEmail')) {
      document.getElementById('profileEmail').value = candidate.email || '';
    }
  };

  const redirectTo = (target) => {
    const destination = target || 'dashboard.html';
    window.location.replace(destination);
  };

  const currentCandidate = getStoredCandidate();
  const registerForm = document.getElementById('registerForm');
  const registerButton = document.getElementById('generatePinButton');
  const registerMessage = document.getElementById('registerMessage');
  const verificationPinInput = document.getElementById('verificationPinInput');

  if (registerForm) {
    registerForm.setAttribute('novalidate', 'true');
    registerForm.setAttribute('action', 'javascript:void(0);');
    registerForm.setAttribute('method', 'post');
  }

  const attachUtilityPanels = () => {
    const topActions = document.querySelector('.top-actions');
    if (!topActions) return;

    const notificationPanel = document.querySelector('.notification-panel');
    if (!notificationPanel) {
      const panel = document.createElement('div');
      panel.className = 'notification-panel hidden';
      panel.innerHTML = `
        <div class="panel-title">Notifications</div>
        <div class="panel-item"><strong>3 records</strong><span>updated in the WAEC database</span></div>
        <div class="panel-item"><strong>1 alert</strong><span>certificate mismatch flagged</span></div>
        <div class="panel-item"><strong>2 tasks</strong><span>pending verification review</span></div>
      `;
      topActions.appendChild(panel);
    }

    const userMeta = document.querySelector('.user-meta');
    const userMenu = document.querySelector('.user-menu');
    if (userMeta && !userMenu) {
      const menu = document.createElement('div');
      menu.className = 'user-menu hidden';
      menu.innerHTML = `
        <div class="panel-title">Account</div>
        <div class="panel-item"><strong>${currentCandidate?.fullName || 'WAEC User'}</strong><span>Verified account</span></div>
        <div class="panel-item"><strong>Profile</strong><span>Manage your details</span></div>
        <div class="panel-item"><strong>Logout</strong><span>End your portal session</span></div>
      `;
      userMeta.appendChild(menu);
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
  attachUtilityPanels();

  const rememberedUser = getRememberedUsers()[0] || null;

  if (pageName && protectedPages.has(pageName) && !currentCandidate) {
    if (rememberedUser) {
      localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(rememberedUser));
      window.location.href = 'dashboard.html';
      return;
    }

    sessionStorage.setItem('waecAuthError', 'Please sign in first to access this page.');
    window.location.href = 'login.html';
    return;
  }

  if (pageName === 'login') {
    const loginError = sessionStorage.getItem('waecAuthError');
    const authMessage = document.getElementById('authMessage');
    if (loginError && authMessage) {
      authMessage.textContent = loginError;
      authMessage.classList.remove('success');
      authMessage.classList.add('error');
      sessionStorage.removeItem('waecAuthError');
    }

    if (currentCandidate) {
      window.location.href = 'dashboard.html';
      return;
    }
  }

  if (pageName === 'register' && currentCandidate) {
    window.location.href = 'dashboard.html';
    return;
  }

  if (currentCandidate) {
    renderLoggedInUser(currentCandidate);
  }

  const notifyButton = document.querySelector('.notify-button');
  const notificationPanel = document.querySelector('.notification-panel');
  if (notifyButton && notificationPanel) {
    notifyButton.addEventListener('click', () => {
      notificationPanel.classList.toggle('hidden');
      const userMenu = document.querySelector('.user-menu');
      if (userMenu) userMenu.classList.add('hidden');
    });
  }

  const userMeta = document.querySelector('.user-meta');
  const userMenu = document.querySelector('.user-menu');
  if (userMeta && userMenu) {
    userMeta.addEventListener('click', () => {
      userMenu.classList.toggle('hidden');
      const panel = document.querySelector('.notification-panel');
      if (panel) panel.classList.add('hidden');
    });

    document.querySelector('.user-menu .panel-item:last-child')?.addEventListener('click', () => {
      clearSignedInSession();
      window.location.href = 'login.html';
    });
  }

  const currentCandidateNumber = currentCandidate?.candidateNumber;
  if (currentCandidateNumber) {
    apiFetch(`/api/candidate/${currentCandidateNumber}`)
      .then((response) => response.json())
      .then((data) => {
        if (data && data.success && data.candidate) {
          const refreshed = {
            ...currentCandidate,
            fullName: data.candidate.full_name,
            email: data.candidate.email,
            candidateNumber: data.candidate.candidate_number,
            status: data.candidate.status
          };
          localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(refreshed));
          renderLoggedInUser(refreshed);
        }
      })
      .catch(() => {});
  }

  if (pageName === 'results') {
    const currentStudent = getStoredCandidate();
    const resultsListContent = document.getElementById('resultsListContent');
    const averageScoreValue = document.getElementById('averageScoreValue');
    const passedSubjectsValue = document.getElementById('passedSubjectsValue');
    const overallGradeValue = document.getElementById('overallGradeValue');

    const gradeScoreMap = {
      'A1': 95,
      A2: 90,
      B1: 85,
      B2: 80,
      B3: 75,
      C4: 70,
      C5: 65,
      C6: 60,
      D7: 55,
      E8: 50,
      F9: 40
    };

    const scoreToGrade = (score) => {
      if (score >= 90) return 'A1';
      if (score >= 80) return 'B2';
      if (score >= 70) return 'C4';
      if (score >= 60) return 'C6';
      if (score >= 50) return 'D7';
      return 'F9';
    };

    const renderResults = (records) => {
      if (!Array.isArray(records) || records.length === 0) {
        if (resultsListContent) {
          resultsListContent.innerHTML = '<div class="record-row"><div><strong>No results available yet</strong><small>Upload a result to view it here.</small></div></div>';
        }
        if (averageScoreValue) averageScoreValue.textContent = '0%';
        if (passedSubjectsValue) passedSubjectsValue.textContent = '0';
        if (overallGradeValue) overallGradeValue.textContent = '—';
        return;
      }

      const safeRecords = records
        .map((entry) => ({
          subject: String(entry.subject || '').trim(),
          grade: String(entry.grade || '').trim().toUpperCase(),
          score: gradeScoreMap[String(entry.grade || '').trim().toUpperCase()] ?? 0
        }))
        .filter((entry) => entry.subject && entry.grade);

      const passed = safeRecords.filter((entry) => entry.score >= 50).length;
      const average = safeRecords.length > 0
        ? Math.round(safeRecords.reduce((sum, entry) => sum + entry.score, 0) / safeRecords.length)
        : 0;
      const overallGrade = safeRecords.length > 0 ? scoreToGrade(average) : '—';

      if (averageScoreValue) averageScoreValue.textContent = `${average}%`;
      if (passedSubjectsValue) passedSubjectsValue.textContent = String(passed);
      if (overallGradeValue) overallGradeValue.textContent = overallGrade;

      if (resultsListContent) {
        resultsListContent.innerHTML = safeRecords.map((entry) => `
          <div class="record-row">
            <div>
              <strong>${entry.subject}</strong>
              <small>Grade ${entry.grade}</small>
            </div>
            <span class="status-tag">${entry.score}</span>
          </div>
        `).join('');
      }
    };

    if (currentStudent && currentStudent.candidateNumber) {
      apiFetch(`/api/results/${currentStudent.candidateNumber}`)
        .then((response) => response.json())
        .then((data) => {
          if (data && data.success && Array.isArray(data.results)) {
            renderResults(data.results);
            return;
          }
          renderResults([]);
        })
        .catch(() => {
          renderResults([]);
        });
    } else {
      renderResults([]);
    }
  }

  const generateVerificationPin = () => {
    const digits = '0123456789';
    let pin = '';
    for (let index = 0; index < 6; index += 1) {
      const randomIndex = Math.floor(Math.random() * digits.length);
      pin += digits[randomIndex];
    }
    return pin;
  };

  if (verificationPinInput) {
    verificationPinInput.value = '';
  }

  const handleRegisterSubmit = async () => {
    if (!registerForm || !registerMessage) return;

    const formData = new FormData(registerForm);
    const fullName = String(formData.get('fullName') || '').trim();
    const candidateNumber = normalizeCandidateNumber(formData.get('candidateNumber'));
    const email = String(formData.get('email') || '').trim();

    if (!fullName || !candidateNumber || !email) {
      registerMessage.textContent = 'Please complete all verification PIN fields.';
      registerMessage.classList.remove('success');
      return;
    }

    try {
      const candidateResponse = await apiFetch(`/api/candidate/${candidateNumber}`);
      const candidateData = candidateResponse.ok ? await candidateResponse.json() : await candidateResponse.json().catch(() => ({}));

      if (!candidateResponse.ok || !candidateData.success) {
        throw new Error(candidateData.message || 'This candidate number is not registered or uploaded to the portal database yet.');
      }

      const pin = generateVerificationPin();
      const savedPayload = { fullName, candidateNumber, email, pin };

      saveVerificationRequestForCandidate(savedPayload);

      if (verificationPinInput) {
        verificationPinInput.value = pin;
      }

      const response = await apiFetch('/api/verification-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savedPayload)
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to register verification PIN.');
      }

      registerMessage.textContent = `Generated PIN: ${pin} — use this PIN to sign in.`;
      registerMessage.classList.add('success');
    } catch (error) {
      const message = error.message || 'Unable to register verification PIN.';
      registerMessage.textContent = message.includes('not registered or uploaded')
        ? 'This candidate has not been uploaded to the portal database yet. Please upload the candidate result first, then generate a verification PIN.'
        : message;
      registerMessage.classList.remove('success');
    }
  };

  if (registerButton) {
    registerButton.type = 'button';
    registerButton.setAttribute('type', 'button');
    registerButton.setAttribute('formnovalidate', 'true');

    registerButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      handleRegisterSubmit();
    });
  }

  if (registerForm && registerMessage) {
    registerForm.addEventListener('submit', (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      handleRegisterSubmit();
    });
  }

  document.querySelectorAll('.nav-item[data-link]').forEach((item) => {
    const link = item.dataset.link;
    const current = item.dataset.page === pageName;
    if (current) item.classList.add('active');
    item.addEventListener('click', () => {
      if (link) window.location.href = link;
    });
  });

  document.querySelectorAll('[data-link]').forEach((element) => {
    if (element.classList.contains('nav-item')) return;
    element.addEventListener('click', () => {
      const target = element.dataset.link;
      if (target) window.location.href = target;
    });
  });

  document.querySelectorAll('.action-item').forEach((item) => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.action-item').forEach((el) => el.classList.remove('is-selected'));
      item.classList.add('is-selected');
      const target = item.dataset.link;
      if (target) window.location.href = target;
    });
  });

  document.querySelectorAll('.primary-button, .secondary-button').forEach((button) => {
    if (button.closest('#registerForm')) return;

    button.addEventListener('click', () => {
      document.querySelectorAll('.primary-button, .secondary-button').forEach((el) => el.classList.remove('pressed'));
      button.classList.add('pressed');
      const target = button.dataset.link;
      if (target && button.type !== 'submit') window.location.href = target;
    });
  });

  const loginForm = document.getElementById('loginForm');
  const candidateInput = document.getElementById('candidateNumber');
  const passwordInput = document.getElementById('password');
  const authMessage = document.getElementById('authMessage');

  if (loginForm && candidateInput && passwordInput && authMessage) {
    candidateInput.setAttribute('required', 'required');
    passwordInput.setAttribute('required', 'required');

    if (!authMessage.classList.contains('success')) {
      const previousMessage = sessionStorage.getItem('waecAuthError');
      if (previousMessage) {
        authMessage.textContent = previousMessage;
        authMessage.classList.add('error');
        sessionStorage.removeItem('waecAuthError');
      }
    }

    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const candidateNumber = normalizeCandidateNumber(candidateInput.value);
      const pin = passwordInput.value.trim();

      if (!candidateNumber || !pin) {
        authMessage.textContent = 'Please enter your candidate number and verification PIN.';
        authMessage.classList.remove('success');
        candidateInput.focus();
        return;
      }

      authMessage.textContent = 'Checking your verification PIN...';
      authMessage.classList.remove('success');

      try {
        const response = await apiFetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidateNumber, pin })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          const signedInUser = {
            candidateNumber: data.candidate.candidateNumber,
            fullName: data.candidate.fullName,
            email: data.candidate.email,
            certificateNumber: data.candidate.certificateNumber || 'WAEC/2024/00067891'
          };

          localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(signedInUser));
          rememberSignedInUser(signedInUser);
          authMessage.textContent = 'Login successful. Redirecting...';
          authMessage.classList.add('success');

          const redirectTarget = loginForm.dataset.link || document.querySelector('#loginForm .auth-button')?.dataset?.link || 'dashboard.html';
          redirectTo(redirectTarget);
          return;
        }
      } catch (error) {
        // Continue to local fallback below.
      }

      const localRequest = findLocalVerificationRequest(candidateNumber, pin);

      if (!localRequest) {
        authMessage.textContent = 'Invalid candidate number or verification PIN.';
        authMessage.classList.remove('success');
        return;
      }

      const signedInLocalUser = {
        candidateNumber: localRequest.candidateNumber,
        fullName: localRequest.fullName,
        email: localRequest.email,
        certificateNumber: localRequest.certificateNumber || 'WAEC/2024/00067891'
      };

      localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(signedInLocalUser));
      rememberSignedInUser(signedInLocalUser);
      authMessage.textContent = 'Login successful. Redirecting...';
      authMessage.classList.add('success');
      const redirectTarget = loginForm.dataset.link || document.querySelector('#loginForm .auth-button')?.dataset?.link || 'dashboard.html';
      redirectTo(redirectTarget);
    });
  }

  const verificationForm = document.getElementById('verificationForm');
  const verifyCandidateNumber = document.getElementById('verifyCandidateNumber');
  const verifyCertificateNumber = document.getElementById('verifyCertificateNumber');
  const verifyExamYear = document.getElementById('verifyExamYear');
  const verificationResult = document.getElementById('verificationResult');
  const verifyResultRows = document.getElementById('verifyResultRows');
  const addVerifyResultRowButton = document.getElementById('addVerifyResultRow');

  if (verifyResultRows && addVerifyResultRowButton) {
    const addVerifyResultRow = () => {
      const row = document.createElement('div');
      row.className = 'result-row';
      row.innerHTML = `
        <input type="text" name="verifySubject" placeholder="Subject" required />
        <input type="text" name="verifyGrade" placeholder="Grade" required />
        <button type="button" class="remove-row">Remove</button>
      `;
      row.querySelector('.remove-row').addEventListener('click', () => row.remove());
      verifyResultRows.appendChild(row);
    };

    addVerifyResultRow();
    addVerifyResultRowButton.addEventListener('click', addVerifyResultRow);
  }

  if (verificationForm && verifyCandidateNumber && verifyCertificateNumber && verifyExamYear && verificationResult) {
    const resultMessage = verificationResult.querySelector('.result-message');

    verificationForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const candidateNumber = verifyCandidateNumber.value.trim();
      const certificateNumber = verifyCertificateNumber.value.trim();
      const examYear = verifyExamYear.value.trim();
      const rows = Array.from((verifyResultRows || document.querySelectorAll('#verifyResultRows .result-row')));
      const results = rows
        .map((row) => {
          const subjectInput = row.querySelector('input[name="verifySubject"]');
          const gradeInput = row.querySelector('input[name="verifyGrade"]');
          const subject = subjectInput ? subjectInput.value.trim() : '';
          const grade = gradeInput ? gradeInput.value.trim().toUpperCase() : '';
          return { subject, grade };
        })
        .filter((entry) => entry.subject && entry.grade);

      if (!candidateNumber || !certificateNumber || !examYear) {
        if (resultMessage) {
          resultMessage.textContent = 'Please complete all verification fields.';
          resultMessage.classList.remove('success-text');
          resultMessage.classList.remove('warning-text');
          resultMessage.classList.add('error-text');
        }
        return;
      }

      if (resultMessage) {
        resultMessage.textContent = 'Checking certificate authenticity and result details...';
        resultMessage.classList.remove('success-text', 'warning-text', 'error-text');
      }

      try {
        const response = await apiFetch('/api/verify-certificate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidateNumber, certificateNumber, examYear, results })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          const status = data.status || 'fake';
          const message = data.message || 'Verification failed.';
          if (resultMessage) {
            resultMessage.textContent = message;
            resultMessage.classList.remove('success-text', 'warning-text');
            resultMessage.classList.toggle('error-text', status !== 'tampered');
            resultMessage.classList.toggle('warning-text', status === 'tampered');
          }
          return;
        }

        if (resultMessage) {
          resultMessage.textContent = data.message || 'Certificate verification completed successfully.';
          resultMessage.classList.remove('warning-text', 'error-text');
          resultMessage.classList.add('success-text');
        }
      } catch (error) {
        if (resultMessage) {
          resultMessage.textContent = 'Unable to connect to the verification server.';
          resultMessage.classList.remove('success-text', 'warning-text');
          resultMessage.classList.add('error-text');
        }
      }
    });
  }

  const authButton = document.querySelector('.auth-button');
  if (authButton && !loginForm && authButton.dataset.link) {
    authButton.addEventListener('click', () => {
      const target = authButton.dataset.link;
      window.location.href = target;
    });
  }

  const adminForm = document.getElementById('adminResultForm');
  const adminMessage = document.getElementById('adminMessage');
  const resultRows = document.getElementById('resultRows');

  if (adminForm && resultRows) {
    const addResultRow = () => {
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

    document.getElementById('addResultRow')?.addEventListener('click', addResultRow);
    addResultRow();

    adminForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const formData = new FormData(adminForm);
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
          const subject = subjectInput ? subjectInput.value.trim() : '';
          const grade = gradeInput ? gradeInput.value.trim() : '';
          return { subject, grade };
        })
        .filter((entry) => entry.subject && entry.grade);

      if (!candidateNumber || !fullName || !certificateNumber || !examYear || results.length === 0) {
        if (adminMessage) {
          adminMessage.textContent = 'Please complete all fields and add at least one subject result.';
          adminMessage.classList.remove('success');
        }
        return;
      }

      if (adminMessage) {
        adminMessage.textContent = 'Uploading WAEC result...';
        adminMessage.classList.remove('success');
      }

      try {
        const response = await apiFetch('/api/admin/results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidateNumber, fullName, certificateNumber, examType, examYear, results })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          if (adminMessage) {
            adminMessage.textContent = data.message || 'Result upload failed.';
            adminMessage.classList.remove('success');
          }
          return;
        }

        if (adminMessage) {
          adminMessage.textContent = data.message || 'WAEC result uploaded successfully.';
          adminMessage.classList.add('success');
        }

        adminForm.reset();
        resultRows.innerHTML = '';
        addResultRow();
      } catch (error) {
        if (adminMessage) {
          adminMessage.textContent = 'Unable to connect to the backend. Please try again.';
          adminMessage.classList.remove('success');
        }
      }
    });
  }

  const logoutButton = document.querySelector('.logout-item');
  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      clearSignedInSession();
      window.location.href = 'login.html';
    });
  }
});
