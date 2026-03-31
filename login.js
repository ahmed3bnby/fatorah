document.addEventListener('DOMContentLoaded', () => {
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('login-btn');
    const errorMsg = document.getElementById('error-msg');

    const VALID_PASSWORD = 'zad2026';

    function attemptLogin() {
        if (passwordInput.value === VALID_PASSWORD) {
            localStorage.setItem('zad_auth_session', 'true');
            window.location.href = 'index.html';
        } else {
            errorMsg.style.display = 'block';
            passwordInput.style.borderColor = 'var(--error)';
            passwordInput.value = '';
            passwordInput.focus();
        }
    }

    loginBtn.addEventListener('click', attemptLogin);

    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            attemptLogin();
        }
    });

    // Reset error on type
    passwordInput.addEventListener('input', () => {
        errorMsg.style.display = 'none';
        passwordInput.style.borderColor = '#E0E0E0';
    });
});
