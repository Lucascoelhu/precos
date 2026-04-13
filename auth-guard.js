// auth-guard.js — Proteção de sessão para páginas protegidas
// Inclua este script em preco-cheio.html, preco-oferta.html e index.html

(async function() {
    // Import dinâmico do Firebase
    const { initializeApp, getApps } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js");
    const { getDatabase, ref, get, update } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");

    const firebaseConfig = {
        apiKey: "AIzaSyA8XOjs8PKFx7DvI-Xthxwra2AOLMjIhVU",
        authDomain: "etiquetas-55290.firebaseapp.com",
        databaseURL: "https://etiquetas-55290-default-rtdb.firebaseio.com",
        projectId: "etiquetas-55290",
        storageBucket: "etiquetas-55290.firebasestorage.app",
        messagingSenderId: "776336919037",
        appId: "1:776336919037:web:1374f4018fc44c388e3194"
    };

    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    const db = getDatabase(app);

    function emailToKey(email) {
        return email.toLowerCase().replace(/\./g, '_dot_').replace(/@/g, '_at_');
    }

    function getSession() {
        try { return JSON.parse(sessionStorage.getItem('mega_session')); } catch(e) { return null; }
    }

    function clearSession() {
        sessionStorage.removeItem('mega_session');
    }

    function redirectToLogin() {
        clearSession();
        window.location.href = 'login.html';
    }

    // Mostrar loading até verificação
    const loadingEl = document.getElementById('auth-loading');

    const session = getSession();
    if (!session || !session.email || !session.token) {
        redirectToLogin();
        return;
    }

    try {
        const emailKey = emailToKey(session.email);
        const snap = await get(ref(db, `usuarios/${emailKey}`));

        if (!snap.exists()) { redirectToLogin(); return; }

        const user = snap.val();

        if (user.status !== 'ativo') {
            alert('Seu acesso foi bloqueado. Contate o administrador.');
            redirectToLogin();
            return;
        }

        if (user.token !== session.token) { redirectToLogin(); return; }

        if (user.expiracao <= Date.now()) {
            alert('Seu token expirou. Contate o administrador para renovar.');
            redirectToLogin();
            return;
        }

        // Sessão válida — registrar acesso
        await update(ref(db, `usuarios/${emailKey}`), { ultimo_acesso: Date.now() });

        // Expor info do usuário globalmente
        window.megaUser = { email: session.email, nome: user.nome || session.email, expiracao: user.expiracao };

        // Atualizar UI se houver elementos de nome/email
        const nomeEl = document.getElementById('user-nome');
        const emailEl = document.getElementById('user-email');
        if (nomeEl) nomeEl.textContent = user.nome || session.email;
        if (emailEl) emailEl.textContent = session.email;

        // Remover loading
        if (loadingEl) loadingEl.style.display = 'none';
        const mainEl = document.getElementById('main-content');
        if (mainEl) mainEl.style.display = '';

        // Monitorar status em tempo real
        const { onValue } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
        onValue(ref(db, `usuarios/${emailKey}/status`), (snap) => {
            const status = snap.val();
            if (status === 'bloqueado') {
                clearSession();
                alert('Seu acesso foi bloqueado pelo administrador.');
                window.location.href = 'login.html';
            }
        });

        onValue(ref(db, `usuarios/${emailKey}/expiracao`), (snap) => {
            const exp = snap.val();
            if (exp && exp <= Date.now()) {
                clearSession();
                alert('Seu token foi expirado pelo administrador.');
                window.location.href = 'login.html';
            }
        });

    } catch(e) {
        console.error('Erro na verificação de auth:', e);
        if (loadingEl) loadingEl.style.display = 'none';
        const mainEl = document.getElementById('main-content');
        if (mainEl) mainEl.style.display = '';
    }
})();
