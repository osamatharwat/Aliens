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

    if (ctx.role === 'head' || ctx.role === 'member') {
      navItems.push(['memories.html', 'الذكريات']);
    }

    if (ctx.role === 'head') {
      navItems.push(['admin.html', 'Dashboard']);
    }

    links.innerHTML = navItems
      .map(([href, label]) => `<a href="${href}" class="nav-link ${path === href ? 'active' : ''}">${label}</a>`)
      .join('');

    if (ctx.session) {
      const roleLabel = ctx.role === 'head' ? 'Head' : 'Member';
      links.innerHTML += `<span class="user-chip">${escapeHtml(ctx.profile?.full_name || ctx.session.user.email || 'User')} · ${roleLabel}</span>`;
      actions.innerHTML = `<button type="button" class="nav-btn danger" id="logoutBtn">Logout</button>`;
      q('#logoutBtn')?.addEventListener('click', handleLogout);
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
    const msg = q('#signupMsg');

    if (!sb) return setMessage(msg, 'Supabase غير متصل.', 'error');
    if (!name || !username || !email || !password) return setMessage(msg, 'املأ كل البيانات.', 'error');
    if (username.includes(' ')) return setMessage(msg, 'اسم المستخدم لازم يكون بدون مسافات.', 'error');
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return setMessage(msg, 'اسم المستخدم: حروف إنجليزية / أرقام / underscore فقط.', 'error');
    if (password.length < 6) return setMessage(msg, 'كلمة المرور لازم 6 أحرف على الأقل.', 'error');

    setMessage(msg, 'جاري إنشاء الحساب...', '');

    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          username
        }
      }
    });

    if (error) return setMessage(msg, `خطأ: ${error.message}`, 'error');

    const userId = data?.user?.id;
    if (userId) {
      try {
        await sb.from('profiles').upsert({
          id: userId,
          full_name: name,
          username,
          email,
          role: 'member'
        });
const { data, error } = await sb.auth.signUp({
  email,
  password: pw
});

if (!error) {

  await sb.from('profiles').insert([
    {
      id: data.user.id,
      username: user.toLowerCase(),
      full_name: name,
      email: email,
      role: 'member'
    }
  ]);
}
      } catch (err) {
        console.warn('Profile upsert skipped:', err);
      }
    }

    q('#signupForm')?.reset();
    setMessage(msg, 'تم التسجيل بنجاح. راجع بريدك للتفعيل ثم سجّل الدخول.', 'success');
    switchTab('login');
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
      const urls = safeUrlList(mem.image_url);
      return `
        <article class="memory-card">
          <div class="memory-author">${escapeHtml(mem.author_name || 'Anonymous')}</div>
          <div class="memory-content">${escapeHtml(mem.memory_text || '')}</div>
          ${urls.length ? sliderMarkup(urls, 'slider-img', 'mt-10') : ''}
          ${ctx?.session ? '' : '<div class="memory-timestamp">سجل دخولك لنشر ذكريات جديدة.</div>'}
        </article>
      `;
    }).join('');
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

    list.innerHTML = data.map((user) => `
      <div class="table-row" data-user-id="${escapeHtml(user.id)}">
        <div class="main">
          <div class="title">${escapeHtml(user.full_name || user.username || user.email || user.id)}</div>
          <div class="sub">${escapeHtml(user.email || '')}</div>
        </div>
        <div class="actions">
          <select class="role-select">
            <option value="member" ${user.role === 'member' ? 'selected' : ''}>Member</option>
            <option value="head" ${user.role === 'head' ? 'selected' : ''}>Head</option>
          </select>
          <button type="button" class="cta-btn primary-btn update-profile-btn">تحديث</button>
        </div>
      </div>
    `).join('');

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

  async function initPage() {
    initAnimations();

    const ctx = await getContext();
    renderNav(ctx);

    const page = getPageKey();
    const isHome = page === 'home' || page === 'index';

    if (isHome) {
      const gateway = q('#roleGateway');
      if (gateway && (ctx.session || localStorage.getItem(GUEST_ROLE_KEY) === 'guest')) {
        gateway.style.display = 'none';
      }
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
