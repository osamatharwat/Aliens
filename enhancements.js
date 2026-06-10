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

  // القاموس الشامل للموقع
  const SITE_DICT = {
    en: {
      home: 'Home', events: 'Events', gallery: 'Gallery', committees: 'Committees',
      memories: 'Memories', projects: 'Projects', cultural: 'Cultural Hub',
      internships: 'Internships', cv: 'CV Builder', admin: 'Dashboard',
      login: 'Sign in', logout: 'Logout', editProfile: 'Edit profile',
      openStore: 'Go to store', sidebarTitle: 'ALiENS Space',
      sidebarSubtitle: 'All pages and tools in one place', guestTitle: 'Welcome',
      guestSubtitle: 'Sign in or continue as a guest', switchLang: 'تبديل إلى العربية',
      footer_text: '© 2026 Aliens Student Activity - Delta University. Designed with 💚 for the Familia.',
      
      // Index
      hero_title: 'WELCOME TO THE <span>Crew</span>', hero_subtitle: 'We are a formal student activity at Delta University Pharmacy, building skills, experiences, and a real environment connecting studies to the job market.',
      btn_join: 'Join Our Crew 🛸', btn_explore: 'Explore Committees',
      about_title: 'Explore <span>Our Orbit</span>',
      about_q1: 'Who are we?', about_a1: 'Aliens team was founded in 2019 at Delta University Pharmacy, working to support students with practical experience.',
      about_q2: 'Our Vision', about_a2: 'To be the leading student activity empowering pharmacy students with modern skills needed for the real job market.',
      about_q3: 'Our Mission', about_a3: 'Providing training, educational events, and real partnerships with field experts.',
      stats_title: 'Achievements in <span>Space</span>',
      stats_1: 'Job Fair Events', stats_2: 'Beneficiaries', stats_3: 'Crew Members', stats_4: 'Annual Participation',
      quick_links: 'Quick <span>Links</span>',
      ql_1_t: 'Events', ql_1_d: 'Follow our latest events and activities.',
      ql_2_t: 'Memories', ql_2_d: 'Share your message after logging in.',
      ql_3_t: 'Gallery', ql_3_d: 'Browse event photos and add comments.',
      ql_4_t: 'Committees', ql_4_d: 'Know our teams and their roles.',
      join_title: 'Join our <span>Team</span> Now', join_desc: 'Whether a student seeking passion, or a company seeking a real partner; Aliens welcomes you.',
      join_box1_t: 'Students Portal', join_box1_d: 'Register to develop your skills and enter the market confidently.',
      join_box2_t: 'Sponsors Portal', join_box2_d: 'Contact us via official channels for sustainable partnerships.',
      social_title: 'Follow us on <span>Social Media</span>',

      // Committees
      comm_title: 'Our <span>Crew</span> (Committees)', comm_desc: 'Meet the committees leading Aliens and ensuring the success of our journey.',
      c_marketing_t: 'Marketing', c_marketing_d: 'We set plans and strategies to spread Aliens ideology accurately.',
      c_media_t: 'Media', c_media_d: 'The team\'s eye that documents the journey and produces top-quality designs.',
      c_pr_t: 'Public Relations', c_pr_d: 'We build bridges with companies, speakers, and external entities.',
      c_ir_t: 'Internal Relations', c_ir_d: 'We care for the internal crew, track performance, and maintain a positive environment.',
      c_magic_t: 'Magic Hand', c_magic_d: 'We turn ideas into decorations reflecting our space identity.',
      c_charity_t: 'Charity', c_charity_d: 'We organize community support campaigns leaving a clear humanitarian mark.',
      c_sec_t: 'Secretary', c_sec_d: 'Responsible for administration, documentation, and precise data organization.',
      c_event_t: 'Event Planning', c_event_d: 'We plan every event from start to finish ensuring an amazing experience.',
      c_tag_marketing: 'Growth & Branding', c_tag_media: 'Creative Team', c_tag_pr: 'Partnerships', c_tag_ir: 'Team Culture', c_tag_magic: 'Decoration Team', c_tag_charity: 'Community Impact', c_tag_sec: 'Operations', c_tag_event: 'Event Management',

      // Other Pages
      memo_title: 'Wall of <span>Memories</span>', memo_box_title: '<i class="fa-solid fa-pen-nib"></i> Document your moment',
      memo_placeholder: 'Write your memory message here...', memo_photo_label: '<i class="fa-solid fa-camera"></i> Attach photo (Optional)',
      memo_btn: 'Publish 🚀',
      proj_title: 'Members <span>Projects</span> 💡', proj_desc: 'Gallery for achievements, products, and projects of the Familia members.',
      cult_title: 'Cultural <span>Hub</span> 📚', cult_desc: 'Medical and developmental resources dedicated to pharmacists and team members.',
      gall_title: 'Event <span>Gallery</span>', gall_desc: 'A visual gallery of our events. Click ❤️ to like!',
      events_title: 'Event <span>Log</span>', events_desc: 'Follow the latest events and register directly from here.',
      int_title: 'Internship <span>Opportunities</span> 🌟', int_desc: 'Exclusive training opportunities for our partners and distinguished members.',

      // Auth
      auth_welcome: 'Welcome', auth_sub: 'Be part of the ALIENS family',
      tab_login: '<i class="fa-solid fa-sign-in-alt"></i> Login', tab_signup: '<i class="fa-solid fa-user-plus"></i> Sign up',
      login_title: '<i class="fa-solid fa-rocket"></i> Welcome Back',
      ph_email: 'Email or Username', ph_pass: 'Password',
      forgot_pass: 'Forgot Password?', btn_login: '<i class="fa-solid fa-arrow-right"></i> Launch 🚀',
      new_here: 'New here?', btn_create: '<i class="fa-solid fa-user-plus"></i> Create new account',
      signup_title: '<i class="fa-solid fa-star"></i> Join the Familia',
      ph_name: 'Full Name', ph_user: 'Username (Letters & numbers)', ph_email_su: 'Email Address', ph_pass_su: 'Password (6+ chars)',
      ph_promo: 'Promo Code (Optional)', btn_signup: '<i class="fa-solid fa-check"></i> Create Account 📝',
      have_acc: 'Already have an account?', btn_to_login: '<i class="fa-solid fa-sign-in-alt"></i> Login'
    },
    ar: {
      home: 'الرئيسية', events: 'الفعاليات', gallery: 'المعرض', committees: 'اللجان',
      memories: 'الذكريات', projects: 'استور المشاريع', cultural: 'المجتمع الثقافي',
      internships: 'الفرص التدريبية', cv: 'صانع الـ CV', admin: 'لوحة التحكم',
      login: 'تسجيل الدخول', logout: 'خروج', editProfile: 'تعديل الحساب',
      openStore: 'اذهب للاستور', sidebarTitle: 'ALiENS Space',
      sidebarSubtitle: 'كل الصفحات والأدوات في مكان واحد', guestTitle: 'أهلاً بك',
      guestSubtitle: 'أدخل على الحساب أو استعرض كضيف', switchLang: 'Switch to English',
      footer_text: '© 2026 Aliens Student Activity - Delta University. صُمم بحب من أجل الفاميليا 💚.',

      // Index
      hero_title: 'WELCOME TO THE <span>Crew</span>', hero_subtitle: 'نحن نشاط طلابي رسمي بكلية الصيدلة - جامعة الدلتا، بنبني مهارات، خبرات، وبيئة حقيقية تربط الدراسة بسوق العمل.',
      btn_join: 'Join Our Crew 🛸', btn_explore: 'استكشف اللجان',
      about_title: 'استكشف <span>مدارنا</span>',
      about_q1: 'من نحن؟', about_a1: 'تأسس فريق Aliens عام 2019 داخل كلية الصيدلة - جامعة الدلتا، ويعمل على دعم الطلاب بخبرة عملية وتواصل مهني فعّال.',
      about_q2: 'رؤيتنا', about_a2: 'أن نكون النشاط الطلابي الرائد في تمكين طلاب الصيدلة بالمهارات الحديثة التي يحتاجها سوق العمل الحقيقي.',
      about_q3: 'رسالتنا', about_a3: 'تقديم فرص تدريب، وفعاليات تعليمية ومهنية، وشراكات حقيقية مع خبراء المجال والمؤسسات داخل وخارج الجامعة.',
      stats_title: 'إنجازات حققناها في <span>الفضاء</span>',
      stats_1: 'Job Fair Events', stats_2: 'مستفيد من الحملات التوعوية', stats_3: 'عضو داخل الطاقم', stats_4: 'مشاركة سنوية متميزة',
      quick_links: 'روابط <span>سريعة</span>',
      ql_1_t: 'الفعاليات', ql_1_d: 'تابع آخر الإيفنتات والتسجيلات والأنشطة الجارية.',
      ql_2_t: 'حائط الذكريات', ql_2_d: 'شارك رسالتك وذكرياتك بعد تسجيل الدخول.',
      ql_3_t: 'المعرض', ql_3_d: 'استعرض صور الفعاليات وأضف تعليقاتك عليها.',
      ql_4_t: 'اللجان', ql_4_d: 'تعرف على فرق العمل داخل التيم ودور كل لجنة.',
      join_title: 'انضم إلى <span>فريقنا</span> الآن', join_desc: 'سواء كنت طالبًا تبحث عن شغفك، أو شركة أو رائد أعمال يبحث عن شريك حقيقي؛ Aliens ترحب بك.',
      join_box1_t: 'بوابة الطلاب والاعضاء', join_box1_d: 'سجّل معنا لتطوير مهاراتك والنزول لسوق العمل بثقة وقوة.',
      join_box2_t: 'بوابة الشركات والرعاة', join_box2_d: 'تواصل معنا عبر القنوات الرسمية لبحث فرص التعاون والشراكات المستدامة.',
      social_title: 'تابعنا عبر <span>منصاتنا المختلفة</span>',

      // Committees
      comm_title: 'طاقم <span>المركبة</span> (Committees)', comm_desc: 'تعرف على اللجان التي تقود Aliens وتضمن نجاح الفعاليات والرحلة التعليمية بالكامل.',
      c_marketing_t: 'Marketing', c_marketing_d: 'نضع الخطط والاستراتيجيات لنشر فكر Aliens بدقة وصناعة تأثير واضح داخل الجامعة.',
      c_media_t: 'Media', c_media_d: 'عين التيم التي توثق الرحلة وتنتج التصاميم والفيديوهات بأعلى جودة.',
      c_pr_t: 'Public Relations', c_pr_d: 'نبني الجسور مع الشركات والمحاضرين والجهات الخارجية لضمان شراكات ناجحة.',
      c_ir_t: 'Internal Relations', c_ir_d: 'نهتم بالطاقم الداخلي ونتابع الأداء ونحافظ على بيئة إيجابية داخل التيم.',
      c_magic_t: 'Magic Hand', c_magic_d: 'نحوّل الأفكار إلى ديكورات ومجسمات تعكس هوية الفضاء في كل حدث.',
      c_charity_t: 'Charity', c_charity_d: 'ننظم حملات الدعم والمساعدات المجتمعية ونترك أثرًا إنسانيًا واضحًا.',
      c_sec_t: 'Secretary', c_sec_d: 'مسؤولون عن الإدارة والتوثيق وتنظيم البيانات بكل دقة وانضباط.',
      c_event_t: 'Event Planning', c_event_d: 'نخطط لكل حدث من البداية للنهاية ونضمن تجربة مبهرة للجمهور.',
      c_tag_marketing: 'Growth & Branding', c_tag_media: 'Creative Team', c_tag_pr: 'Partnerships', c_tag_ir: 'Team Culture', c_tag_magic: 'Decoration Team', c_tag_charity: 'Community Impact', c_tag_sec: 'Operations', c_tag_event: 'Event Management',

      // Other Pages
      memo_title: 'حائط <span>الذكريات</span>', memo_box_title: '<i class="fa-solid fa-pen-nib"></i> وثق لحظتك (يُنشر فوراً)',
      memo_placeholder: 'اكتب رسالتك للذكرى هنا...', memo_photo_label: '<i class="fa-solid fa-camera"></i> إرفاق صورة (اختياري)',
      memo_btn: 'توثيق ونشر 🚀',
      proj_title: 'مشاريع <span>الأعضاء</span> 💡', proj_desc: 'معرض لإنجازات، منتجات، ومشاريع أعضاء الفاميليا (تواصل معهم مباشرة!).',
      cult_title: 'المجتمع <span>الثقافي</span> 📚', cult_desc: 'مصادر طبية وتطويرية مخصصة للصيادلة وأعضاء التيم.',
      gall_title: 'سجل فعاليات <span>Alians</span>', gall_desc: 'معرض مرئي لفعالياتنا. اضغط على ❤️ لتوثيق إعجابك!',
      events_title: 'سجل <span>الفعاليات</span>', events_desc: 'تابع أحدث الإيفنتات، وادخل على رابط المشاركة أو التسجيل مباشرة من هنا.',
      int_title: 'فرص <span>الإنترنشيب</span> 🌟', int_desc: 'فرص تدريب حصرية لشركائنا والمميزين فقط.',

      // Auth
      auth_welcome: 'مرحباً', auth_sub: 'كن جزء من عائلة ALIENS',
      tab_login: '<i class="fa-solid fa-sign-in-alt"></i> دخول', tab_signup: '<i class="fa-solid fa-user-plus"></i> إنشاء حساب',
      login_title: '<i class="fa-solid fa-rocket"></i> أهلاً بك',
      ph_email: 'البريد الإلكتروني أو اسم المستخدم', ph_pass: 'كلمة المرور',
      forgot_pass: 'نسيت كلمة المرور؟', btn_login: '<i class="fa-solid fa-arrow-right"></i> انطلاق للمركبة 🚀',
      new_here: 'جديد هنا؟', btn_create: '<i class="fa-solid fa-user-plus"></i> أنشئ حساب جديد',
      signup_title: '<i class="fa-solid fa-star"></i> انضم للفاميليا',
      ph_name: 'الاسم الرباعي', ph_user: 'اسم المستخدم (حروف وأرقام فقط)', ph_email_su: 'البريد الإلكتروني', ph_pass_su: 'كلمة المرور (6+ أحرف)',
      ph_promo: 'كود الترقية (اختياري)', btn_signup: '<i class="fa-solid fa-check"></i> إنشاء الحساب 📝',
      have_acc: 'لديك حساب بالفعل؟', btn_to_login: '<i class="fa-solid fa-sign-in-alt"></i> تسجيل الدخول'
    }
  };

  const getUiLang = () => {
    const stored = String(localStorage.getItem('aliens_lang') || '').trim().toLowerCase();
    const docLang = String(document.documentElement.getAttribute('lang') || '').trim().toLowerCase();
    const preferred = stored || docLang || 'en';
    return preferred.startsWith('ar') ? 'ar' : 'en';
  };

  const navText = (key, lang = getUiLang()) => SITE_DICT[lang]?.[key] || SITE_DICT.en?.[key] || key;
  const hrefKey = (href = '') => String(href).split('/').pop().replace(/\.html$/i, '').toLowerCase();
  const pageKeyFromHref = (href = '') => {
    const key = hrefKey(href);
    return key === 'index' ? 'home' : key;
  };

  const topLinks = [
    ['index.html', 'home', 'fa-house'],
    ['events.html', 'events', 'fa-calendar-days'],
    ['gallery.html', 'gallery', 'fa-images'],
    ['committees.html', 'committees', 'fa-people-group']
  ];

  const fullLinks = (role) => {
    const links = [...topLinks];
    if (role === 'member' || role === 'premium' || role === 'head' || role === 'moderator' || role === 'OG') {
      links.push(['memories.html', 'memories', 'fa-feather-pointed']);
      links.push(['projects.html', 'projects', 'fa-store']);
      links.push(['cultural.html', 'cultural', 'fa-book-open']);
      links.push(['profile.html', 'editProfile', 'fa-user']);
    }
    if (role === 'premium' || role === 'head' || role === 'moderator' || role === 'OG') {
      links.push(['internships.html', 'internships', 'fa-briefcase']);
      links.push(['cv.html', 'cv', 'fa-file-lines']);
    }
    if (role === 'head' || role === 'moderator' || role === 'OG') links.push(['admin.html', 'admin', 'fa-gauge-high']);
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
    linksHost.innerHTML = normalizeLinks(topLinks).map(([href, dictKey, icon]) => `
      <a href="${href}" class="nav-link ${getFile() === href ? 'active' : ''}">
        <i class="fa-solid ${icon}"></i> ${escapeHtml(navText(dictKey, lang))}
      </a>
    `).join('');

    const isAuthed = !!ctx.session;
    const name = ctx.profile?.full_name || ctx.profile?.username || ctx.session?.user?.email || 'Guest';
    const avatar = ctx.profile?.avatar_url
      ? `<img src="${escapeHtml(ctx.profile.avatar_url)}" alt="avatar" class="nav-avatar">`
      : `<span class="nav-avatar-fallback">${escapeHtml(initials(name))}</span>`;

    actionsHost.innerHTML = `
      <button type="button" class="nav-icon-btn" id="langToggleBtn" title="${escapeHtml(navText('switchLang', lang))}">
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
    q('#profileCompactBtn')?.addEventListener('click', () => {window.location.href = 'profile.html'; });

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
      sidebarNav.innerHTML = normalizeLinks(fullLinks(ctx.role)).map(([href, dictKey, icon]) => `
        <a class="sidebar-link ${getFile() === href ? 'active' : ''}" href="${href}">
          <i class="fa-solid ${icon}"></i>
          <span>${escapeHtml(navText(dictKey, lang))}</span>
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

  function applyLanguage(lang) {
    localStorage.setItem('aliens_lang', lang);
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    
    // تغيير نصوص HTML التي تحتوي على data-i18n
    const dict = SITE_DICT[lang];
    if (dict) {
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) {
          if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.placeholder = dict[key];
          else el.innerHTML = dict[key];
        }
      });
    }

    if (typeof window.getContext === 'function') {
      window.getContext().then(ctx => buildShell(ctx));
    }
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

  async function init() {
    initLanguage();
    if (typeof window.getContext !== 'function') {
      setTimeout(init, 100);
      return;
    }
    const ctx = await window.getContext();
    await buildShell(ctx);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();