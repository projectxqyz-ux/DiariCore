function getQueryParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name) || '';
}

function setError(message) {
    const box = document.getElementById('otpError');
    if (!box) return;
    const text = box.querySelector('.alert__text');
    if (text) text.textContent = message || '';
    if (!message) {
        box.classList.remove('show');
        box.hidden = true;
        return;
    }
    box.hidden = false;
    requestAnimationFrame(() => box.classList.add('show'));
}

function maskEmail(email) {
    const [user, domain] = (email || '').split('@');
    if (!user || !domain) return email;
    const head = user.slice(0, 2);
    const tail = user.slice(-1);
    return `${head}${'*'.repeat(Math.max(1, user.length - 3))}${tail}@${domain}`;
}

document.addEventListener('DOMContentLoaded', () => {
    const email = getQueryParam('email') || sessionStorage.getItem('pendingRegistrationEmail') || '';
    const emailDisplay = document.getElementById('emailDisplay');
    const inputs = Array.from(document.querySelectorAll('.digit'));
    const verifyBtn = document.getElementById('verifyBtn');
    let verifyBtnText = document.getElementById('verifyBtnText');
    let verifyBtnIcon = document.getElementById('verifyBtnIcon');
    const resendBtn = document.getElementById('resendBtn');
    const timerLabel = document.getElementById('timerLabel');
    const errorClose = document.getElementById('otpErrorClose');
    const banner = document.getElementById('topBanner');
    const bannerClose = document.getElementById('bannerCloseBtn');

    if (!email) {
        setError('No pending registration found. Please sign up again.');
        verifyBtn.disabled = true;
        resendBtn.disabled = true;
        return;
    }

    // Top banner like reference project
    if (banner) {
        banner.hidden = false;
        if (bannerClose) {
            bannerClose.addEventListener('click', () => (banner.hidden = true));
        }
    }

    emailDisplay.textContent = maskEmail(email);
    if (errorClose) errorClose.addEventListener('click', () => setError(''));

    let seconds = 10 * 60;
    const renderTimer = () => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        timerLabel.textContent = seconds > 0 ? `Code expires in ${m}:${String(s).padStart(2, '0')}` : 'Code expired. Resend a new one.';
    };
    renderTimer();
    const interval = setInterval(() => {
        seconds -= 1;
        if (seconds <= 0) {
            seconds = 0;
            clearInterval(interval);
        }
        renderTimer();
    }, 1000);

    const code = () => inputs.map(i => i.value).join('');
    let autoVerifyTimeout = null;
    const updateBtn = () => {
        const filled = code().length === 6;
        verifyBtn.disabled = !filled;
        if (filled && !verifyBtn.disabled) {
            if (autoVerifyTimeout) clearTimeout(autoVerifyTimeout);
            autoVerifyTimeout = setTimeout(() => {
                if (!verifyBtn.disabled) verifyBtn.click();
            }, 350);
        }
    };

    const clearErrors = () => {
        setError('');
        inputs.forEach(i => i.classList.remove('error'));
    };

    inputs.forEach((input, idx) => {
        input.addEventListener('input', (e) => {
            const v = (e.target.value || '').replace(/\D/g, '').slice(-1);
            e.target.value = v;
            clearErrors();
            if (v && idx < inputs.length - 1) inputs[idx + 1].focus();
            updateBtn();
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !input.value && idx > 0) inputs[idx - 1].focus();
        });
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const digits = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6).split('');
            inputs.forEach((d, i) => { d.value = digits[i] || ''; });
            clearErrors();
            updateBtn();
        });
    });

    verifyBtn.addEventListener('click', () => {
        const otpCode = code();
        if (otpCode.length !== 6) {
            setError('Please enter the 6-digit code.');
            inputs.forEach(i => i.classList.add('error'));
            return;
        }
        verifyBtn.disabled = true;
        verifyBtn.classList.add('is-loading');
        // refresh references in case markup changed
        verifyBtnText = document.getElementById('verifyBtnText');
        verifyBtnIcon = document.getElementById('verifyBtnIcon');
        if (verifyBtnIcon) verifyBtnIcon.outerHTML = '<span class="spinner" aria-hidden="true"></span>';
        verifyBtnText = document.getElementById('verifyBtnText');
        if (verifyBtnText) verifyBtnText.textContent = 'Verifying...';

        fetch('/api/register/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otpCode })
        })
            .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
            .then(({ ok, data }) => {
                if (!ok || !data.success) {
                    setError(data.error || 'Invalid verification code.');
                    inputs.forEach(i => i.classList.add('error'));
                    verifyBtn.disabled = false;
                    verifyBtn.classList.remove('is-loading');
                    verifyBtn.innerHTML = '<i class="bi bi-check2-circle" id="verifyBtnIcon"></i> <span id="verifyBtnText">Verify Code</span>';
                    return;
                }
                const u = data.user;
                localStorage.setItem('diariCoreUser', JSON.stringify({
                    ...u,
                    isLoggedIn: true,
                    loginTime: new Date().toISOString()
                }));
                sessionStorage.removeItem('pendingRegistrationEmail');
                window.location.href = 'dashboard.html';
            })
            .catch(() => {
                setError('Could not verify right now. Please try again.');
                verifyBtn.disabled = false;
                verifyBtn.classList.remove('is-loading');
                verifyBtn.innerHTML = '<i class="bi bi-check2-circle" id="verifyBtnIcon"></i> <span id="verifyBtnText">Verify Code</span>';
            });
    });

    resendBtn.addEventListener('click', () => {
        if (resendBtn.disabled) return;
        resendBtn.disabled = true;
        resendBtn.textContent = 'Resending...';
        clearErrors();

        fetch('/api/register/resend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        })
            .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
            .then(({ ok, data }) => {
                if (!ok || !data.success) {
                    setError(data.error || 'Failed to resend code.');
                    return;
                }
                seconds = 10 * 60;
                renderTimer();
                inputs.forEach(i => i.value = '');
                inputs[0].focus();
                updateBtn();
            })
            .catch(() => setError('Failed to resend code.'))
            .finally(() => {
                setTimeout(() => {
                    resendBtn.disabled = false;
                    resendBtn.textContent = 'Resend Code';
                }, 900);
            });
    });

    inputs[0]?.focus();
    updateBtn();
});

