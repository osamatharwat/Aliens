(() => {
  const SUPABASE_URL = window.SUPABASE_URL || 'https://hvvfvsugamyexvvqhzkw.supabase.co';
  const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'sb_publishable_yi8j0Z12YJB9w4eW4IU0Cg_S_tjGs-Q';
  const STORAGE_BUCKET = 'aliens_images';
  const RECRUITMENT_FALLBACK_LINK = 'https://forms.gle/YourActualStudentFormLink';
  const GUEST_ROLE_KEY = 'aliens_role';
  const ENTRY_ROLE_KEY = 'aliens_entry_role';
  const CACHE = { session: null, profile: null, role: null };

  const sb = window.supabase
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      })
    : null;

  window.sb = sb;

  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const getFileName = () => (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const getPageKey = () => (document.body?.dataset?.page || getFileName().replace('.html', '') || 'home').toLowerCase();

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  })[ch]);

  const normalizeUsername = (value) => String(value || '').trim().toLowerCase();
  const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
  const isTruthySetting = (value) => ['open', '1', 'true', 'yes', 'on'].includes(String(value ?? '').trim().toLowerCase());

  function setMessage(el, msg, type = '') {
    if (!el) return;
    el.textContent = msg || '';
    el.className = `auth-msg ${type}`.trim();
  }

  function setBusy(button, busy, busyText, normalText) {
    if (!button) return;
    button.disabled = !!busy;
    if (busy && busyText) button.textContent = busyText;
    if (!busy && normalText) button.textContent = normalText;
  }

  function setVisible(el, visible) {
    if (!el) return;
    el.classList.toggle('hidden', !visible);
  }

  function safeUrlList(raw) {
    return String(raw || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function sliderMarkup(urls, imgClass = 'slider-img', wrapperClass = '') {
    if (!urls.length) return '';
    if (urls.length === 1) {
      return `<img class="${imgClass}" src="${escapeHtml(urls[0])}" alt="image">`;
    }
    return `
      <div class="slider-container ${wrapperClass}">
        <div class="image-slider">
          ${urls.map((url) => `<img class="${imgClass}" src="${escapeHtml(url)}" alt="image">`).join('')}
        </div>
        <div class="swipe-hint"><i class="fa-solid fa-angles-left"></i> اسحب للصور</div>
      </div>
    `;
  }

  function uploadPath(folder, file) {
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
    const stamp = Date.now().toString(36);
    const random = (crypto?.randomUUID?.() || Math.random().toString(36).slice(2)).replace(/-/g, '');
    return `${folder}/${stamp}_${random}.${ext}`;
  }

  async function uploadImage(file, folder) {
    if (!sb || !file) return null;
    const path = uploadPath(folder, file);
    const { error } = await sb.storage.from(STORAGE_BUCKET).upload(path, file, { upsert: false });
    if (error) throw error;
    const { data } = sb.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return data?.publicUrl || null;
  }

  async function getContext() {
    if (CACHE.session) return CACHE;
    if (!sb) return { session: null, profile: null, role: null };

    const { data: sessionData, error: sessionError } = await sb.auth.getSession();
    if (sessionError) {
      console.warn('Supabase session error:', sessionError.message);
      return { session: null, profile: null, role: null };
    }

    const session = sessionData?.session || null;
    if (!session) return { session: null, profile: null, role: null };

    let profile = null;
    const { data: profileRows, error: profileError } = await sb
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .limit(1);
    if (!profileError) profile = profileRows?.[0] || null;

    CACHE.session = session;
    CACHE.profile = profile;
    CACHE.role = profile?.role || null;
    return CACHE;
  }

  function renderNav(ctx) {
    const links = q('#siteNavLinks');
    const actions = q('#siteNavActions');
    const path = getFileName();
    if (!links || !actions) return;

    const navItems = [
      ['index.html', 'الرئيسية'],
      ['committees.html', 'اللجان'],
      ['gallery.html', 'المعرض'],
      ['events.html', 'الفعاليات']
    ];

    // للأعضاء، المميزين، والقادة
    if (ctx.role) {
      navItems.push(['memories.html', 'الذكريات']);
      navItems.push(['cultural.html', 'المجتمع الثقافي']);
      navItems.push(['projects.html', 'مشاريع الأعضاء']);
    }

    // للمميزين والقادة فقط
    if (ctx.role === 'premium' || ctx.role === 'head') {
      navItems.push(['internships.html', 'الإنترنشيب 🌟']);
    }

    if (ctx.role === 'head') {
      navItems.push(['admin.html', 'Dashboard']);
    }

    links.innerHTML = navItems
      .map(([href, label]) => `<a href="${href}" class="nav-link ${path === href ? 'active' : ''}">${label}</a>`)
      .join('');

    if (ctx.session) {
      const roleLabel = ctx.role === 'head' ? 'Head 👑' : ctx.role === 'premium' ? 'Premium 🌟' : 'Member';
      
      // حولنا الشريحة لزرار يقدر يضغط عليه عشان يفتح تعديل البروفايل
      links.innerHTML += `
        <button class="user-chip" id="updateProfileBtn" style="cursor:pointer; background:rgba(255,255,255,0.05); transition:0.3s;" title="تعديل حسابي" onmouseover="this.style.background='rgba(57,255,20,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">
          <i class="fa-solid fa-pen" style="font-size:0.8rem; margin-left:5px;"></i> ${escapeHtml(ctx.profile?.full_name || 'User')} · ${roleLabel}
        </button>
      `;
      actions.innerHTML = `<button type="button" class="nav-btn danger" id="logoutBtn">Logout</button>`;
      
      q('#logoutBtn')?.addEventListener('click', handleLogout);
      
      // بمجرد الضغط، نستدعي نافذة التعديل اللي عملناها فوق
      q('#updateProfileBtn')?.addEventListener('click', () => window.openProfileEditor(ctx));
      
    } else {
      actions.innerHTML = `<a href="auth.html" class="nav-btn ghost">Login</a>`;
    }
  }

  async function handleLogout() {
    localStorage.removeItem(GUEST_ROLE_KEY);
    sessionStorage.removeItem(ENTRY_ROLE_KEY);
    CACHE.session = null;
    CACHE.profile = null;
    CACHE.role = null;
    if (sb) await sb.auth.signOut();
    window.location.href = 'index.html';
  }

  function selectRole(role) {
    if (role === 'guest') {
      localStorage.setItem(GUEST_ROLE_KEY, 'guest');
      const gateway = q('#roleGateway');
      if (gateway) gateway.style.display = 'none';
      return;
    }

    sessionStorage.setItem(ENTRY_ROLE_KEY, role);
    window.location.href = 'auth.html';
  }

  function openApplicationForm() {
    if (window.__recruitmentOpen && window.__recruitmentLink) {
      window.open(window.__recruitmentLink, '_blank', 'noopener,noreferrer');
      return;
    }
    alert('التقديم مغلق حاليًا.');
  }

  function switchTab(tab) {
    qa('.tab-btn').forEach((btn) => btn.classList.remove('active'));
    qa('.auth-form').forEach((form) => form.classList.remove('active-form'));
    q(`#${tab}TabBtn`)?.classList.add('active');
    q(`#${tab}Form`)?.classList.add('active-form');
  }

  async function loginAction(event) {
    event.preventDefault();
    const loginId = q('#loginId');
    const loginPassword = q('#loginPassword');
    const msg = q('#loginMsg');
    const input = normalizeUsername(loginId?.value);
    const password = loginPassword?.value || '';

    if (!sb) return setMessage(msg, 'Supabase غير متصل.', 'error');
    if (!input || !password) return setMessage(msg, 'املأ البيانات أولًا.', 'error');

    setMessage(msg, 'جاري تسجيل الدخول...', '');

    let email = input;

if (!isEmail(input)) {

  const { data: profile, error } = await sb
    .from('profiles')
    .select('email')
    .ilike('username', input)
    .single();

  if (error || !profile) {
    return setMessage(msg, 'اسم المستخدم غير موجود', 'error');
  }

  email = profile.email;
}
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return setMessage(msg, `خطأ: ${error.message}`, 'error');

    CACHE.session = data.session || null;
    CACHE.profile = null;
    CACHE.role = null;
    const ctx = await getContext();
    window.location.href = ctx.role === 'head' ? 'admin.html' : 'index.html';
  }

  async function signupAction(event) {
  event.preventDefault();

  const name = q('#signupName')?.value.trim() || '';
  const username = normalizeUsername(q('#signupUsername')?.value);
  const email = q('#signupEmail')?.value.trim() || '';
  const password = q('#signupPassword')?.value || '';
  const promo = q('#signupPromo')?.value.trim() || '';
  const avatarFile = q('#signupAvatar')?.files[0];
  const msg = q('#signupMsg');

  setMessage(msg, 'جاري إنشاء الحساب...', '');

  const { data, error } = await sb.auth.signUp({
    email, password, options: { data: { full_name: name, username } }
  });

  if (error) return setMessage(msg, error.message, 'error');

  const userId = data?.user?.id;
  if (userId) {
    // 1. رفع الصورة لو العضو اختار صورة
    let avatarUrl = null;
    if (avatarFile) {
        avatarUrl = await uploadImage(avatarFile, 'avatars');
    }
    
    // 2. تحديد الرتبة بناءً على كود الترقية (SP0)
    const userRole = (promo === 'SP0') ? 'premium' : 'member';

    await sb.from('profiles').upsert({
      id: userId, full_name: name, username, email,
      role: userRole, avatar_url: avatarUrl
    });
  }

  setMessage(msg, 'تم إنشاء الحساب بنجاح ✅', 'success');
  q('#signupForm')?.reset();
}

  function setupAuth() {
    const loginForm = q('#loginForm');
    const signupForm = q('#signupForm');
    const loginTab = q('#loginTabBtn');
    const signupTab = q('#signupTabBtn');

    loginTab?.addEventListener('click', () => switchTab('login'));
    signupTab?.addEventListener('click', () => switchTab('signup'));
    loginForm?.addEventListener('submit', loginAction);
    signupForm?.addEventListener('submit', signupAction);
  }

  async function syncHome(ctx) {
    if (!sb) return;
    const { data } = await sb.from('site_settings').select('*');
    const settings = new Map((data || []).map((row) => [row.setting_key, row.setting_value]));
    const open = isTruthySetting(settings.get('recruitment_status'));
    const link = settings.get('recruitment_link') || RECRUITMENT_FALLBACK_LINK;

    window.__recruitmentOpen = open;
    window.__recruitmentLink = link;

    const joinBtn = q('#joinTeamBtn');
    const heroBtn = q('#heroActionBtn');
    const statusMsg = q('#recruitmentStatusMsg');
    const memoryNote = q('#memoryAccessNote');

    if (joinBtn) {
      joinBtn.disabled = !open;
      joinBtn.textContent = open ? 'Join Our Crew 🛸' : 'Boarding Closed';
      joinBtn.onclick = () => openApplicationForm();
    }

    if (heroBtn) {
      heroBtn.textContent = open ? 'Join The Crew' : 'Application Closed';
      heroBtn.className = `cta-btn ${open ? 'primary-btn' : 'secondary-btn'}`;
      if (open) heroBtn.href = link;
      else heroBtn.removeAttribute('href');
    }

    if (statusMsg) {
      statusMsg.textContent = open ? '🛸 باب التقديم مفتوح الآن.' : '🔒 التقديم مغلق حاليًا.';
      statusMsg.style.color = open ? 'var(--accent)' : '#fca5a5';
    }

    if (memoryNote) {
      const canWrite = !!ctx.session && (ctx.role === 'member' || ctx.role === 'head');
      memoryNote.textContent = canWrite
        ? 'يمكنك نشر الذكريات الآن.'
        : 'حائط الذكريات متاح بعد تسجيل الدخول كعضو أو مسؤول.';
      setVisible(memoryNote, true);
    }
const headPhone = settings.get('pr_head_phone');
    const subPhone = settings.get('pr_sub_phone');
    const headBtn = q('#headWhatsAppBtn');
    const subBtn = q('#subWhatsAppBtn');

    if (headBtn && headPhone) headBtn.href = `https://wa.me/${headPhone.replace(/\D/g, '')}`;
    if (subBtn && subPhone) subBtn.href = `https://wa.me/${subPhone.replace(/\D/g, '')}`;
    
  }

  async function loadEvents() {
    const grid = q('#eventsGrid');
    if (!grid || !sb) return;
    grid.innerHTML = '';

    const { data, error } = await sb.from('events').select('*').order('id', { ascending: false });
    if (error) {
      grid.innerHTML = `<div class="empty-state">تعذر تحميل الفعاليات.</div>`;
      console.error(error);
      return;
    }

    if (!data?.length) {
      grid.innerHTML = '<div class="empty-state">لا توجد فعاليات حاليًا.</div>';
      return;
    }

    grid.innerHTML = data.map((evt) => {
      const urls = safeUrlList(evt.image_url);
      const cover = urls.length ? sliderMarkup(urls, 'event-cover') : '';
      const action = evt.action_link ? `<a class="cta-btn primary-btn" href="${escapeHtml(evt.action_link)}" target="_blank" rel="noopener noreferrer">Join Now</a>` : '';
      return `
        <article class="event-card">
          ${cover}
          <div class="event-card-body">
            <h3>${escapeHtml(evt.title)}</h3>
            <p>${escapeHtml(evt.description)}</p>
            <div class="event-actions">${action}</div>
          </div>
        </article>
      `;
    }).join('');
  }

  async function loadMemories(ctx) {
    const grid = q('#memoriesGrid');
    if (!grid || !sb) return;
    grid.innerHTML = '';

    const { data, error } = await sb.from('memories').select('*').order('id', { ascending: false });
    if (error) {
      grid.innerHTML = '<div class="empty-state">تعذر تحميل الذكريات.</div>';
      console.error(error);
      return;
    }

    if (!data?.length) {
      grid.innerHTML = '<div class="empty-state">لا توجد ذكريات بعد.</div>';
      return;
    }

    grid.innerHTML = data.map((mem) => {
      const roleBadge = mem.author_role === 'head' ? '<span class="badge success">Head</span>' : 
                        mem.author_role === 'premium' ? '<span class="badge warning"><i class="fa-solid fa-star"></i> المميزين</span>' : 
                        '<span class="badge">Member</span>';
      
      const avatarHtml = mem.author_avatar 
        ? `<img src="${escapeHtml(mem.author_avatar)}" style="width:45px; height:45px; border-radius:50%; object-fit:cover; border:2px solid var(--accent);">` 
        : `<div style="width:45px; height:45px; border-radius:50%; background:var(--border-strong); display:flex; align-items:center; justify-content:center; font-size:1.2rem; color:var(--accent);"><i class="fa-solid fa-user-astronaut"></i></div>`;

    return `
        <article class="memory-card">
          <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px; padding-bottom:12px; border-bottom:1px solid rgba(255,255,255,0.05);">
            ${avatarHtml}
            <div style="display:flex; flex-direction:column; gap:4px;">
                <div class="memory-author" style="line-height:1;">${escapeHtml(mem.author_name || 'Anonymous')}</div>
                <div>${roleBadge}</div>
            </div>
          </div>
          <div class="memory-content">${escapeHtml(mem.memory_text || '')}</div>
          ${urls.length ? sliderMarkup(urls, 'slider-img', 'mt-10') : ''}
          ${ctx?.session ? '' : '<div class="memory-timestamp">سجل دخولك لنشر ذكريات جديدة.</div>'}
        </article>
      `;
    }).join('');
  }

async function loadCultural(ctx) {
    const grid = q('.events-grid'); if (!grid || !sb) return; grid.innerHTML = '';
    const { data } = await sb.from('cultural_resources').select('*').order('id', { ascending: false });
    if (!data?.length) return grid.innerHTML = '<div class="empty-state">لا توجد مصادر حالياً.</div>';
    grid.innerHTML = data.map(item => {
      if (item.is_premium_only && ctx.role !== 'premium' && ctx.role !== 'head') return `<article class="event-card"><div class="event-card-body" style="text-align:center; filter:blur(2px);"><i class="fa-solid fa-lock" style="font-size:3rem; color:var(--warning);"></i><h3>محتوى مميز</h3><p>قم بالترقية لرؤية المحتوى.</p></div></article>`;
      return `<article class="event-card"><div class="event-card-body"><span class="badge success">${escapeHtml(item.section_name)}</span><h3>${escapeHtml(item.title)}</h3><a class="cta-btn secondary-btn" href="${escapeHtml(item.resource_url)}" target="_blank">فتح المصدر</a></div></article>`;
    }).join('');
  }

  async function loadInternships(ctx) {
    const grid = q('.events-grid'); if (!grid || !sb) return; grid.innerHTML = '';
    if (ctx.role !== 'premium' && ctx.role !== 'head') return grid.innerHTML = '<div class="empty-state error">غير مصرح لك بدخول هذه الصفحة.</div>';
    const { data } = await sb.from('internships').select('*').order('id', { ascending: false });
    if (!data?.length) return grid.innerHTML = '<div class="empty-state">لا توجد فرص متاحة حالياً.</div>';
    grid.innerHTML = data.map(item => `
      <article class="event-card" style="border-color:var(--warning);">
        ${item.image_url ? `<img class="event-cover" src="${escapeHtml(item.image_url)}">` : ''}
        <div class="event-card-body">
          <h3 style="color:var(--warning);"><i class="fa-solid fa-briefcase"></i> ${escapeHtml(item.company_name)}</h3>
          <h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.description)}</p>
          <a class="cta-btn primary-btn" style="background:var(--warning); color:#000;" href="${escapeHtml(item.apply_link)}" target="_blank">تقديم الآن</a>
        </div>
      </article>`).join('');
  }

  async function loadProjects() {
    const grid = q('.events-grid'); if (!grid || !sb) return; grid.innerHTML = '';
    const { data } = await sb.from('member_projects').select('*, profiles(full_name)').order('id', { ascending: false });
    if (!data?.length) return grid.innerHTML = '<div class="empty-state">لم يتم إضافة مشاريع بعد.</div>';
    grid.innerHTML = data.map(item => {
      const urls = safeUrlList(item.image_url);
      const whatsAppBtn = item.contact_phone ? `<a href="https://wa.me/${item.contact_phone.replace(/\D/g, '')}" target="_blank" class="cta-btn primary-btn" style="background:#25d366; color:#000; border:none; flex:1;"><i class="fa-brands fa-whatsapp"></i> تواصل</a>` : '';
      const socialBtn = item.social_link ? `<a href="${escapeHtml(item.social_link)}" target="_blank" class="cta-btn secondary-btn" style="flex:1;"><i class="fa-solid fa-link"></i> ميديا</a>` : '';
      const projBtn = item.project_link ? `<a href="${escapeHtml(item.project_link)}" target="_blank" class="cta-btn secondary-btn" style="flex:1;">المشروع</a>` : '';
      
      return `
      <article class="event-card">
        ${urls.length ? sliderMarkup(urls, 'event-cover') : ''}
        <div class="event-card-body">
          <h3>${escapeHtml(item.project_title)}</h3>
          <p>${escapeHtml(item.description)}</p>
          <div style="color:var(--accent); font-weight:bold; font-size:0.9rem;">صاحب المشروع: ${escapeHtml(item.profiles?.full_name || 'عضو')}</div>
          <div class="event-actions" style="margin-top:10px;">${whatsAppBtn}${socialBtn}${projBtn}</div>
        </div>
      </article>`;
    }).join('');
  }

  async function loadProjects() {
    const grid = q('.events-grid');

    grid.innerHTML = data.map(item => `
      <article class="event-card">
        ${item.image_url ? `<img class="event-cover" src="${escapeHtml(item.image_url)}">` : ''}
        <div class="event-card-body">
          <h3>${escapeHtml(item.project_title)}</h3>
          <p>${escapeHtml(item.description)}</p>
          <div style="color:var(--accent); font-weight:bold; font-size:0.9rem;">بواسطة: ${escapeHtml(item.profiles?.full_name || 'عضو')}</div>
          ${item.project_link ? `<a class="cta-btn primary-btn" href="${escapeHtml(item.project_link)}" target="_blank">عرض المشروع</a>` : ''}
        </div>
      </article>`).join('');
  }
  async function handleMemorySubmit(event, ctx) {
    event.preventDefault();
    const msg = q('#memoryMsg');
    const btn = q('#submitMemoryBtn');
    const input = q('#memoryImgFile');
    const text = q('#memoryText')?.value.trim() || '';

    if (!ctx?.session) return setMessage(msg, 'يجب تسجيل الدخول لنشر الذكريات.', 'error');
    if (!text) return setMessage(msg, 'اكتب الذكرى أولًا.', 'error');

    const files = Array.from(input?.files || []);
    setBusy(btn, true, files.length ? 'جاري رفع الصور والنشر...' : 'جاري النشر...', 'توثيق ونشر 🚀');
    setMessage(msg, 'جاري النشر...', '');

    try {
      const urls = [];
      for (const file of files) {
        const url = await uploadImage(file, 'memories');
        if (url) urls.push(url);
      }

      const payload = {
        author_name: ctx.profile?.full_name || ctx.session.user.email || 'Anonymous',
        author_role: ctx.profile?.role || 'member',
        author_avatar: ctx.profile?.avatar_url || null,
        memory_text: text,
        image_url: urls.length ? urls.join(',') : null,
        user_id: ctx.session.user.id,
        is_approved: true
      };

      const { error } = await sb.from('memories').insert([payload]);
      if (error) throw error;

      q('#memoryForm')?.reset();
      setMessage(msg, 'تم النشر ✅', 'success');
      await loadMemories(ctx);
    } catch (err) {
      setMessage(msg, `خطأ: ${err.message}`, 'error');
    } finally {
      setBusy(btn, false, '', 'توثيق ونشر 🚀');
    }
  }

  async function loadGallery(ctx) {
    const container = q('#dynamicGalleryContainer');
    if (!container || !sb) return;
    container.innerHTML = '';

    const [{ data: images, error: imgError }, { data: likes, error: likeError }] = await Promise.all([
      sb.from('gallery_images').select('*').order('created_at', { ascending: true }),
      sb.from('gallery_likes').select('*')
    ]);

    if (imgError) {
      container.innerHTML = '<div class="empty-state">تعذر تحميل المعرض.</div>';
      console.error(imgError);
      return;
    }

    if (likeError) console.warn(likeError);

    if (!images?.length) {
      container.innerHTML = '<div class="empty-state">المعرض فارغ حالياً.</div>';
      return;
    }

    const sections = new Map();
    images.forEach((item) => {
      const key = item.section_name || 'General';
      if (!sections.has(key)) sections.set(key, []);
      sections.get(key).push(item);
    });

    const likeCounts = new Map();
    const userLiked = new Set();

    (likes || []).forEach((like) => {
      const key = String(like.image_name);
      likeCounts.set(key, (likeCounts.get(key) || 0) + 1);
      if (ctx.session && like.user_id === ctx.session.user.id) userLiked.add(key);
    });

    container.innerHTML = Array.from(sections.entries()).map(([sectionName, items]) => `
      <section>
        <h3 class="gallery-subtitle"><i class="fa-solid fa-folder-open"></i> ${escapeHtml(sectionName)}</h3>
        <div class="gallery-fluid-grid">
          ${items.map((item) => {
            const id = String(item.id);
            const count = likeCounts.get(id) || 0;
            const liked = userLiked.has(id) ? 'liked' : '';
            return `
              <div class="gallery-fluid-item">
                <img src="${escapeHtml(item.image_url)}" alt="gallery image">
                <div class="img-caption">
                  <button type="button" class="like-btn ${liked}" data-id="${escapeHtml(id)}">
                    <i class="fa-solid fa-heart"></i> <span class="count">${count}</span>
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </section>
    `).join('');

    qa('.like-btn', container).forEach((button) => {
      button.addEventListener('click', async () => {
        if (!ctx.session) {
          alert('يجب تسجيل الدخول للإعجاب! 🛸');
          return;
        }

        const imageId = button.dataset.id;
        const countEl = button.querySelector('.count');
        const isLiked = button.classList.toggle('liked');
        const current = Number(countEl?.textContent || 0);
        if (countEl) countEl.textContent = String(current + (isLiked ? 1 : -1));

        try {
          if (isLiked) {
            await sb.from('gallery_likes').insert([{ image_name: imageId, user_id: ctx.session.user.id }]);
          } else {
            await sb.from('gallery_likes').delete().match({ image_name: imageId, user_id: ctx.session.user.id });
          }
        } catch (err) {
          console.error(err);
        }
      });
    });
  }

  async function renderProfilesManagement() {
    const list = q('#profilesManagementList');
    if (!list || !sb) return;

    const { data, error } = await sb.from('profiles').select('*').order('full_name', { ascending: true });
    if (error) {
      list.innerHTML = '<div class="empty-state">تعذر تحميل المستخدمين.</div>';
      console.error(error);
      return;
    }

    if (!data?.length) {
      list.innerHTML = '<div class="empty-state">لا توجد بيانات مستخدمين.</div>';
      return;
    }

  list.innerHTML = data.map((user) => {
      const avatar = user.avatar_url ? `<img src="${escapeHtml(user.avatar_url)}" style="width:45px; height:45px; border-radius:50%; object-fit:cover; border:2px solid var(--accent);">` : `<div style="width:45px;height:45px;border-radius:50%;background:rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:center;color:var(--accent); font-size:1.2rem;"><i class="fa-solid fa-user"></i></div>`;
      return `
      <div class="table-row" data-user-id="${escapeHtml(user.id)}">
        <div class="main" style="flex-direction:row; align-items:center; gap:12px;">
          ${avatar}
          <div style="display:flex; flex-direction:column; gap:4px;">
            <div class="title">${escapeHtml(user.full_name || user.username || user.email || user.id)}</div>
            <div class="sub">${escapeHtml(user.email || '')}</div>
          </div>
        </div>
        <div class="actions">
          <select class="role-select" style="min-width:110px;">
            <option value="member" ${user.role === 'member' ? 'selected' : ''}>Member</option>
            <option value="premium" ${user.role === 'premium' ? 'selected' : ''}>Premium 🌟</option>
            <option value="head" ${user.role === 'head' ? 'selected' : ''}>Head 👑</option>
          </select>
          <button type="button" class="cta-btn primary-btn update-profile-btn">تحديث</button>
        </div>
      </div>
    `}).join('');

    qa('.update-profile-btn', list).forEach((button) => {
      button.addEventListener('click', async () => {
        const row = button.closest('.table-row');
        const userId = row?.dataset?.userId;
        const role = row?.querySelector('.role-select')?.value;
        if (!userId || !role) return;

        const { error } = await sb.from('profiles').update({ role }).eq('id', userId);
        if (error) {
          alert(`خطأ: ${error.message}`);
          return;
        }

        alert('تم التحديث بنجاح ✅');
        const ctx = await getContext();
        renderNav(ctx);
      });
    });
  }

  async function loadAdminData() {
    const { data: settingsData, error: settingsError } = await sb.from('site_settings').select('*');
    if (settingsError) throw settingsError;

    const settings = new Map((settingsData || []).map((row) => [row.setting_key, row.setting_value]));
    const status = q('#recruitmentStatus');
    const link = q('#recruitmentLink');
    const headPhone = q('#prHeadPhone');
    const subPhone = q('#prSubPhone');

    if (status) status.value = isTruthySetting(settings.get('recruitment_status')) ? 'open' : 'close';
    if (link) link.value = settings.get('recruitment_link') || '';
    if (headPhone) headPhone.value = settings.get('pr_head_phone') || '';
    if (subPhone) subPhone.value = settings.get('pr_sub_phone') || '';

    const eventsList = q('#eventsManagementList');
    if (eventsList) {
      const { data: events, error } = await sb.from('events').select('*').order('id', { ascending: false });
      if (error) throw error;
      if (!events?.length) {
        eventsList.innerHTML = '<div class="empty-state">لا توجد فعاليات لإدارتها.</div>';
      } else {
        eventsList.innerHTML = events.map((event) => `
          <div class="management-item">
            <div class="meta">
              <strong>${escapeHtml(event.title)}</strong>
              <span>${escapeHtml(event.description || '')}</span>
            </div>
            <div class="controls">
              <button type="button" class="cta-btn danger delete-event-btn" data-id="${escapeHtml(event.id)}">Delete</button>
            </div>
          </div>
        `).join('');
        
        const memoriesList = q("#memoriesManagementList");

if (memoriesList) {

  const { data: memories } = await sb
    .from("memories")
    .select("*")
    .order("id", { ascending: false });

  memoriesList.innerHTML = "";

  memories.forEach(mem => {

    memoriesList.innerHTML += `
      <div class="management-item">
        <div class="meta">
          <strong>${mem.author_name}</strong>
          <span>${mem.memory_text}</span>
        </div>

        <div class="controls">
          <button
            class="cta-btn danger"
            onclick="deleteMemory(${mem.id})">
            Delete
          </button>
        </div>
      </div>
    `;
  });
}

        qa('.delete-event-btn', eventsList).forEach((button) => {
          button.addEventListener('click', async () => {
            const id = button.dataset.id;
            if (!id) return;
            if (!confirm('حذف الإيفنت نهائياً؟')) return;
            const { error } = await sb.from('events').delete().eq('id', id);
            if (error) {
              alert(`خطأ: ${error.message}`);
              return;
            }
            await loadAdminData();
          });
        });
      }
    }
    await loadMemoriesManagement();
    await renderProfilesManagement();
  }
  
  async function setupAdmin(ctx) {
    if (ctx.role !== 'head') {
      window.location.href = 'index.html';
      return;
    }

    setVisible(q('#adminLoader'), false);
    setVisible(q('#adminContent'), true);

    const settingsForm = q('#settingsForm');
    const addEventForm = q('#addEventForm');
    const addGalleryForm = q('#addGalleryImageForm');

    settingsForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const msg = q('#settingsMsg');
      setMessage(msg, 'جاري الحفظ...', '');

      const payload = [
        { setting_key: 'recruitment_status', setting_value: q('#recruitmentStatus')?.value || 'close' },
        { setting_key: 'recruitment_link', setting_value: q('#recruitmentLink')?.value || '' },
        { setting_key: 'pr_head_phone', setting_value: q('#prHeadPhone')?.value || '' },
        { setting_key: 'pr_sub_phone', setting_value: q('#prSubPhone')?.value || '' }
      ];

      const { error } = await sb.from('site_settings').upsert(payload, { onConflict: 'setting_key' });
      if (error) return setMessage(msg, `خطأ: ${error.message}`, 'error');
      setMessage(msg, 'تم الحفظ بنجاح ✅', 'success');
      await syncHome(ctx);
    });

    addEventForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const msg = q('#eventMsg');
      const btn = q('#eventSubmitBtn');
      const files = Array.from(q('#eventImgFile')?.files || []);
      const title = q('#eventTitle')?.value.trim() || '';
      const description = q('#eventDesc')?.value.trim() || '';
      const actionLink = q('#eventLink')?.value.trim() || '';

      if (!title || !description || !files.length) return setMessage(msg, 'املأ البيانات واختر صورة واحدة على الأقل.', 'error');
      setBusy(btn, true, 'جاري النشر...', 'نشر الإيفنت 🚀');
      setMessage(msg, 'جاري النشر...', '');

      try {
        const urls = [];
        for (const file of files) {
          const url = await uploadImage(file, 'events');
          if (url) urls.push(url);
        }

        const { error } = await sb.from('events').insert([{
          title,
          description,
          image_url: urls.join(','),
          action_link: actionLink || null
        }]);

        if (error) throw error;
        setMessage(msg, 'تم النشر ✅', 'success');
        q('#addEventForm')?.reset();
        await loadAdminData();
      } catch (err) {
        setMessage(msg, `خطأ: ${err.message}`, 'error');
      } finally {
        setBusy(btn, false, '', 'نشر الإيفنت 🚀');
      }
      const memoriesList =
document.querySelector("#memoriesManagementList");

if(memoriesList){

  const { data: memories } =
  await sb.from("memories")
  .select("*")
  .order("id",{ascending:false});

  memoriesList.innerHTML="";

  memories.forEach(mem=>{

    memoriesList.innerHTML += `
      <div class="management-item">
        <div class="meta">
          <strong>${mem.author_name}</strong>
          <span>${mem.memory_text}</span>
        </div>

        <div class="controls">
          <button
            class="cta-btn danger"
            onclick="deleteMemory(${mem.id})">
            Delete
          </button>
        </div>
      </div>
    `;

  });

}
      window.deleteMemory = async(id)=>{

  if(!confirm("حذف الذكرى نهائياً؟"))
    return;

  await sb
    .from("memories")
    .delete()
    .eq("id",id);

  location.reload();
};
    });

    addGalleryForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const msg = q('#galleryMsg');
      const btn = q('#gallerySubmitBtn');
      const files = Array.from(q('#galleryImgFile')?.files || []);
      const sectionName = q('#gallerySectionName')?.value.trim() || '';

      if (!sectionName || !files.length) return setMessage(msg, 'اكتب اسم السكشن واختر صورة واحدة على الأقل.', 'error');
      setBusy(btn, true, `جاري رفع ${files.length} صورة...`, 'رفع الصورة للمعرض 🖼️');
      setMessage(msg, 'جاري الرفع...', '');

      try {
        for (const file of files) {
          const url = await uploadImage(file, 'gallery');
          const { error } = await sb.from('gallery_images').insert([{
            section_name: sectionName,
            image_url: url
          }]);
          if (error) throw error;
        }

        setMessage(msg, 'تمت الإضافة بنجاح ✅', 'success');
        q('#addGalleryImageForm')?.reset();
      } catch (err) {
        setMessage(msg, `خطأ: ${err.message}`, 'error');
      } finally {
        setBusy(btn, false, '', 'رفع الصورة للمعرض 🖼️');
      }
// إضافة مجتمع ثقافي
    q('#addCulturalForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const { error } = await sb.from('cultural_resources').insert([{
        section_name: q('#cultSection').value, title: q('#cultTitle').value,
        resource_url: q('#cultLink').value, is_premium_only: q('#cultPremium').value === 'true'
      }]);
      if(error) alert(error.message); else { alert('تم!'); q('#addCulturalForm').reset(); }
    });

    // إضافة مشروع
    q('#addProjectForm')?.addEventListener('submit', async(e)=>{ 
      e.preventDefault(); const btn = q('#addProjectForm button'); setBusy(btn, true, 'جاري الرفع...', 'إضافة المشروع 💡');
      const files = Array.from(q('#projImgFile').files); let urls = [];
      for(let f of files) urls.push(await uploadImage(f, 'projects'));
      await sb.from('member_projects').insert([{ project_title: q('#projTitle').value, description: q('#projDesc').value, contact_phone: q('#projPhone').value, social_link: q('#projSocial').value, project_link: q('#projLink').value, image_url: urls.join(',') }]); 
      alert('تم الإضافة!'); q('#addProjectForm').reset(); setBusy(btn, false, '', 'إضافة المشروع 💡');
    });

// ==========================================
    // 🧠 ميزة الأقسام الذكية (جلب السكاشن السابقة)
    // ==========================================
    async function loadExistingSections() {
      try {
        // 1. جلب أقسام المعرض
        const { data: galData } = await sb.from('gallery_images').select('section_name');
        const galSections = [...new Set((galData || []).map(i => i.section_name))]; // حذف التكرار
        const galList = q('#gallerySectionsList');
        if (galList) galList.innerHTML = galSections.map(s => `<option value="${escapeHtml(s)}">`).join('');

        // 2. جلب أقسام المجتمع الثقافي
        const { data: cultData } = await sb.from('cultural_resources').select('section_name');
        const cultSections = [...new Set((cultData || []).map(i => i.section_name))]; // حذف التكرار
        const cultList = q('#cultSectionsList');
        if (cultList) cultList.innerHTML = cultSections.map(s => `<option value="${escapeHtml(s)}">`).join('');
      } catch (err) {
        console.error("Error loading sections:", err);
      }
    }
    
    // استدعاء الدالة فوراً عند فتح الداشبورد
    await loadExistingSections();
    // تحميل وإدارة صور المعرض للحذف
    async function loadAdminGallery() {
      const list = q('#galleryManagementList'); if(!list) return;
      const { data } = await sb.from('gallery_images').select('*').order('id', { ascending: false });
      if(!data?.length) return list.innerHTML = '<div class="empty-state">المعرض فارغ.</div>';
      list.innerHTML = data.map(img => `<div class="management-item" style="display:flex; justify-content:space-between; align-items:center;"> <div style="display:flex; gap:15px; align-items:center;"><img src="${escapeHtml(img.image_url)}" style="width:60px; height:60px; object-fit:cover; border-radius:10px; border:1px solid var(--accent);"> <strong>${escapeHtml(img.section_name)}</strong></div> <button type="button" class="cta-btn danger" onclick="deleteGalleryImg(${img.id})">حذف</button> </div>`).join('');
    }
    window.deleteGalleryImg = async (id) => { if(confirm("حذف الصورة نهائياً؟")) { await sb.from('gallery_images').delete().eq('id', id); loadAdminGallery(); } };
    await loadAdminGallery();
    await loadAdminGallery();
    });

    await loadAdminData();
  }

  function initAnimations() {
    if (typeof window.AOS !== 'undefined') {
      window.AOS.init({ duration: 800, once: true, offset: 40 });
    }

    if (q('#particles-js') && typeof window.particlesJS === 'function') {
      window.particlesJS('particles-js', {
        particles: {
          number: { value: 60 },
          color: { value: '#ffffff' },
          size: { value: 2, random: true },
          line_linked: { enable: true, color: '#39ff14', opacity: 0.2 },
          move: { enable: true, speed: 1.2 }
        },
        interactivity: {
          events: {
            onhover: { enable: true, mode: 'bubble' }
          }
        }
      });
    }
  }

// ==========================================
  // نافذة تعديل البروفايل الشخصي (Modal)
  // ==========================================
  window.openProfileEditor = function(ctx) {
    // لو النافذة مفتوحة مسبقاً، نقفلها
    if (document.getElementById('profileModal')) return;

    const modal = document.createElement('div');
    modal.className = 'gateway-overlay'; // بنستخدم نفس استايل البوابة عشان الشياكة
    modal.id = 'profileModal';
    modal.style.zIndex = '9999';
    
    modal.innerHTML = `
      <div class="gateway-box" style="text-align: right; direction: rtl; max-width: 400px;">
        <h2 style="color: var(--accent); margin-bottom: 20px;"><i class="fa-solid fa-user-astronaut"></i> تعديل بياناتي</h2>
        <form id="profileUpdateForm" class="table-like">
          <div class="admin-form-group">
            <label>الاسم بالكامل</label>
            <input type="text" id="editProfileName" value="${escapeHtml(ctx.profile?.full_name || '')}" required style="background: rgba(0,0,0,0.5);">
          </div>
          <div class="admin-form-group" style="margin-top: 15px;">
            <label>الصورة الشخصية (اختياري)</label>
            <input type="file" id="editProfileAvatar" accept="image/*" class="file-input">
          </div>
          <div style="display: flex; gap: 10px; margin-top: 25px;">
            <button type="submit" class="cta-btn primary-btn" style="flex: 1;" id="saveProfileBtn">حفظ 💾</button>
            <button type="button" class="cta-btn danger" style="flex: 1;" onclick="document.getElementById('profileModal').remove()">إلغاء</button>
          </div>
          <p id="profileUpdateMsg" class="auth-msg" style="margin-top: 15px;"></p>
        </form>
      </div>
    `;
    
    document.body.appendChild(modal);

    // برمجة زرار الحفظ
    document.getElementById('profileUpdateForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = document.getElementById('profileUpdateMsg');
      const btn = document.getElementById('saveProfileBtn');
      const newName = document.getElementById('editProfileName').value.trim();
      const fileInput = document.getElementById('editProfileAvatar').files[0];

      setBusy(btn, true, 'جاري الحفظ...', 'حفظ 💾');
      setMessage(msg, 'جاري الحفظ...', '');

      try {
        let updates = { full_name: newName };

        // لو اختار صورة جديدة، نرفعها الأول
        if (fileInput) {
           setMessage(msg, 'جاري رفع الصورة السحابية...', '');
           const newAvatarUrl = await uploadImage(fileInput, 'avatars');
           if (newAvatarUrl) updates.avatar_url = newAvatarUrl;
        }

        // تحديث قاعدة البيانات
        const { error } = await sb.from('profiles').update(updates).eq('id', ctx.session.user.id);
        if (error) throw error;

        setMessage(msg, 'تم التحديث بنجاح! ✅ جاري التحميل...', 'success');
        setTimeout(() => location.reload(), 1000);
      } catch (err) {
        setMessage(msg, 'خطأ: ' + err.message, 'error');
        setBusy(btn, false, '', 'حفظ 💾');
      }
    });
  };

  async function initPage() {
    initAnimations();

    const ctx = await getContext();
    renderNav(ctx);

    const page = getPageKey();
    const isHome = page === 'home' || page === 'index';

    if (isHome) {
   
      await syncHome(ctx);
    }

    if (page === 'auth') {
      if (ctx.session) {
        window.location.href = ctx.role === 'head' ? 'admin.html' : 'index.html';
        return;
      }
      setupAuth();
    }

    if (page === 'events') {
      await loadEvents();
    }

    if (page === 'gallery') {
      await loadGallery(ctx);
    }

    if (page === 'memories') {
      const form = q('#memoryForm');
      const submitBtn = q('#submitMemoryBtn');
      if (!ctx.session) {
        if (form) {
          const note = q('#memoryMsg');
          setMessage(note, 'يجب تسجيل الدخول لنشر الذكريات.', 'error');
          if (submitBtn) submitBtn.disabled = true;
        }
      }

      form?.addEventListener('submit', (event) => handleMemorySubmit(event, ctx));
      await loadMemories(ctx);
    }

    if (page === 'admin') {
      await setupAdmin(ctx);
    }

if (page === 'cultural') await loadCultural(ctx);
    if (page === 'internships') await loadInternships(ctx);
    if (page === 'projects') await loadProjects();
  }

  window.handleLogout = handleLogout;
  window.selectRole = selectRole;
  window.switchTab = switchTab;
  window.openApplicationForm = openApplicationForm;
  window.loginAction = loginAction;
  window.signupAction = signupAction;

  window.addEventListener('DOMContentLoaded', initPage);

  async function loadMemoriesManagement() {

  const memoriesList = q("#memoriesManagementList");

  if (!memoriesList) return;

  const { data: memories, error } = await sb
    .from("memories")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  memoriesList.innerHTML = "";

  memories.forEach(mem => {

    memoriesList.innerHTML += `
      <div class="management-item">
        <div class="meta">
          <strong>${mem.author_name}</strong>
          <span>${mem.memory_text}</span>
        </div>

        <div class="controls">
          <button
            class="cta-btn danger"
            onclick="deleteMemory(${mem.id})">
            حذف
          </button>
        </div>
      </div>
    `;
  });
}

window.deleteMemory = async function(id) {

  if (!confirm("حذف الذكرى؟"))
    return;

  const { error } = await sb
    .from("memories")
    .delete()
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  await loadMemoriesManagement();
};
})();