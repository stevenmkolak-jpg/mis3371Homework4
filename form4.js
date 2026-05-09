/*
  Program name: form4.js
  Author: STEVEN KOLAK
  Date created: 5/8/26
  Date last edited: 5/8/26
  Version: 4.0
  Description: External JavaScript for ClearPath Medical Patient Registration Form (HW4).
               Extends form3.js. Adds:
               1. Fetch API — loads states dropdown from states.json (try/catch)
               2. Cookie functions — setCookie, getCookie, deleteCookie
               3. Cookie welcome message — greets returning user by first name
               4. "Not me" checkbox — expires cookie and clears local storage
               5. Local Storage — saves all non-secure fields on blur/change
               6. Local Storage restore — pre-fills form if returning user
               7. Remember Me checkbox — controls whether data is saved or cleared
               8. On submit — saves/clears cookie + localStorage per Remember Me
*/

/* ============================================================
   COOKIE UTILITIES
   ============================================================ */

/**
 * setCookie — sets a cookie with a name, value, and expiry in hours
 */
function setCookie(name, value, hours) {
    const expires = new Date(Date.now() + hours * 60 * 60 * 1000).toUTCString();
    document.cookie = name + '=' + encodeURIComponent(value) +
                      '; expires=' + expires + '; path=/; SameSite=Lax';
}

/**
 * getCookie — returns the value of a named cookie, or null if not found
 */
function getCookie(name) {
    const prefix = name + '=';
    const cookies = document.cookie.split(';');
    for (let c of cookies) {
        c = c.trim();
        if (c.startsWith(prefix)) {
            return decodeURIComponent(c.substring(prefix.length));
        }
    }
    return null;
}

/**
 * deleteCookie — expires a cookie immediately
 */
function deleteCookie(name) {
    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax';
}

/* ============================================================
   LOCAL STORAGE UTILITIES
   ============================================================ */

/**
 * saveField — saves a single field value to localStorage
 * Key format: cp_<fieldId>
 */
function saveField(fieldId) {
    const el = document.getElementById(fieldId);
    if (!el) return;
    localStorage.setItem('cp_' + fieldId, el.value);
}

/**
 * saveCheckboxGroup — saves checked values for a named checkbox group
 */
function saveCheckboxGroup(name) {
    const checked = Array.from(document.querySelectorAll('input[name="' + name + '"]:checked'))
                         .map(cb => cb.value);
    localStorage.setItem('cp_' + name, JSON.stringify(checked));
}

/**
 * saveRadioGroup — saves selected radio value
 */
function saveRadioGroup(name) {
    const selected = document.querySelector('input[name="' + name + '"]:checked');
    localStorage.setItem('cp_' + name, selected ? selected.value : '');
}

/**
 * saveAllFields — saves every non-secure field to localStorage
 */
function saveAllFields() {
    const textFields = ['fname','mi','lname','dob','userid','email','phone',
                        'addr1','addr2','city','zip','health','symptoms'];
    textFields.forEach(saveField);
    saveCheckboxGroup('history');
    saveRadioGroup('gender');
    saveRadioGroup('vaccinated');
    saveRadioGroup('insurance');
}

/**
 * restoreAllFields — reads localStorage and pre-fills every non-secure field
 */
function restoreAllFields() {
    const textFields = ['fname','mi','lname','dob','userid','email','phone',
                        'addr1','addr2','city','zip','health','symptoms'];
    textFields.forEach(function(id) {
        const saved = localStorage.getItem('cp_' + id);
        if (saved !== null) {
            const el = document.getElementById(id);
            if (el) el.value = saved;
        }
    });

    // Health slider display
    const healthEl = document.getElementById('health');
    if (healthEl) updateHealthDisplay(healthEl.value);

    // Checkboxes
    const historyRaw = localStorage.getItem('cp_history');
    if (historyRaw) {
        try {
            const vals = JSON.parse(historyRaw);
            document.querySelectorAll('input[name="history"]').forEach(function(cb) {
                cb.checked = vals.includes(cb.value);
            });
        } catch(e) {}
    }

    // Radio groups
    ['gender','vaccinated','insurance'].forEach(function(name) {
        const val = localStorage.getItem('cp_' + name);
        if (val) {
            const radio = document.querySelector('input[name="' + name + '"][value="' + val + '"]');
            if (radio) radio.checked = true;
        }
    });

    // Restore state dropdown selection
    const savedState = localStorage.getItem('cp_state');
    if (savedState) {
        const stateEl = document.getElementById('state');
        if (stateEl) stateEl.value = savedState;
    }
}

/**
 * clearAllLocalStorage — removes all cp_ keys from localStorage
 */
function clearAllLocalStorage() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('cp_'));
    keys.forEach(k => localStorage.removeItem(k));
}

/* ============================================================
   FETCH API — Load states from states.json
   ============================================================ */
async function loadStates() {
    const stateSelect = document.getElementById('state');
    try {
        const response = await fetch('states.json');
        if (!response.ok) throw new Error('Network response was not ok: ' + response.status);
        const states = await response.json();

        // Clear loading option
        stateSelect.innerHTML = '<option value="">-- Select --</option>';

        // Populate dropdown
        states.forEach(function(s) {
            const opt = document.createElement('option');
            opt.value = s.abbr;
            opt.textContent = s.name;
            stateSelect.appendChild(opt);
        });

        // After states loaded, restore saved state if any
        const savedState = localStorage.getItem('cp_state');
        if (savedState) stateSelect.value = savedState;

    } catch (err) {
        console.error('Fetch error loading states:', err);
        // Fallback: show error in dropdown and a few hardcoded options
        stateSelect.innerHTML = `
            <option value="">-- Select (load failed) --</option>
            <option value="TX">Texas</option>
            <option value="CA">California</option>
            <option value="NY">New York</option>
            <option value="FL">Florida</option>`;
    }
}

/* ============================================================
   COOKIE WELCOME MESSAGE
   Checks for the 'cp_fname' cookie.
   If found: greets user by name, shows "Not me" checkbox.
   If not found: shows "Welcome, New User".
   ============================================================ */
function initCookieWelcome() {
    const savedName = getCookie('cp_fname');
    const welcomeEl = document.getElementById('welcome-msg');
    const newUserBox = document.getElementById('new-user-box');
    const notMeNameEl = document.getElementById('not-me-name');

    if (savedName) {
        // Returning user
        welcomeEl.textContent = 'Welcome back, ' + savedName + '!';
        newUserBox.style.display = 'block';
        if (notMeNameEl) notMeNameEl.textContent = savedName;

        // Restore saved form data
        restoreAllFields();
    } else {
        // First time visitor
        welcomeEl.textContent = 'Welcome, New User!';
        newUserBox.style.display = 'none';
    }
}

/**
 * handleNotMe — called when user checks "Not [name]? Start as new user"
 * Expires the cookie, clears localStorage, resets the form.
 */
function handleNotMe() {
    const chk = document.getElementById('chk-not-me');
    if (chk && chk.checked) {
        deleteCookie('cp_fname');
        clearAllLocalStorage();
        document.getElementById('reg-form').reset();
        handleReset();
        document.getElementById('welcome-msg').textContent = 'Welcome, New User!';
        document.getElementById('new-user-box').style.display = 'none';
    }
}

/* ============================================================
   UTILITY: showError / clearError
   ============================================================ */
function showError(fieldId, message) {
    const span = document.getElementById('err-' + fieldId);
    if (span) {
        span.textContent = '⚠ ' + message;
        span.classList.add('active');
    }
}

function clearError(fieldId) {
    const span = document.getElementById('err-' + fieldId);
    if (span) {
        span.textContent = '\u00A0';
        span.classList.remove('active');
    }
}

function hasError(fieldId) {
    const span = document.getElementById('err-' + fieldId);
    return span && span.classList.contains('active');
}

/* ============================================================
   UTILITY: calculateDateBounds
   ============================================================ */
function calculateDateBounds() {
    const today = new Date();
    const maxDate = today.toISOString().split('T')[0];
    const minDate = new Date(today);
    minDate.setFullYear(today.getFullYear() - 120);
    const minDateStr = minDate.toISOString().split('T')[0];
    const dobInput = document.getElementById('dob');
    if (dobInput) {
        dobInput.setAttribute('min', minDateStr);
        dobInput.setAttribute('max', maxDate);
    }
}

/* ============================================================
   ALL VALIDATION FUNCTIONS (same as HW3)
   ============================================================ */
function validateFirstName() {
    const val = document.getElementById('fname').value.trim();
    if (!val) { showError('fname', 'First name is required.'); return false; }
    if (!/^[A-Za-z'\-]{1,30}$/.test(val)) {
        showError('fname', 'Letters, apostrophes, and dashes only (1–30 chars).');
        return false;
    }
    clearError('fname');
    return true;
}

function validateMiddleInitial() {
    const val = document.getElementById('mi').value.trim();
    if (val === '') { clearError('mi'); return true; }
    if (!/^[A-Za-z]$/.test(val)) { showError('mi', 'One letter only, no numbers.'); return false; }
    clearError('mi');
    return true;
}

function validateLastName() {
    const val = document.getElementById('lname').value.trim();
    if (!val) { showError('lname', 'Last name is required.'); return false; }
    if (!/^[A-Za-z'\-]{1,30}$/.test(val)) {
        showError('lname', 'Letters, apostrophes, and dashes only (1–30 chars).');
        return false;
    }
    clearError('lname');
    return true;
}

function validateDOB() {
    const val = document.getElementById('dob').value;
    if (!val) { showError('dob', 'Date of birth is required.'); return false; }
    const dob = new Date(val);
    if (isNaN(dob.getTime())) { showError('dob', 'Enter a valid date.'); return false; }
    const today = new Date(); today.setHours(0,0,0,0);
    if (dob > today) { showError('dob', 'Date of birth cannot be in the future.'); return false; }
    const minDate = new Date(); minDate.setFullYear(minDate.getFullYear() - 120);
    if (dob < minDate) { showError('dob', 'Date cannot be more than 120 years ago.'); return false; }
    clearError('dob');
    return true;
}

function autoFormatSSN() {
    const field = document.getElementById('ssn');
    let digits = field.value.replace(/\D/g, '').substring(0, 9);
    field.dataset.raw = digits;
    let formatted = digits;
    if (digits.length > 5) {
        formatted = digits.substring(0,3) + '-' + digits.substring(3,5) + '-' + digits.substring(5);
    } else if (digits.length > 3) {
        formatted = digits.substring(0,3) + '-' + digits.substring(3);
    }
    field.value = formatted;
    validateSSN();
}

function validateSSN() {
    const val = document.getElementById('ssn').value.trim();
    if (val === '') { clearError('ssn'); return true; }
    if (!/^\d{3}-\d{2}-\d{4}$/.test(val)) {
        showError('ssn', 'Must be 9 digits in format ###-##-####.');
        return false;
    }
    clearError('ssn');
    return true;
}

function validateUserID() {
    const field = document.getElementById('userid');
    const val = field.value.trim();
    if (!val) { showError('userid', 'User ID is required.'); return false; }
    if (/^\d/.test(val)) { showError('userid', 'Must start with a letter, not a number.'); return false; }
    if (/\s/.test(val)) { showError('userid', 'No spaces allowed in User ID.'); return false; }
    if (val.length < 5) { showError('userid', 'User ID must be at least 5 characters.'); return false; }
    if (val.length > 20) { showError('userid', 'User ID cannot exceed 20 characters.'); return false; }
    if (!/^[A-Za-z][A-Za-z0-9_\-]{4,19}$/.test(val)) {
        showError('userid', 'Only letters, numbers, underscores, and dashes allowed.');
        return false;
    }
    field.value = val.toLowerCase();
    clearError('userid');
    const pwdVal = document.getElementById('pwd').value;
    if (pwdVal) validatePassword();
    return true;
}

function validatePassword() {
    const field = document.getElementById('pwd');
    const val = field.value;
    const userid = document.getElementById('userid').value.toLowerCase();
    if (!val) { showError('pwd', 'Password is required.'); updateStrengthBar(''); return false; }
    if (val.length < 8) { showError('pwd', 'Password must be at least 8 characters.'); updateStrengthBar(val); return false; }
    if (val.length > 30) { showError('pwd', 'Password cannot exceed 30 characters.'); updateStrengthBar(val); return false; }
    if (!/[A-Z]/.test(val)) { showError('pwd', 'Must contain at least 1 uppercase letter.'); updateStrengthBar(val); return false; }
    if (!/[a-z]/.test(val)) { showError('pwd', 'Must contain at least 1 lowercase letter.'); updateStrengthBar(val); return false; }
    if (!/\d/.test(val))    { showError('pwd', 'Must contain at least 1 number.'); updateStrengthBar(val); return false; }
    if (userid && val.toLowerCase().includes(userid)) {
        showError('pwd', 'Password cannot contain your User ID.');
        updateStrengthBar(val); return false;
    }
    clearError('pwd');
    updateStrengthBar(val);
    if (document.getElementById('pwd2').value) validatePasswordMatch();
    return true;
}

function updateStrengthBar(val) {
    const bar = document.getElementById('pwd-strength');
    if (!bar) return;
    if (!val) { bar.textContent = ''; bar.className = 'pwd-strength'; return; }
    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[a-z]/.test(val)) score++;
    if (/\d/.test(val)) score++;
    if (/[!@#$%^&*()\-_+=\/><.,`~]/.test(val)) score++;
    if (score <= 2)      { bar.textContent = 'Strength: Weak';   bar.className = 'pwd-strength weak'; }
    else if (score <= 3) { bar.textContent = 'Strength: Fair';   bar.className = 'pwd-strength fair'; }
    else                 { bar.textContent = 'Strength: Strong'; bar.className = 'pwd-strength strong'; }
}

function validatePasswordMatch() {
    const pwd  = document.getElementById('pwd').value;
    const pwd2 = document.getElementById('pwd2').value;
    if (!pwd2) { showError('pwd2', 'Please re-enter your password.'); return false; }
    if (pwd !== pwd2) { showError('pwd2', 'Passwords do not match.'); return false; }
    clearError('pwd2');
    return true;
}

function validateEmail() {
    const field = document.getElementById('email');
    field.value = field.value.toLowerCase();
    const val = field.value.trim();
    if (!val) { showError('email', 'Email address is required.'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val)) {
        showError('email', 'Enter a valid email: name@domain.tld');
        return false;
    }
    clearError('email');
    return true;
}

function autoFormatPhone() {
    const field = document.getElementById('phone');
    const digits = field.value.replace(/\D/g, '').substring(0, 10);
    let formatted = digits;
    if (digits.length > 6) {
        formatted = '(' + digits.substring(0,3) + ') ' + digits.substring(3,6) + '-' + digits.substring(6);
    } else if (digits.length > 3) {
        formatted = '(' + digits.substring(0,3) + ') ' + digits.substring(3);
    } else if (digits.length > 0) {
        formatted = '(' + digits;
    }
    field.value = formatted;
    if (digits.length === 10) validatePhone();
    else if (digits.length > 0) showError('phone', 'Enter all 10 digits: (xxx) xxx-xxxx');
    else clearError('phone');
}

function validatePhone() {
    const val = document.getElementById('phone').value.trim();
    if (val === '') { clearError('phone'); return true; }
    if (!/^\(\d{3}\)\s\d{3}-\d{4}$/.test(val)) {
        showError('phone', 'Format must be (xxx) xxx-xxxx');
        return false;
    }
    clearError('phone');
    return true;
}

function validateAddress1() {
    const val = document.getElementById('addr1').value.trim();
    if (!val) { showError('addr1', 'Address Line 1 is required.'); return false; }
    if (val.length < 2 || val.length > 30) { showError('addr1', 'Must be 2–30 characters.'); return false; }
    clearError('addr1');
    return true;
}

function validateAddress2() {
    const val = document.getElementById('addr2').value.trim();
    if (val === '') { clearError('addr2'); return true; }
    if (val.length < 2 || val.length > 30) { showError('addr2', 'If entered, must be 2–30 characters.'); return false; }
    clearError('addr2');
    return true;
}

function validateCity() {
    const val = document.getElementById('city').value.trim();
    if (!val) { showError('city', 'City is required.'); return false; }
    if (val.length < 2 || val.length > 30) { showError('city', 'City must be 2–30 characters.'); return false; }
    clearError('city');
    return true;
}

function validateState() {
    const field = document.getElementById('state');
    if (!field.value) { showError('state', 'Please select a state.'); return false; }
    clearError('state');
    return true;
}

function validateZip() {
    const field = document.getElementById('zip');
    const val = field.value.trim();
    if (!val) { showError('zip', 'Zip code is required.'); return false; }
    if (!/^\d{5}(-\d{4})?$/.test(val)) {
        showError('zip', 'Enter a valid 5-digit zip (e.g. 77002).');
        return false;
    }
    field.value = val.substring(0, 5);
    clearError('zip');
    return true;
}

function validateSymptoms() {
    const val = document.getElementById('symptoms').value.trim();
    if (val === '') { clearError('symptoms'); return true; }
    if (/<|>|"/.test(val)) {
        showError('symptoms', 'Do not use HTML tags (<>) or double quotes (").');
        return false;
    }
    clearError('symptoms');
    return true;
}

function updateHealthDisplay(value) {
    const display = document.getElementById('health-val');
    if (display) display.textContent = value;
}

/* ============================================================
   VALIDATE ALL
   ============================================================ */
function validateAll() {
    const results = [
        validateFirstName(), validateMiddleInitial(), validateLastName(),
        validateDOB(), validateSSN(), validateUserID(),
        validatePassword(), validatePasswordMatch(), validateEmail(),
        validatePhone(), validateAddress1(), validateAddress2(),
        validateCity(), validateState(), validateZip(), validateSymptoms()
    ];

    const allValid = results.every(r => r === true);
    const submitBtn = document.getElementById('btn-submit');
    const summaryRow = document.getElementById('error-summary-row');
    const summary = document.getElementById('error-summary');

    if (allValid) {
        submitBtn.style.display = 'inline-block';
        summaryRow.style.display = 'none';
        summary.textContent = '';
    } else {
        submitBtn.style.display = 'none';
        const errCount = results.filter(r => r === false).length;
        summaryRow.style.display = '';
        summary.innerHTML = '<span class="err-summary-msg">⚠ ' + errCount +
            ' field(s) need attention. Please correct the highlighted errors above.</span>';
    }
    return allValid;
}

/* ============================================================
   REVIEW PANEL
   ============================================================ */
function showReview() {
    if (!validateAll()) {
        alert('Please fix the highlighted errors before reviewing.');
        return;
    }

    const fname   = document.getElementById('fname').value.trim();
    const mi      = document.getElementById('mi').value.trim();
    const lname   = document.getElementById('lname').value.trim();
    const dob     = document.getElementById('dob').value;
    const ssnRaw  = document.getElementById('ssn').value;
    const ssn     = ssnRaw ? '***-**-' + ssnRaw.slice(-4) : 'Not provided';
    const userid  = document.getElementById('userid').value;
    const email   = document.getElementById('email').value.trim();
    const phone   = document.getElementById('phone').value.trim() || 'Not provided';
    const addr1   = document.getElementById('addr1').value.trim();
    const addr2   = document.getElementById('addr2').value.trim();
    const city    = document.getElementById('city').value.trim();
    const stateEl = document.getElementById('state');
    const state   = stateEl.options[stateEl.selectedIndex].text;
    const zip     = document.getElementById('zip').value.trim();
    const health  = document.getElementById('health').value;
    const symptoms= document.getElementById('symptoms').value.trim() || 'None provided';

    const checkboxes  = document.querySelectorAll('input[name="history"]:checked');
    const historyList = checkboxes.length > 0
        ? Array.from(checkboxes).map(cb => cb.nextSibling.textContent.trim()).join(', ')
        : 'None selected';

    const genderEl     = document.querySelector('input[name="gender"]:checked');
    const vaccinatedEl = document.querySelector('input[name="vaccinated"]:checked');
    const insuranceEl  = document.querySelector('input[name="insurance"]:checked');
    const gender     = genderEl     ? genderEl.value     : 'Not selected';
    const vaccinated = vaccinatedEl ? vaccinatedEl.value : 'Not selected';
    const insurance  = insuranceEl  ? insuranceEl.value  : 'Not selected';
    const fullName   = fname + (mi ? ' ' + mi + '.' : '') + ' ' + lname;

    const warn = (v, label) =>
        v === 'Not provided' || v === 'Not selected'
            ? `<td class="review-status warn">— ${label}</td>`
            : `<td class="review-status pass">✔ OK</td>`;

    const reviewHTML = `
        <h2>📋 Please Review Your Information</h2>
        <p class="review-subtitle">Verify your details below before submitting.</p>
        <table class="review-table">
            <tr class="review-section-header"><td colspan="3">Personal Information</td></tr>
            <tr><td class="review-label">Full Name</td><td class="review-value">${fullName}</td><td class="review-status pass">✔ OK</td></tr>
            <tr><td class="review-label">Date of Birth</td><td class="review-value">${dob}</td><td class="review-status pass">✔ OK</td></tr>
            <tr><td class="review-label">SSN (masked)</td><td class="review-value">${ssn}</td>${warn(ssn,'Not provided')}</tr>
            <tr><td class="review-label">User ID</td><td class="review-value">${userid}</td><td class="review-status pass">✔ OK</td></tr>
            <tr><td class="review-label">Password</td><td class="review-value">••••••••</td><td class="review-status pass">✔ OK</td></tr>
            <tr class="review-section-header"><td colspan="3">Contact Information</td></tr>
            <tr><td class="review-label">Email</td><td class="review-value">${email}</td><td class="review-status pass">✔ OK</td></tr>
            <tr><td class="review-label">Phone</td><td class="review-value">${phone}</td>${warn(phone,'Not provided')}</tr>
            <tr class="review-section-header"><td colspan="3">Address</td></tr>
            <tr><td class="review-label">Address</td><td class="review-value">${addr1}${addr2 ? '<br>'+addr2 : ''}<br>${city}, ${state} ${zip}</td><td class="review-status pass">✔ OK</td></tr>
            <tr class="review-section-header"><td colspan="3">Medical History &amp; Preferences</td></tr>
            <tr><td class="review-label">Medical History</td><td class="review-value">${historyList}</td><td class="review-status pass">✔ OK</td></tr>
            <tr><td class="review-label">Gender</td><td class="review-value">${gender}</td>${warn(gender,'Not selected')}</tr>
            <tr><td class="review-label">Vaccinated?</td><td class="review-value">${vaccinated}</td>${warn(vaccinated,'Not selected')}</tr>
            <tr><td class="review-label">Has Insurance?</td><td class="review-value">${insurance}</td>${warn(insurance,'Not selected')}</tr>
            <tr><td class="review-label">Overall Health</td><td class="review-value">${health} / 10</td><td class="review-status pass">✔ OK</td></tr>
            <tr><td class="review-label">Symptoms / Notes</td><td class="review-value">${symptoms}</td><td class="review-status pass">✔ OK</td></tr>
        </table>
        <div style="text-align:center; margin-top:24px;">
            <button type="button" onclick="document.getElementById('review-panel').style.display='none'"
                    style="background:#5d6d7e;color:#fff;padding:10px 28px;border-radius:5px;border:none;cursor:pointer;font-size:14px;margin-right:12px;">
                ← Go Back &amp; Edit
            </button>
            <button type="submit" form="reg-form"
                    style="background:#1a5276;color:#fff;padding:10px 28px;border-radius:5px;border:none;cursor:pointer;font-size:14px;">
                ✔ Confirm &amp; Submit
            </button>
        </div>`;

    const panel = document.getElementById('review-panel');
    panel.innerHTML = reviewHTML;
    panel.style.display = 'block';
    panel.scrollIntoView({ behavior: 'smooth' });
}

/* ============================================================
   RESET HANDLER
   ============================================================ */
function handleReset() {
    document.getElementById('btn-submit').style.display = 'none';
    document.getElementById('review-panel').style.display = 'none';
    document.getElementById('error-summary-row').style.display = 'none';
    document.querySelectorAll('.err').forEach(el => {
        el.textContent = '\u00A0';
        el.classList.remove('active');
    });
    const bar = document.getElementById('pwd-strength');
    if (bar) { bar.textContent = ''; bar.className = 'pwd-strength'; }
    document.getElementById('health-val').textContent = '5';
}

/* ============================================================
   SUBMIT HANDLER — save or clear cookie + localStorage
   based on "Remember Me" checkbox state
   ============================================================ */
function handleSubmit() {
    const rememberMe = document.getElementById('chk-remember').checked;
    const fname = document.getElementById('fname').value.trim();

    if (rememberMe && fname) {
        // Save first name cookie for 48 hours
        setCookie('cp_fname', fname, 48);
        // Save all non-secure fields to localStorage
        saveAllFields();
    } else {
        // User unchecked Remember Me — expire cookie and clear local storage
        deleteCookie('cp_fname');
        clearAllLocalStorage();
    }
    // Allow form to submit normally
    return true;
}

/* ============================================================
   INIT — wire up all event listeners
   ============================================================ */
function initForm() {
    calculateDateBounds();

    // Load states via Fetch API
    loadStates();

    // Initialize cookie welcome message
    initCookieWelcome();

    // Date display in banner
    const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const months = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];
    const now    = new Date();
    const dateEl = document.getElementById('today-date');
    if (dateEl) {
        dateEl.textContent = 'Today is: ' + days[now.getDay()] + ', ' +
            months[now.getMonth()] + ' ' + now.getDate() + ', ' + now.getFullYear();
    }

    // ---- Name fields ----
    document.getElementById('fname').addEventListener('blur', function() {
        validateFirstName(); saveField('fname');
    });
    document.getElementById('fname').addEventListener('input', validateFirstName);

    document.getElementById('mi').addEventListener('blur', function() {
        validateMiddleInitial(); saveField('mi');
    });
    document.getElementById('mi').addEventListener('input', validateMiddleInitial);

    document.getElementById('lname').addEventListener('blur', function() {
        validateLastName(); saveField('lname');
    });
    document.getElementById('lname').addEventListener('input', validateLastName);

    // ---- DOB ----
    document.getElementById('dob').addEventListener('change', function() {
        validateDOB(); saveField('dob');
    });
    document.getElementById('dob').addEventListener('blur', validateDOB);

    // ---- SSN (NOT saved to localStorage — it's sensitive) ----
    document.getElementById('ssn').addEventListener('input', autoFormatSSN);
    document.getElementById('ssn').addEventListener('blur', validateSSN);

    // ---- User ID ----
    document.getElementById('userid').addEventListener('blur', function() {
        validateUserID(); saveField('userid');
    });
    document.getElementById('userid').addEventListener('input', function() {
        if (this.value.length >= 5) validateUserID();
    });

    // ---- Password (NOT saved to localStorage — it's sensitive) ----
    document.getElementById('pwd').addEventListener('input', validatePassword);
    document.getElementById('pwd').addEventListener('blur', validatePassword);
    document.getElementById('pwd2').addEventListener('input', validatePasswordMatch);
    document.getElementById('pwd2').addEventListener('blur', validatePasswordMatch);

    // ---- Email ----
    document.getElementById('email').addEventListener('blur', function() {
        validateEmail(); saveField('email');
    });
    document.getElementById('email').addEventListener('input', function() {
        this.value = this.value.toLowerCase();
    });

    // ---- Phone ----
    document.getElementById('phone').addEventListener('input', autoFormatPhone);
    document.getElementById('phone').addEventListener('blur', function() {
        validatePhone(); saveField('phone');
    });

    // ---- Address ----
    document.getElementById('addr1').addEventListener('blur', function() { validateAddress1(); saveField('addr1'); });
    document.getElementById('addr1').addEventListener('input', validateAddress1);
    document.getElementById('addr2').addEventListener('blur', function() { validateAddress2(); saveField('addr2'); });
    document.getElementById('addr2').addEventListener('input', validateAddress2);
    document.getElementById('city').addEventListener('blur', function() { validateCity(); saveField('city'); });
    document.getElementById('city').addEventListener('input', validateCity);
    document.getElementById('state').addEventListener('change', function() {
        validateState();
        localStorage.setItem('cp_state', this.value);
    });
    document.getElementById('zip').addEventListener('blur', function() { validateZip(); saveField('zip'); });
    document.getElementById('zip').addEventListener('input', function() {
        if (this.value.length >= 5) validateZip();
    });

    // ---- Symptoms ----
    document.getElementById('symptoms').addEventListener('blur', function() {
        validateSymptoms(); saveField('symptoms');
    });
    document.getElementById('symptoms').addEventListener('input', validateSymptoms);

    // ---- Slider ----
    const slider = document.getElementById('health');
    if (slider) {
        slider.addEventListener('input', function() {
            updateHealthDisplay(this.value);
            saveField('health');
        });
        updateHealthDisplay(slider.value);
    }

    // ---- Checkboxes & Radios: save on change ----
    document.querySelectorAll('input[name="history"]').forEach(function(cb) {
        cb.addEventListener('change', function() { saveCheckboxGroup('history'); });
    });
    ['gender','vaccinated','insurance'].forEach(function(name) {
        document.querySelectorAll('input[name="' + name + '"]').forEach(function(r) {
            r.addEventListener('change', function() { saveRadioGroup(name); });
        });
    });

    // ---- Buttons ----
    document.getElementById('btn-validate').addEventListener('click', validateAll);
    document.getElementById('btn-review').addEventListener('click', showReview);
    document.getElementById('btn-reset').addEventListener('click', function() {
        setTimeout(handleReset, 10);
    });

    // ---- Form submit: handle cookie + localStorage before navigating ----
    document.getElementById('reg-form').addEventListener('submit', handleSubmit);
}

document.addEventListener('DOMContentLoaded', initForm);
