(function () {
  const PROFILE_KEY  = 'rc_profile';
  const SETTINGS_KEY = 'rc_settings';

  function showMsg(el, text, ok) {
    if (!el) return;
    el.textContent = text;
    el.className = 'form-msg ' + (ok ? 'ok' : 'err');
  }

  function getProfile() {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {}; }
    catch { return {}; }
  }
  function setProfile(p) { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); }

  function getSettings() {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; }
    catch { return {}; }
  }
  function setSettings(s) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }

  /* keep the navbar dropdown in sync everywhere it's rendered on this page */
  function syncNav(p) {
    const name  = document.getElementById('ddName');
    const email = document.getElementById('ddEmail');
    const img   = document.getElementById('navAvatarImg');
    if (name)  name.textContent  = p.name  || 'User';
    if (email) email.textContent = p.email || '';
    if (img && p.avatar) img.src = p.avatar;
  }

  /* crop to a square and shrink so it stores small in localStorage */
  function fileToAvatar(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const size = 160;
        const c = document.createElement('canvas');
        c.width = c.height = size;
        const s = Math.min(img.width, img.height);
        c.getContext('2d').drawImage(
          img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size
        );
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('That file could not be read as an image.'));
      };
      img.src = url;
    });
  }

  /* ---------- PROFILE PAGE ---------- */
  function initProfile(form) {
    const msg      = document.getElementById('formMsg');
    const saveBtn  = document.getElementById('saveBtn');
    const resetBtn = document.getElementById('resetBtn');
    const preview  = document.getElementById('profileAvatar');
    const heroName = document.getElementById('heroName');
    const heroMail = document.getElementById('heroEmail');
    const file     = document.getElementById('avatarFile');
    const f = {
      name:  document.getElementById('pName'),
      email: document.getElementById('pEmail'),
      phone: document.getElementById('pPhone'),
      city:  document.getElementById('pCity'),
    };
    let newAvatar; // stays undefined unless a new photo is picked

    function render(p) {
      f.name.value  = p.name  || '';
      f.email.value = p.email || '';
      f.phone.value = p.phone || '';
      f.city.value  = p.city  || '';
      if (p.avatar) preview.src = p.avatar;
      heroName.textContent = p.name  || 'Your Profile';
      heroMail.textContent = p.email || 'Add your details below';
    }

    render(getProfile());

    file.addEventListener('change', async () => {
      const picked = file.files[0];
      if (!picked) return;
      if (picked.size > 5 * 1024 * 1024) {
        showMsg(msg, 'Choose an image smaller than 5 MB.', false);
        return;
      }
      try {
        newAvatar = await fileToAvatar(picked);
        preview.src = newAvatar;
        showMsg(msg, 'Photo selected. Select Save changes to keep it.', true);
      } catch (e) {
        showMsg(msg, e.message, false);
      }
    });

    resetBtn.addEventListener('click', () => {
      newAvatar = undefined;
      render(getProfile());
      showMsg(msg, 'Changes discarded.', true);
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!f.name.value.trim()) return showMsg(msg, 'Enter your name.', false);
      if (!/^\S+@\S+\.\S+$/.test(f.email.value.trim())) return showMsg(msg, 'Enter a valid email address.', false);

      saveBtn.disabled = true;
      const p = {
        name:  f.name.value.trim(),
        email: f.email.value.trim(),
        phone: f.phone.value.trim(),
        city:  f.city.value.trim(),
        avatar: newAvatar || getProfile().avatar || preview.src,
      };
      setProfile(p);
      newAvatar = undefined;
      syncNav(p);
      heroName.textContent = p.name;
      heroMail.textContent = p.email;
      showMsg(msg, 'Profile saved.', true);
      saveBtn.disabled = false;
    });
  }

  /* ---------- SETTINGS PAGE ---------- */
  function initSettings(form) {
    const msg     = document.getElementById('formMsg');
    const saveBtn = document.getElementById('saveBtn');
    const email   = document.getElementById('emailUpdates');
    const nearby  = document.getElementById('nearbyAlerts');

    const s = getSettings();
    email.checked  = s.emailUpdates  !== undefined ? s.emailUpdates  : true;
    nearby.checked = s.nearbyAlerts  !== undefined ? s.nearbyAlerts  : false;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      saveBtn.disabled = true;
      setSettings({ emailUpdates: email.checked, nearbyAlerts: nearby.checked });
      showMsg(msg, 'Settings saved.', true);
      saveBtn.disabled = false;
    });
  }

  const profileForm  = document.getElementById('profileForm');
  const settingsForm = document.getElementById('settingsForm');
  if (profileForm)  initProfile(profileForm);
  if (settingsForm) initSettings(settingsForm);
})();