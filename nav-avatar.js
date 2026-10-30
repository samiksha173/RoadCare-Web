/* =========================================================
   RoadCare - nav-avatar.js  (navbar avatar + dropdown, citizen pages)
   - Shows the avatar / name / email ONLY when a citizen is signed in;
     otherwise shows the "Login" link instead.
   - Profile and Settings pages send you to login if you're signed out.
   - Sign out ends the session but KEEPS saved accounts and reports
     (it used to wipe all browser storage, deleting the account).
   ========================================================= */
(function () {
  const menu     = document.getElementById('userMenu');
  const btn      = document.getElementById('avatarBtn');
  const dropdown = document.getElementById('avatarDropdown');
  const signOut  = document.getElementById('signOutBtn');
  if (!menu || !btn || !dropdown) {
    console.error('nav-avatar.js: could not find #userMenu / #avatarBtn / #avatarDropdown in this page.');
    return;
  }

  const loginLinks = document.querySelectorAll('.nav-links a[href$="ogin.html"], #loginLink');
  const NEEDS_LOGIN = /\/(profile|settings)\.html$/i.test(location.pathname);

  /* ---------- open / close ---------- */
  function setOpen(open) {
    dropdown.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
  }
  const isOpen = () => !dropdown.hidden;

  btn.addEventListener('click', (e) => { e.stopPropagation(); setOpen(!isOpen()); });
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(!isOpen()); }
  });
  document.addEventListener('click', (e) => { if (!menu.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { setOpen(false); btn.focus(); } });

  /* ---------- show the right thing for logged in / logged out ---------- */
  function showLoggedIn(user) {
    const name  = document.getElementById('ddName');
    const email = document.getElementById('ddEmail');
    const img   = document.getElementById('navAvatarImg');
    if (name)  name.textContent  = user.name  || 'User';
    if (email) email.textContent = user.email || '';
    if (img && user.avatar) img.src = user.avatar;
    menu.style.display = 'inline-block';
    loginLinks.forEach((a) => { const li = a.closest('li') || a; li.style.display = 'none'; });
  }

  function showLoggedOut() {
    menu.style.display = 'none';
    loginLinks.forEach((a) => { const li = a.closest('li') || a; li.style.display = ''; });
    if (NEEDS_LOGIN) {
      window.location.replace('login.html?next=' + encodeURIComponent(location.pathname.split('/').pop()));
    }
  }

  const readJSON = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const localLoggedIn = () =>
    localStorage.getItem('roadcareLoggedIn') === 'true' || sessionStorage.getItem('roadcareLoggedIn') === 'true';

  /* ---------- who is signed in? ask the server; fall back to this browser ---------- */
  async function loadUser() {
    // hide until we know, so a logged-out visitor never sees a fake "User" avatar
    menu.style.display = 'none';

    let server = null;
    try {
      const res = await fetch('/api/me', { credentials: 'same-origin' });
      const type = res.headers.get('content-type') || '';
      if (type.includes('application/json')) server = { ok: res.ok, data: await res.json() };
    } catch (err) { /* no server running */ }

    let user = null;
    if (server) {
      if (server.ok && server.data.ok) {
        user = server.data;
      } else {
        // server is running and says "not logged in": drop any stale marker
        localStorage.removeItem('roadcareLoggedIn');
        sessionStorage.removeItem('roadcareLoggedIn');
      }
    } else if (localLoggedIn()) {
      user = {};
    }

    if (!user) return showLoggedOut();

    // profile edits (photo, city...) are saved locally; they win over the basic server data
    const local = readJSON('rc_profile') || {};
    const sameUser = !local.email || !user.email || local.email.toLowerCase() === String(user.email).toLowerCase();
    showLoggedIn(sameUser ? { ...user, ...local, email: user.email || local.email } : user);
  }

  /* ---------- sign out ---------- */
  signOut.addEventListener('click', async () => {
    signOut.disabled = true;
    try {
      await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
    } catch (err) {
      console.info('nav-avatar.js: /api/logout not reachable (fine if the server is not running).');
    } finally {
      // remove only the sign-in markers - NOT the saved accounts, reports or profile photo
      ['roadcareLoggedIn', 'roadcareUserName', 'roadcareUserEmail']
        .forEach((k) => localStorage.removeItem(k));
      sessionStorage.removeItem('roadcareLoggedIn');
      window.location.href = 'login.html';
    }
  });

  loadUser();
})();
