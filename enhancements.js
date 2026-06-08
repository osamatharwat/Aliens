(() => {
  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const page = () => (document.body?.dataset?.page || 'home').toLowerCase();
  const getFile = () => (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[ch]);

  const normalizeUsername = (value) => String(value || '').trim().toLowerCase();

  const roleLabel = (role) => {
    if (role === 'head' || role === 'OG') return 'Admin';
    if (role === 'moderator') return 'Moderator';
    if (role === 'premium') return 'Premium';
    if (role === 'member') return 'Member';
    return 'Guest';
  };

  const initials = (name) => {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
    if (!parts.length) return 'A';
    return parts.map((part) => part[0]).join('').toUpperCase();
  };

  const NAV_TEXT = {
    en: {
      home: 'Home', events: 'Events', gallery: 'Gallery', committees: 'Committees',
      memories: 'Memories', projects: 'Projects', cultural: 'Cultural Hub',
      internships: 'Internships', cv: 'CV Builder', admin: 'Dashboard',
      login: 'Sign in', logout: 'Logout', editProfile: 'Edit profile',
      openStore: 'Go to store', sidebarTitle: 'ALiENS Space',
      sidebarSubtitle: 'All pages and tools in one place', guestTitle: 'Welcome',
      guestSubtitle: 'Sign in or continue as a guest', switchLang: 'Switch to Arabic / تبديل إلى العربية',
      openMenu: 'Open menu', closeMenu: 'Close menu'
    },
    ar: {
      home: 'الرئيسية', events: 'الفعاليات', gallery: 'المعرض', committees: 'اللجان',
      memories: 'الذكريات', projects: 'استور المشاريع', cultural: 'المجتمع الثقافي',
      internships: 'الفرص التدريبية', cv: 'صانع الـ CV', admin: 'لوحة التحكم',
      login: 'تسجيل الدخول', logout: 'خروج', editProfile: 'تعديل الحساب',
      openStore: 'اذهب للاستور', sidebarTitle: 'ALiENS Space',
      sidebarSubtitle: 'كل الصفحات والأدوات في مكان واحد', guestTitle: 'أهلاً بك',
      guestSubtitle: 'أدخل على الحساب أو استعرض كضيف', switchLang: 'تحويل إلى الإنجليزية / Switch to English',
      openMenu: 'فتح القائمة', closeMenu: 'إغلاق القائمة'
    }
  };

  const getUiLang = () => {
    const stored = String(localStorage.getItem('aliens_lang') || '').trim().toLowerCase();
    const docLang = String(document.documentElement.getAttribute('lang') || '').trim().toLowerCase();
    const preferred = stored || docLang || 'en';
    return preferred.startsWith('ar') ? 'ar' : 'en';
  };

  const navText = (key, lang = getUiLang()) => NAV_TEXT[lang]?.[key] || NAV_TEXT.en?.[key] || key;
  const hrefKey = (href = '') => String(href).split('/').pop().replace(/\.html$/i, '').toLowerCase();
  const pageKeyFromHref = (href = '') => {
    const key = hrefKey(href);
    return key === 'index' ? 'home' : key;
  };

  const topLinks = [
    ['index.html', 'الرئيسية', 'fa-house'],
    ['events.html', 'الفعاليات', 'fa-calendar-days'],
    ['gallery.html', 'المعرض', 'fa-images'],
    ['committees.html', 'اللجان', 'fa-people-group']
  ];

  const fullLinks = (role) => {
    const links = [
      ['index.html', 'الرئيسية', 'fa-house'],
      ['events.html', 'الفعاليات', 'fa-calendar-days'],
      ['gallery.html', 'المعرض', 'fa-images'],
      ['committees.html', 'اللجان', 'fa-people-group']
    ];
    if (role === 'member' || role === 'premium' || role === 'head' || role === 'moderator' || role === 'OG') {
      links.push(['memories.html', 'الذكريات', 'fa-feather-pointed']);
      links.push(['projects.html', 'استور المشاريع', 'fa-store']);
      links.push(['cultural.html', 'المجتمع الثقافي', 'fa-book-open']);
          links.push(['profile.html', 'ملفي الشخصي', 'fa-user']);
    }
    if (role === 'premium' || role === 'head' || role === 'moderator' || role === 'OG') {
      links.push(['internships.html', 'الفرص التدريبية', 'fa-briefcase']);
      links.push(['cv.html', 'صانع الـ CV', 'fa-file-lines']);
    }
    if (role === 'head' || role === 'moderator' || role === 'OG') links.push(['admin.html', 'لوحة التحكم', 'fa-gauge-high']);
    return links;
  };

  function ensureShellDOM() {
    if (!q('#aliensSidebar')) {
      const overlay = document.createElement('div');
      overlay.id = 'aliensSidebarOverlay';
      overlay.className = 'aliens-sidebar-overlay';
      overlay.addEventListener('click', closeSidebar);
      document.body.appendChild(overlay);

      const sidebar = document.createElement('aside');
      sidebar.id = 'aliensSidebar';
      sidebar.className = 'aliens-sidebar';
      sidebar.innerHTML = `
        <div class="aliens-sidebar-head">
          <div>
            <div class="aliens-brand">ALiENS Space</div>
            <div class="aliens-sidebar-sub" id="sidebarSubtitle">${escapeHtml(navText('sidebarSubtitle', getUiLang()))}</div>
          </div>
          <button type="button" class="sidebar-close" id="sidebarCloseBtn">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div id="sidebarProfileBlock" class="sidebar-profile"></div>
        <nav id="sidebarNav" class="sidebar-nav"></nav>
        <div class="sidebar-footer">
          <button type="button" class="sidebar-action" id="sidebarOpenStoreBtn">
            <i class="fa-solid fa-store"></i> ${escapeHtml(navText('openStore', getUiLang()))}
          </button>
        </div>
      `;
      document.body.appendChild(sidebar);
      q('#sidebarCloseBtn')?.addEventListener('click', closeSidebar);
      q('#sidebarOpenStoreBtn')?.addEventListener('click', () => { window.location.href = 'projects.html'; });
    }
  }

  function openSidebar() {
    q('#aliensSidebar')?.classList.add('active');
    q('#aliensSidebarOverlay')?.classList.add('active');
    document.body.classList.add('sidebar-open');
  }

  function closeSidebar() {
    q('#aliensSidebar')?.classList.remove('active');
    q('#aliensSidebarOverlay')?.classList.remove('active');
    document.body.classList.remove('sidebar-open');
  }

  function normalizeLinks(list) {
    const seen = new Set();
    return list.filter((item) => {
      const key = item[0];
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
  }

  async function buildShell(ctx) {
    ensureShellDOM();
    const linksHost = q('#siteNavLinks');
    const actionsHost = q('#siteNavActions');
    if (!linksHost || !actionsHost) return;

    const lang = getUiLang();
    linksHost.innerHTML = normalizeLinks(topLinks).map(([href, _label, icon]) => `
      <a href="${href}" class="nav-link ${getFile() === href ? 'active' : ''}">
        <i class="fa-solid ${icon}"></i> ${escapeHtml(navText(pageKeyFromHref(href), lang))}
      </a>
    `).join('');

    const isAuthed = !!ctx.session;
    const name = ctx.profile?.full_name || ctx.profile?.username || ctx.session?.user?.email || 'Guest';
    const avatar = ctx.profile?.avatar_url
      ? `<img src="${escapeHtml(ctx.profile.avatar_url)}" alt="avatar" class="nav-avatar">`
      : `<span class="nav-avatar-fallback">${escapeHtml(initials(name))}</span>`;

    actionsHost.innerHTML = `
      <button type="button" class="nav-icon-btn" id="langToggleBtn">
        <i class="fa-solid fa-language"></i>
      </button>
      <button type="button" class="nav-icon-btn" id="sidebarToggleBtn">
        <i class="fa-solid fa-bars"></i>
      </button>
      ${isAuthed ? `
        <button type="button" class="profile-compact" id="profileCompactBtn">
          ${avatar}
          <span class="profile-text">
            <strong>${escapeHtml(name)}</strong>
            <small>${escapeHtml(roleLabel(ctx.role))}</small>
          </span>
        </button>
        <button type="button" class="nav-btn danger" id="logoutQuickBtn">${escapeHtml(navText('logout', lang))}</button>
      ` : `
        <a href="auth.html" class="nav-btn ghost">${escapeHtml(navText('login', lang))}</a>
      `}
    `;

    q('#sidebarToggleBtn')?.addEventListener('click', openSidebar);
    q('#logoutQuickBtn')?.addEventListener('click', () => window.handleLogout?.());
q('#profileCompactBtn')?.addEventListener('click', () => {window.location.href = 'profile.html'; 
});

    const sidebarProfile = q('#sidebarProfileBlock');
    const sidebarNav = q('#sidebarNav');
    if (sidebarProfile) {
      sidebarProfile.innerHTML = isAuthed ? `
        <div class="sidebar-profile-avatar">${ctx.profile?.avatar_url ? `<img src="${escapeHtml(ctx.profile.avatar_url)}" alt="avatar">` : escapeHtml(initials(name))}</div>
        <div class="sidebar-profile-meta">
          <strong>${escapeHtml(name)}</strong>
          <small>${escapeHtml(roleLabel(ctx.role))}</small>
        </div>
      ` : `
        <div class="sidebar-profile-meta">
          <strong>${escapeHtml(navText('guestTitle', lang))}</strong>
          <span>${escapeHtml(navText('guestSubtitle', lang))}</span>
        </div>
      `;
    }

    if (sidebarNav) {
      sidebarNav.innerHTML = normalizeLinks(fullLinks(ctx.role)).map(([href, _label, icon]) => `
        <a class="sidebar-link ${getFile() === href ? 'active' : ''}" href="${href}">
          <i class="fa-solid ${icon}"></i>
          <span>${escapeHtml(navText(pageKeyFromHref(href), lang))}</span>
        </a>
      `).join('') + (isAuthed ? `
        <button type="button" class="sidebar-link danger" id="sidebarLogoutBtn">
          <i class="fa-solid fa-right-from-bracket"></i>
          <span>${escapeHtml(navText('logout', lang))}</span>
        </button>
      ` : `
        <a href="auth.html" class="sidebar-link ghost">
          <i class="fa-solid fa-right-to-bracket"></i>
          <span>${escapeHtml(navText('login', lang))}</span>
        </a>
      `);
    }
    q('#sidebarLogoutBtn')?.addEventListener('click', () => { closeSidebar(); window.handleLogout?.(); });
  }

  async function init() {
    initLanguage();
    if (typeof window.getContext !== 'function') {
      setTimeout(init, 100);
      return;
    }
    const ctx = await window.getContext();
    await buildShell(ctx);
  }

  function initLanguage() {
    const savedLang = localStorage.getItem('aliens_lang') || 'en';
    applyLanguage(savedLang);
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('#langToggleBtn');
      if (!btn) return;
      const newLang = getUiLang() === 'ar' ? 'en' : 'ar';
      applyLanguage(newLang);
    });
  }

  function applyLanguage(lang) {
    localStorage.setItem('aliens_lang', lang);
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();