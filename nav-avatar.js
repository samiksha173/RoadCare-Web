(function () {
  const menu     = document.getElementById('userMenu');
  const btn      = document.getElementById('avatarBtn');
  const dropdown = document.getElementById('avatarDropdown');
  const signOut  = document.getElementById('signOutBtn');
  if (!menu || !btn || !dropdown) return;

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

  function fillDropdown(user) {
    document.getElementById('ddName').textContent  = user.name  || 'User';
    document.getElementById('ddEmail').textContent = user.email || '';
    if (user.avatar) document.getElementById('navAvatarImg').src = user.avatar;
    menu.hidden = false;
  }

  /* ---------- load logged-in user ---------- */
  async function loadUser() {
    // DEMO MODE: lets you see and test the dropdown with no backend running.
    // Remove this block once server.js and login are working end to end.
    const demoUser = localStorage.getItem('rc_demo_user');
    if (demoUser) {
      fillDropdown(JSON.parse(demoUser));
      return;
    }

    try {
      const res = await fetch('/api/me', { credentials: 'include' });
      if (!res.ok) throw new Error('Not logged in');
      const user = await res.json();
      fillDropdown(user);
    } catch {
      menu.hidden = true; // logged out and no backend: hide (Login link stays in navbar)
    }
  }

  /* ---------- sign out ---------- */
  signOut.addEventListener('click', async () => {
    signOut.disabled = true;
    try {
      await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    } catch (err) {
      console.error('Logout request failed (fine if you are only testing demo mode)', err);
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = 'login.html';
    }
  });

  loadUser();
})


(function () {
  const menu     = document.getElementById('userMenu');
  const btn      = document.getElementById('avatarBtn');
  const dropdown = document.getElementById('avatarDropdown');
  const signOut  = document.getElementById('signOutBtn');
  if (!menu || !btn || !dropdown) {
    console.error('nav-avatar.js: could not find #userMenu / #avatarBtn / #avatarDropdown in this page.');
    return;
  }

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

  function fillDropdown(user) {
    const name  = document.getElementById('ddName');
    const email = document.getElementById('ddEmail');
    const img   = document.getElementById('navAvatarImg');
    if (name)  name.textContent  = user.name  || 'User';
    if (email) email.textContent = user.email || '';
    if (img && user.avatar) img.src = user.avatar;
  }

  /* ---------- load user: prefer the locally-saved profile, else try a backend ---------- */
  async function loadUser() {
    try {
      const local = JSON.parse(localStorage.getItem('rc_profile'));
      if (local && (local.name || local.email || local.avatar)) {
        fillDropdown(local);
        return;
      }
    } catch { /* ignore bad JSON */ }

    try {
      const res = await fetch('/api/me', { credentials: 'include' });
      if (!res.ok) return; // no backend / not logged in — avatar stays visible with defaults
      const user = await res.json();
      fillDropdown(user);
    } catch (err) {
      console.info('nav-avatar.js: /api/me not reachable, showing default avatar.', err);
    }
  }

  /* ---------- sign out ---------- */
  signOut.addEventListener('click', async () => {
    signOut.disabled = true;
    try {
      await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    } catch (err) {
      console.info('nav-avatar.js: /api/logout not reachable.', err);
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = 'Login.html';
    }
  });

  loadUser();
})();