
(() => {
  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const page = () => (document.body?.dataset?.page || 'home').toLowerCase();
  const getFile = () => (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  })[ch]);

  const normalizeUsername = (value) => String(value || '').trim().toLowerCase();

  const safeUrl = (value) => {
    const text = String(value || '').trim();
    if (!text) return '';
    try {
      const url = new URL(text, window.location.origin);
      return url.href;
    } catch {
      return '';
    }
  };

  const roleLabel = (role) => {
    if (role === 'head') return 'Head';
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
      home: 'Home',
      events: 'Events',
      gallery: 'Gallery',
      committees: 'Committees',
      memories: 'Memories',
      projects: 'Projects',
      cultural: 'Cultural Hub',
      internships: 'Internships',
      cv: 'CV Builder',
      admin: 'Dashboard',
      login: 'Sign in',
      logout: 'Logout',
      editProfile: 'Edit profile',
      openStore: 'Go to store',
      sidebarTitle: 'ALiENS Space',
      sidebarSubtitle: 'All pages and tools in one place',
      guestTitle: 'Welcome',
      guestSubtitle: 'Sign in or continue as a guest',
      switchLang: 'Switch to Arabic / تبديل إلى العربية',
      openMenu: 'Open menu',
      closeMenu: 'Close menu'
    },
    ar: {
      home: 'الرئيسية',
      events: 'الفعاليات',
      gallery: 'المعرض',
      committees: 'اللجان',
      memories: 'الذكريات',
      projects: 'استور المشاريع',
      cultural: 'المجتمع الثقافي',
      internships: 'الفرص التدريبية',
      cv: 'صانع الـ CV',
      admin: 'لوحة التحكم',
      login: 'تسجيل الدخول',
      logout: 'خروج',
      editProfile: 'تعديل الحساب',
      openStore: 'اذهب للاستور',
      sidebarTitle: 'ALiENS Space',
      sidebarSubtitle: 'كل الصفحات والأدوات في مكان واحد',
      guestTitle: 'أهلاً بك',
      guestSubtitle: 'أدخل على الحساب أو استعرض كضيف',
      switchLang: 'تحويل إلى الإنجليزية / Switch to English',
      openMenu: 'فتح القائمة',
      closeMenu: 'إغلاق القائمة'
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
    ['gallery.html', 'المعرض', 'fa-images']
  ];

  const fullLinks = (role) => {
    const links = [
      ['index.html', 'الرئيسية', 'fa-house'],
      ['events.html', 'الفعاليات', 'fa-calendar-days'],
      ['gallery.html', 'المعرض', 'fa-images'],
      ['committees.html', 'اللجان', 'fa-people-group']
    ];
    if (role === 'member' || role === 'premium' || role === 'head' || role === 'moderator') {
      links.push(['memories.html', 'الذكريات', 'fa-feather-pointed']);
      links.push(['projects.html', 'استور المشاريع', 'fa-store']);
      links.push(['cultural.html', 'المجتمع الثقافي', 'fa-book-open']);
    }
    if (role === 'premium' || role === 'head' || role === 'moderator') {
      links.push(['internships.html', 'الفرص التدريبية', 'fa-briefcase']);
      links.push(['cv.html', 'صانع الـ CV', 'fa-file-lines']);
    }
    if (role === 'head' || role === 'moderator') links.push(['admin.html', 'لوحة التحكم', 'fa-gauge-high']);
    return links;
  };

  function toast(message, kind = 'info') {
    let host = q('#siteToastHost');
    if (!host) {
      host = document.createElement('div');
      host.id = 'siteToastHost';
      host.className = 'site-toast-host';
      document.body.appendChild(host);
    }
    const item = document.createElement('div');
    item.className = `site-toast ${kind}`;
    item.textContent = message;
    host.appendChild(item);
    window.setTimeout(() => {
      item.classList.add('fade');
      window.setTimeout(() => item.remove(), 250);
    }, 2400);
  }

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
          <button type="button" class="sidebar-close" id="sidebarCloseBtn" aria-label="${escapeHtml(navText('closeMenu', getUiLang()))}">
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
      q('#sidebarOpenStoreBtn')?.addEventListener('click', () => {
        window.location.href = 'projects.html';
      });
    }

    if (!q('#aliensNotifPanel')) {
      const panel = document.createElement('div');
      panel.id = 'aliensNotifPanel';
      panel.className = 'aliens-notif-panel hidden';
      document.body.appendChild(panel);
    }
  }

  function openSidebar() {
    const sidebar = document.getElementById('aliensSidebar');
    const overlay = document.getElementById('aliensSidebarOverlay');
    const toggle = document.getElementById('sidebarToggleBtn');

    if (sidebar) sidebar.classList.add('active');
    if (overlay) overlay.classList.add('active');
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('sidebar-open');
  }

  function closeSidebar() {
    const sidebar = document.getElementById('aliensSidebar');
    const overlay = document.getElementById('aliensSidebarOverlay');
    const toggle = document.getElementById('sidebarToggleBtn');

    if (sidebar) sidebar.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('sidebar-open');
  }

  function normalizeLinks(list) {
    const seen = new Set();
    return list.filter((item) => {
      const key = item[0];
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async function buildShell(ctx) {
    ensureShellDOM();

    const linksHost = q('#siteNavLinks');
    const actionsHost = q('#siteNavActions');
    if (!linksHost || !actionsHost) return;

    const lang = getUiLang();
    const topHtml = normalizeLinks(topLinks).map(([href, _label, icon]) => `
      <a href="${href}" class="nav-link ${getFile() === href ? 'active' : ''}">
        <i class="fa-solid ${icon}"></i> ${escapeHtml(navText(pageKeyFromHref(href), lang))}
      </a>
    `).join('');

    linksHost.innerHTML = topHtml;

    const isAuthed = !!ctx.session;
    const name = ctx.profile?.full_name || ctx.profile?.username || ctx.session?.user?.email || 'Guest';
    const avatar = ctx.profile?.avatar_url
      ? `<img src="${escapeHtml(ctx.profile.avatar_url)}" alt="avatar" class="nav-avatar">`
      : `<span class="nav-avatar-fallback">${escapeHtml(initials(name))}</span>`;

    actionsHost.innerHTML = `
      <button type="button" class="nav-icon-btn" id="langToggleBtn" title="${escapeHtml(navText('switchLang', lang))}" aria-label="${escapeHtml(navText('switchLang', lang))}">
        <i class="fa-solid fa-language"></i>
      </button>

      <button type="button" class="nav-icon-btn" id="sidebarToggleBtn" aria-label="${escapeHtml(navText('openMenu', lang))}">
        <i class="fa-solid fa-bars"></i>
      </button>

      ${isAuthed ? `
        <button type="button" class="nav-icon-btn" id="notifToggleBtn" aria-label="${lang === 'ar' ? 'التنبيهات' : 'Notifications'}">
          <i class="fa-regular fa-bell"></i>
          <span class="notif-dot hidden" id="notifDot"></span>
        </button>
        <button type="button" class="profile-compact" id="profileCompactBtn" title="${escapeHtml(navText('editProfile', lang))}">
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

    q('#sidebarToggleBtn')?.setAttribute('aria-expanded', 'false');
    q('#sidebarToggleBtn')?.addEventListener('click', openSidebar);
    q('#logoutQuickBtn')?.addEventListener('click', () => window.handleLogout?.());

    if (!window.__aliensShellEscapeBound) {
      window.__aliensShellEscapeBound = true;
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          closeSidebar();
          q('#aliensNotifPanel')?.classList.add('hidden');
        }
      });
    }
    q('#profileCompactBtn')?.addEventListener('click', () => window.openProfileEditor?.(ctx));
    q('#notifToggleBtn')?.addEventListener('click', () => toggleNotifications(ctx));

    const sidebarProfile = q('#sidebarProfileBlock');
    const sidebarNav = q('#sidebarNav');
    if (sidebarProfile) {
      sidebarProfile.innerHTML = isAuthed ? `
        <div class="sidebar-profile-avatar">${ctx.profile?.avatar_url ? `<img src="${escapeHtml(ctx.profile.avatar_url)}" alt="avatar">` : escapeHtml(initials(name))}</div>
        <div class="sidebar-profile-meta">
          <strong>${escapeHtml(name)}</strong>
          <span>${escapeHtml(ctx.profile?.username ? '@' + ctx.profile.username : ctx.session.user.email)}</span>
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
        <button type="button" class="sidebar-link" id="sidebarProfileBtn">
          <i class="fa-solid fa-user-pen"></i>
          <span>${escapeHtml(navText('editProfile', lang))}</span>
        </button>
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

    q('#sidebarProfileBtn')?.addEventListener('click', () => {
      closeSidebar();
      window.openProfileEditor?.(ctx);
    });
    q('#sidebarLogoutBtn')?.addEventListener('click', () => {
      closeSidebar();
      window.handleLogout?.();
    });
  }

  async function getNotifications(ctx) {
    const role = ctx.role || 'guest';
    const roleKey = `aliens_notifications_seen_${role}`;
    let items = [];
    try {
      if (window.sb) {
        const { data } = await window.sb.from('notifications').select('*').order('created_at', { ascending: false }).limit(20);
        items = Array.isArray(data) ? data : [];
      }
    } catch {
      items = [];
    }

    if (!items.length) {
      try {
        items = JSON.parse(localStorage.getItem('aliens_notifications_v1') || '[]');
      } catch {
        items = [];
      }
    }

    const filtered = items.filter((item) => {
      const audience = String(item.audience_role || 'all').toLowerCase();
      return audience === 'all' || audience === role || (role === 'head' && audience === 'staff');
    });

    let lastSeen = 0;
    try {
      lastSeen = Number(localStorage.getItem(roleKey) || 0);
    } catch {
      lastSeen = 0;
    }

    return {
      items: filtered,
      unread: filtered.filter((item) => new Date(item.created_at || 0).getTime() > lastSeen).length,
      roleKey
    };
  }

  async function toggleNotifications(ctx) {
    const panel = q('#aliensNotifPanel');
    if (!panel) return;
    const data = await getNotifications(ctx);
    const items = data.items.slice(0, 8);
    panel.classList.toggle('hidden');
    panel.innerHTML = `
      <div class="notif-head">
        <strong>التنبيهات</strong>
        <button type="button" class="notif-close" id="notifCloseBtn"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="notif-list">
        ${items.length ? items.map((item) => `
          <a class="notif-item" href="${safeUrl(item.target_url) || '#'}">
            <strong>${escapeHtml(item.title || 'تنبيه')}</strong>
            <p>${escapeHtml(item.body || '')}</p>
            <small>${escapeHtml(new Date(item.created_at || Date.now()).toLocaleString('ar-EG'))}</small>
          </a>
        `).join('') : `<div class="notif-empty">لا توجد تنبيهات جديدة.</div>`}
      </div>
    `;
    q('#notifCloseBtn')?.addEventListener('click', () => panel.classList.add('hidden'));

    try {
      localStorage.setItem(data.roleKey, String(Date.now()));
    } catch {
      // ignore
    }
    q('#notifDot')?.classList.add('hidden');
  }

  async function refreshNotificationDot(ctx) {
    const dot = q('#notifDot');
    if (!dot) return;
    const data = await getNotifications(ctx);
    dot.classList.toggle('hidden', !data.unread);
  }

  function buildLandingPrompt() {
    if (page() !== 'home') return;
    const key = 'aliens_store_prompt_seen_v1';
    try {
      if (localStorage.getItem(key) === '1') return;
    } catch {
      return;
    }

    if (q('#storePromptModal')) return;

    const modal = document.createElement('div');
    modal.id = 'storePromptModal';
    modal.className = 'store-prompt-modal';
    modal.innerHTML = `
      <div class="store-prompt-card">
        <div class="store-prompt-badge"><i class="fa-solid fa-store"></i> استور المشاريع</div>
        <h3>عايز تروح مباشرة لمعرض المشاريع؟</h3>
        <p>هتلاقي فيه إنجازات أعضاء التيم بشكل يشبه الاستور مع بطاقات أوضح وتواصل أسرع.</p>
        <div class="store-prompt-actions">
          <button type="button" class="cta-btn primary-btn" id="storePromptGo">اذهب</button>
          <button type="button" class="cta-btn secondary-btn" id="storePromptSkip">تجاهل</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const dismiss = () => {
      modal.remove();
      try { localStorage.setItem(key, '1'); } catch {}
    };

    q('#storePromptGo')?.addEventListener('click', () => {
      dismiss();
      window.location.href = 'projects.html';
    });
    q('#storePromptSkip')?.addEventListener('click', dismiss);

    window.setTimeout(() => modal.classList.add('show'), 50);
  }

  function buildPasswordReset() {
    if (page() !== 'auth') return;
    if (q('#resetPasswordRow')) return;

    const loginForm = q('#loginForm');
    if (!loginForm) return;

    const row = document.createElement('div');
    row.id = 'resetPasswordRow';
    row.className = 'reset-password-row';
    row.innerHTML = `
      <button type="button" class="link-btn" id="resetPasswordBtn">
        <i class="fa-solid fa-key"></i> إعادة تعيين كلمة المرور
      </button>
      <small>هيتطلب البريد الإلكتروني المسجل، وهيبعت لك رابط آمن للتحديث.</small>
    `;
    loginForm.appendChild(row);

    const banner = document.createElement('div');
    banner.className = 'auth-helper-banner';
    banner.innerHTML = `
      <strong>تلميح:</strong> لو سجلت باسم مستخدم فقط، استخدم البريد الإلكتروني لإعادة التعيين.
    `;
    loginForm.insertBefore(banner, loginForm.firstChild);

    q('#resetPasswordBtn')?.addEventListener('click', async () => {
      if (!window.sb) return toast('Supabase غير متصل.', 'error');
      const emailFromInput = q('#loginId')?.value?.trim() || '';
      const email = isEmail(emailFromInput) ? emailFromInput : window.prompt('اكتب البريد الإلكتروني المسجل للحساب:')?.trim() || '';
      if (!email || !isEmail(email)) return toast('اكتب بريد إلكتروني صحيح.', 'warning');

      try {
        const redirectTo = `${window.location.origin}${window.location.pathname}?reset=1`;
        const { error } = await window.sb.auth.resetPasswordForEmail(email, { redirectTo });
        if (error) throw error;
        toast('تم إرسال رابط إعادة التعيين ✅', 'success');
      } catch (err) {
        toast(err.message || 'تعذر إرسال الرابط.', 'error');
      }
    });

    const params = new URLSearchParams(window.location.search);
    if (params.get('reset') === '1') {
      toast('افتح البريد وكمّل تحديث كلمة المرور من الرابط.', 'success');
    }
  }

  function buildCvCoach() {
    if (page() !== 'cv') return;
    if (q('#cvCoachCard')) return;

    const scoreBox = q('#cvScoreBox');
    if (!scoreBox) return;

    const card = document.createElement('div');
    card.id = 'cvCoachCard';
    card.className = 'cv-coach-card';
    card.innerHTML = `
      <div class="cv-coach-head">
        <strong><i class="fa-solid fa-user-graduate"></i> Coach</strong>
        <span>Best practices ATS</span>
      </div>
      <ul class="cv-coach-list">
        <li>خلي الـ CV صفحة واحدة أو صفحتين بالكتير لو الخبرة قليلة.</li>
        <li>استخدم عناوين قياسية: Profile / Experience / Education / Skills.</li>
        <li>ابدأ كل نقطة فعلية بالفعل + النتيجة + رقم لو موجود.</li>
        <li>تجنب الجداول المعقدة والـ icons الكتير لو بتستهدف ATS.</li>
        <li>حافظ على خط واضح وتباعد مريح، وخلّي الـ contact سهل النسخ.</li>
      </ul>
      <div class="cv-coach-live" id="cvCoachLive">ابدأ التعديل وشوف التوجيه هنا.</div>
    `;
    scoreBox.parentNode.insertBefore(card, scoreBox.nextSibling);

    const live = q('#cvCoachLive');
    const updateLive = () => {
      const scoreText = q('#cvScoreBox')?.textContent || '';
      const match = scoreText.match(/(\d{1,3})\/100/);
      const score = match ? Number(match[1]) : null;
      if (score == null) {
        live.textContent = 'املأ البيانات الأساسية الأول، وبعدها هنقيّم السيرة ذاتيًا.';
        return;
      }
      if (score >= 85) live.textContent = 'ممتاز — السيرة قريبة جدًا من نسخة ATS قوية. راجع فقط الاختصار والوضوح.';
      else if (score >= 70) live.textContent = 'جيد جدًا — زود أرقام ونتائج قابلة للقياس وقلل الفراغات غير الضرورية.';
      else if (score >= 50) live.textContent = 'محتاج تنظيم — ابدأ بملخص مهني واضح ومهارات أساسية وخبرة بصيغة أقوى.';
      else live.textContent = 'ابدأ بالأساسيات: الاسم، المسمى، وسائل التواصل، ثم التعليم والمهارات والخبرة.';
    };

    updateLive();
    const observer = new MutationObserver(updateLive);
    observer.observe(scoreBox, { childList: true, subtree: true, characterData: true });
  }

  function classifyProject(text) {
    const t = String(text || '').toLowerCase();
    if (/(design|graphic|poster|brand|media|photo|video)/.test(t)) return { label: 'Creative', icon: 'fa-palette' };
    if (/(pharm|medical|clinic|drug|health|research)/.test(t)) return { label: 'Pharma', icon: 'fa-capsules' };
    if (/(web|app|code|program|system|api|tech)/.test(t)) return { label: 'Tech', icon: 'fa-code' };
    if (/(marketing|sales|campaign|social)/.test(t)) return { label: 'Marketing', icon: 'fa-chart-line' };
    return { label: 'General', icon: 'fa-rocket' };
  }

  function projectImages(raw) {
    return String(raw || '').split(',').map((s) => s.trim()).filter(Boolean);
  }

  async function buildProjectsStore() {
    if (page() !== 'projects' && getFile() !== 'projects.html') return;
    const grid = q('#eventsGrid');
    if (!grid || !window.sb) return;

    const parent = grid.parentElement;
    if (parent && !q('#storeIntroPanel', parent)) {
      const intro = document.createElement('div');
      intro.id = 'storeIntroPanel';
      intro.className = 'store-intro-panel';
      intro.innerHTML = `
        <div>
          <div class="store-kicker"><i class="fa-solid fa-store"></i> Team Projects Store</div>
          <h2>استور مشاريع الأعضاء</h2>
          <p>واجهة عرض تشبه المتجر: أسرع، أوضح، وأقوى في إبراز الشغل الحقيقي بتاع كل عضو.</p>
        </div>
        <div class="store-stats">
          <div><strong id="storeCount">0</strong><span>مشروع</span></div>
          <div><strong id="storeCategories">0</strong><span>تصنيف</span></div>
          <div><strong id="storeLatest">0</strong><span>حديث</span></div>
        </div>
      `;
      parent.insertBefore(intro, grid);
    }

    try {
      const { data: projects = [] } = await window.sb.from('member_projects').select('*, profiles(full_name)').order('id', { ascending: false });
      const render = () => {
        const query = normalizeUsername(q('.search-input', parent || document)?.value || '');
        const filtered = projects.filter((item) => {
          const hay = [
            item.project_title,
            item.description,
            item.contact_phone,
            item.social_link,
            item.project_link,
            item.profiles?.full_name
          ].join(' ').toLowerCase();
          return !query || hay.includes(query);
        });

        const categories = new Set();
        const latest = filtered.slice(0, 4).length;
        if (q('#storeCount')) q('#storeCount').textContent = String(filtered.length);
        if (q('#storeCategories')) q('#storeCategories').textContent = String(new Set(filtered.map((item) => classifyProject(item.project_title + ' ' + item.description).label)).size);
        if (q('#storeLatest')) q('#storeLatest').textContent = String(latest);

        grid.classList.add('store-grid-host');
        grid.innerHTML = filtered.length ? filtered.map((item) => {
          const imgs = projectImages(item.image_url);
          const hero = imgs[0] ? `<img class="store-thumb" src="${escapeHtml(imgs[0])}" alt="project">` : `<div class="store-thumb placeholder"><i class="fa-solid fa-layer-group"></i></div>`;
          const category = classifyProject(`${item.project_title || ''} ${item.description || ''}`);
          const more = imgs.length > 1 ? `<span class="store-badge">+${imgs.length - 1} صور</span>` : '';
          const owner = item.profiles?.full_name || 'عضو';
          const ws = item.contact_phone ? `<a class="cta-btn primary-btn store-btn" href="https://wa.me/${String(item.contact_phone).replace(/\D/g,'')}" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-whatsapp"></i> تواصل</a>` : '';
          const social = item.social_link ? `<a class="cta-btn secondary-btn store-btn" href="${escapeHtml(safeUrl(item.social_link))}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-link"></i> سوشيال</a>` : '';
          const link = item.project_link ? `<a class="cta-btn secondary-btn store-btn" href="${escapeHtml(safeUrl(item.project_link))}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-arrow-up-right-from-square"></i> العرض</a>` : '';
          return `
            <article class="store-card">
              <div class="store-media">
                ${hero}
                <div class="store-topline">
                  <span class="store-chip"><i class="fa-solid ${category.icon}"></i> ${category.label}</span>
                  ${more}
                </div>
              </div>
              <div class="store-body">
                <div class="store-meta">
                  <strong>${escapeHtml(item.project_title || 'Project')}</strong>
                  <span>صاحب المشروع: ${escapeHtml(owner)}</span>
                </div>
                <p>${escapeHtml(item.description || '')}</p>
                <div class="store-actions">${ws}${social}${link}</div>
              </div>
            </article>
          `;
        }).join('') : '<div class="empty-state">لا توجد مشاريع مطابقة للبحث.</div>';
      };

      const searchHost = grid.previousElementSibling?.classList?.contains('page-toolbar') ? grid.previousElementSibling : null;
      const search = q('.search-input', searchHost || document);
      search?.addEventListener('input', render);
      render();
      window.setTimeout(render, 1200);
    } catch (err) {
      grid.innerHTML = `<div class="empty-state error">تعذر تحميل المشاريع.</div>`;
      console.error(err);
    }
  }

  function enhanceModeratorAdmin(ctx) {
    if (page() !== 'admin') return;
    const isLimited = ctx.role === 'moderator';
    if (!isLimited) return;

    const grid = q('.admin-grid');
    if (!grid) return;

    qa('.admin-card', grid).forEach((card) => {
      const title = card.querySelector('h3')?.textContent || '';
      if (/إعدادات المركبة/.test(title) || /إدارة الأعضاء/.test(title)) {
        card.style.display = 'none';
      }
    });

    if (!q('#moderatorPermissionsCard')) {
      const card = document.createElement('div');
      card.id = 'moderatorPermissionsCard';
      card.className = 'admin-card admin-card-highlight';
      card.innerHTML = `
        <h3><i class="fa-solid fa-shield-halved"></i> صلاحيات الأدمن المجاني</h3>
        <p>إدارة المحتوى فقط بدون الوصول لإعدادات الموقع الحساسة أو تغييرات الحسابات.</p>
        <div class="permission-grid">
          <span>الفعاليات</span>
          <span>المعرض</span>
          <span>المجتمع الثقافي</span>
          <span>الإنترنشيب</span>
          <span>المشاريع</span>
          <span>التنبيهات</span>
        </div>
      `;
      grid.insertBefore(card, grid.firstChild);
    }

    const header = q('.admin-header .section-title');
    if (header) {
      const span = header.querySelector('span');
      if (span) span.textContent = 'الأدمن المجاني';
    }
  }

  function initializeModalHandlers() {
    // كود ذكي لقفل أي فورم منبثق (Modal) في الموقع كله
    document.addEventListener('click', (e) => {
      // 1. لو داس على الإكس
      if (e.target.closest('.modal-close')) {
        const modal = e.target.closest('.modal-overlay');
        if (modal) modal.classList.remove('show');
      }
      // 2. لو داس على الخلفية السودا اللي بره الفورم
      if (e.target.matches('.modal-overlay')) {
        e.target.classList.remove('show');
      }
    });
  }

  async function init() {
    initLanguage();
    initializeModalHandlers();
    const ctx = await getContext();
    await buildShell(ctx);
    await refreshNotificationDot(ctx);

    buildLandingPrompt();
    buildPasswordReset();
    buildCvCoach();
    await buildProjectsStore();
    enhanceModeratorAdmin(ctx);

    if (page() === 'admin' || getFile() === 'admin.html') {
      // lightweight access note
      if (ctx.role === 'moderator') toast('أنت داخل بصلاحيات الأدمن المجاني.', 'success');
    }
  }
// 🌍 قاموس الترجمة الفورية للأعضاء والضيوف (الأساس إنجليزي)
  const TRANSLATIONS = {
    en: {
      home: "Home", committees: "Committees", gallery: "Gallery", events: "Events",
      memories: "Memories", dashboard: "Dashboard", logout: "Logout", login: "Login",
      heroTitle: "WELCOME TO THE <span>MOTHERSHIP</span>",
      heroDesc: "We are an official student activity at the Faculty of Pharmacy - Delta University, building skills, experience, and a real environment linking study to the job market."
    },
    ar: {
      home: "الرئيسية", committees: "اللجان", gallery: "المعرض", events: "الفعاليات",
      memories: "الذكريات", dashboard: "لوحة التحكم", logout: "خروج", login: "دخول",
      heroTitle: "مرحباً بكم في <span>المركبة الأم</span>",
      heroDesc: "نحن نشاط طلابي رسمي بكلية الصيدلة - جامعة الدلتا، بنبني مهارات، خبرات، وبيئة حقيقية تربط الدراسة بسوق العمل."
    }
  };

  // ⚡ دالة التحكم في الـ Dark & Light Mode
  
  function updateThemeIcon(theme) {
    const icon = q('#themeToggleBtn i');
    if (!icon) return;
    if (theme === 'light') {
      icon.className = 'fa-solid fa-sun';
      icon.style.color = '#eab308';
    } else {
      icon.className = 'fa-solid fa-moon';
      icon.style.color = 'var(--accent)';
    }
  }

  // ⚡ دالة التوجيه والتحويل اللغوي الديناميكي (بدون كسر الاتجاهات)
  function initLanguage() {
    const savedLang = localStorage.getItem('aliens_lang') || 'en';
    applyLanguage(savedLang);

    document.addEventListener('click', (e) => {
      const btn = e.target.closest('#langToggleBtn');
      if (!btn) return;
      const currentLang = getUiLang();
      const newLang = currentLang === 'ar' ? 'en' : 'ar';

      applyLanguage(newLang);
      toast(newLang === 'en' ? 'Language switched to English 🇬🇧' : 'تم تحويل اللغة إلى العربية 🇪🇬', 'success');
    });
  }

  function applyLanguage(lang) {
    const normalized = lang === 'ar' ? 'ar' : 'en';
    localStorage.setItem('aliens_lang', normalized);
    document.documentElement.setAttribute('lang', normalized);
    document.documentElement.setAttribute('dir', normalized === 'ar' ? 'rtl' : 'ltr');
    document.body.setAttribute('dir', normalized === 'ar' ? 'rtl' : 'ltr');
    document.body.dataset.lang = normalized;
    document.body.style.textAlign = normalized === 'ar' ? 'right' : 'left';

    q('#langToggleBtn')?.setAttribute('title', navText('switchLang', normalized));
    q('#langToggleBtn')?.setAttribute('aria-label', navText('switchLang', normalized));
    q('#sidebarToggleBtn')?.setAttribute('aria-label', navText('openMenu', normalized));
    q('#sidebarCloseBtn')?.setAttribute('aria-label', navText('closeMenu', normalized));

    const storeBtn = q('#sidebarOpenStoreBtn');
    if (storeBtn) {
      storeBtn.innerHTML = `<i class="fa-solid fa-store"></i> ${escapeHtml(navText('openStore', normalized))}`;
    }

    const sidebarSubtitle = q('#sidebarSubtitle');
    if (sidebarSubtitle) sidebarSubtitle.textContent = navText('sidebarSubtitle', normalized);

    qa('#siteNavLinks a').forEach((link) => {
      const href = link.getAttribute('href') || '';
      const key = pageKeyFromHref(href);
      const icon = link.querySelector('i')?.outerHTML ? `${link.querySelector('i').outerHTML} ` : '';
      link.innerHTML = `${icon}${escapeHtml(navText(key, normalized))}`;
    });

    qa('#sidebarNav .sidebar-link').forEach((link) => {
      const href = link.getAttribute('href') || '';
      const key = pageKeyFromHref(href);
      if (key) {
        const icon = link.querySelector('i')?.outerHTML ? `${link.querySelector('i').outerHTML} ` : '';
        link.innerHTML = `${icon}<span>${escapeHtml(navText(key, normalized))}</span>`;
      }
    });

    const sidebarProfile = q('#sidebarProfileBlock');
    if (sidebarProfile && !q('#sidebarProfileBtn')) {
      sidebarProfile.innerHTML = `
        <div class="sidebar-profile-meta">
          <strong>${escapeHtml(navText('guestTitle', normalized))}</strong>
          <span>${escapeHtml(navText('guestSubtitle', normalized))}</span>
        </div>
      `;
    }

    const profileBtn = q('#sidebarProfileBtn span');
    if (profileBtn) profileBtn.textContent = navText('editProfile', normalized);

    const logoutBtn = q('#sidebarLogoutBtn span');
    if (logoutBtn) logoutBtn.textContent = navText('logout', normalized);

    const loginBtn = q('#siteNavActions a.nav-btn.ghost');
    if (loginBtn && !q('#logoutQuickBtn')) loginBtn.textContent = navText('login', normalized);

    const logoutQuick = q('#logoutQuickBtn');
    if (logoutQuick) logoutQuick.textContent = navText('logout', normalized);

    const heroH1 = q('.hero-content h1');
    const heroP = q('.hero-content p');
    if (heroH1 && TRANSLATIONS[normalized].heroTitle) heroH1.innerHTML = TRANSLATIONS[normalized].heroTitle;
    if (heroP && TRANSLATIONS[normalized].heroDesc) heroP.innerHTML = TRANSLATIONS[normalized].heroDesc;
  }

  document.addEventListener('DOMContentLoaded', () => {
    window.setTimeout(() => {
      init().catch((err) => console.error('Enhancements init failed', err));
    }, 150);
  });
})();
