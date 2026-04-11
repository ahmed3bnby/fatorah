document.addEventListener('DOMContentLoaded', () => {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('login-btn');
    const errorMsg = document.getElementById('error-msg');

    // Check if already logged in
    auth.onAuthStateChanged(user => {
        if (user) {
            window.location.href = 'index.html';
        }
    });

    const ATTEMPTS_KEY = 'zad_login_attempts';
    const LOCKOUT_KEY = 'zad_lockout_until';

    function checkLockout() {
        const lockoutUntil = localStorage.getItem(LOCKOUT_KEY);
        if (lockoutUntil) {
            const remaining = parseInt(lockoutUntil) - Date.now();
            if (remaining > 0) {
                const minutes = Math.ceil(remaining / (60 * 1000));
                showError('auth/too-many-requests', `Locked out for ${minutes} mins.`);
                errorMsg.textContent = `لقد استنفدت محاولاتك. يرجى المحاولة بعد ${minutes} دقائق.`;
                loginBtn.disabled = true;
                setTimeout(() => {
                    loginBtn.disabled = false;
                    errorMsg.style.display = 'none';
                }, remaining);
                return true;
            }
        }
        return false;
    }

    // Initial check
    checkLockout();

    function showError(code, rawMessage) {
        let msg = "تأكد من البيانات المدخلة وحاول مرة أخرى.";
        
        switch (code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-login-credentials':
                msg = "تأكد من البريد الإلكتروني أو كلمة المرور.";
                break;
            case 'auth/invalid-email':
                msg = "البريد الإلكتروني المدخل غير صالح.";
                break;
            case 'auth/too-many-requests':
                msg = "لقد حاولت كثيراً. الرجاء المحاولة لاحقاً.";
                break;
        }

        errorMsg.textContent = msg;
        errorMsg.style.display = 'block';
        passwordInput.style.borderColor = 'var(--error)';
        emailInput.style.borderColor = 'var(--error)';
        console.error("Firebase Auth Error:", code, rawMessage);
    }

    loginBtn.addEventListener('click', () => {
        if (checkLockout()) return;

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            showError("", "Please enter email and password.");
            errorMsg.textContent = "يرجى إدخال البريد الإلكتروني وكلمة المرور.";
            return;
        }

        loginBtn.textContent = 'Logging in...';
        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Success: reset attempts
                localStorage.removeItem(ATTEMPTS_KEY);
                localStorage.removeItem(LOCKOUT_KEY);
            })
            .catch((error) => {
                // Fail: increment attempts
                let attempts = parseInt(localStorage.getItem(ATTEMPTS_KEY) || '0');
                attempts++;
                localStorage.setItem(ATTEMPTS_KEY, attempts.toString());

                if (attempts >= 5) {
                    const lockoutTime = Date.now() + 5 * 60 * 1000;
                    localStorage.setItem(LOCKOUT_KEY, lockoutTime.toString());
                    checkLockout();
                } else {
                    showError(error.code, error.message);
                }
                
                loginBtn.textContent = 'Access Dashboard';
            });
    });

    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loginBtn.click();
        }
    });

    // Reset error on type
    const resetError = () => {
        if (loginBtn.disabled) return;
        errorMsg.style.display = 'none';
        passwordInput.style.borderColor = '#E0E0E0';
        emailInput.style.borderColor = '#E0E0E0';
    };
    passwordInput.addEventListener('input', resetError);
    emailInput.addEventListener('input', resetError);
});
