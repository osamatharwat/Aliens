
(() => {
  const SUPABASE_URL = window.SUPABASE_URL || 'https://hvvfvsugamyexvvqhzkw.supabase.co';
  const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'sb_publishable_yi8j0Z12YJB9w4eW4IU0Cg_S_tjGs-Q';
  const STORAGE_BUCKET = 'aliens_images';
  const RECRUITMENT_FALLBACK_LINK = 'https://forms.gle/YourActualStudentFormLink';
  const GUEST_ROLE_KEY = 'aliens_role';
  const ENTRY_ROLE_KEY = 'aliens_entry_role';
  const CV_DRAFT_KEY = 'aliens_cv_draft_v2';
  const ANALYTICS_FALLBACK_KEY = 'aliens_analytics_queue_v1';
  const NOTIFICATION_QUEUE_KEY = 'aliens_notifications_v1';
  const STORE_PROMPT_KEY = 'aliens_store_prompt_seen_v1';

  const sb = window.supabase
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      })
    : null;

  window.sb = sb;

  const state = {
    session: null,
    profile: null,
    role: null,
    cache: {
      pageData: new Map(),
      galleryLikes: new Map(),
      currentUserLikes: new Set()
    }
  };

  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const getFileName = () => (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const getPageKey = () => (document.body?.dataset?.page || getFileName().replace('.html', '') || 'home').toLowerCase();
  const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
  const isTruthySetting = (value) => ['open', '1', 'true', 'yes', 'on'].includes(String(value ?? '').trim().toLowerCase());

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  })[ch]);

  const safeText = (value, fallback = '') => {
    const text = String(value ?? '').trim();
    return text || fallback;
  };

  const normalizeUsername = (value) => String(value || '').trim().toLowerCase();
  const normalizePhone = (value) => String(value || '').replace(/[^\d+]/g, '');
  const safePhone = (value) => String(value || '').replace(/\D/g, '');
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

  const toArray = (value) => Array.isArray(value) ? value : (value == null ? [] : [value]);
  const unique = (items) => Array.from(new Set(items.filter(Boolean)));

  const debounce = (fn, delay = 160) => {
    let timer = null;
    return (...args) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => fn(...args), delay);
    };
  };

  function buildToolbar(target, placeholder, badgeHtml = '') {
    const host = typeof target === 'string' ? q(target) : target;
    if (!host) return null;

    const wrap = document.createElement('div');
    wrap.className = 'page-toolbar';
    wrap.innerHTML = `
      <div class="toolbar-group">
        ${badgeHtml || ''}
      </div>
      <div class="toolbar-group" style="justify-content:flex-end;">
        <input class="search-input" type="search" inputmode="search" autocomplete="off" placeholder="${escapeHtml(placeholder || 'ابحث...')}">
      </div>
    `;
    host.appendChild(wrap);
    return wrap;
  }

  async function ensureRecruitmentState() {
    if (typeof window.__recruitmentOpen === 'boolean' && typeof window.__recruitmentLink === 'string') {
      return { open: window.__recruitmentOpen, link: window.__recruitmentLink };
    }

    try {
      if (!sb) {
        window.__recruitmentOpen = false;
        window.__recruitmentLink = RECRUITMENT_FALLBACK_LINK;
        return { open: false, link: RECRUITMENT_FALLBACK_LINK };
      }

      const { data } = await sb.from('site_settings').select('*');
      const settings = new Map((data || []).map((row) => [row.setting_key, row.setting_value]));
      const open = isTruthySetting(settings.get('recruitment_status'));
      const link = safeUrl(settings.get('recruitment_link')) || RECRUITMENT_FALLBACK_LINK;
      window.__recruitmentOpen = open;
      window.__recruitmentLink = link;
      return { open, link };
    } catch {
      window.__recruitmentOpen = false;
      window.__recruitmentLink = RECRUITMENT_FALLBACK_LINK;
      return { open: false, link: RECRUITMENT_FALLBACK_LINK };
    }
  }

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

  function showToast(message, kind = 'info') {
    let wrap = q('#toastContainer');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'toastContainer';
      wrap.style.cssText = 'position:fixed; inset:auto 16px 16px auto; display:grid; gap:10px; z-index:4000; width:min(360px, calc(100vw - 32px)); pointer-events:none;';
      document.body.appendChild(wrap);
    }

    const item = document.createElement('div');
    item.className = `page-tag ${kind}`;
    item.setAttribute('role', 'status');
    item.style.justifyContent = 'space-between';
    item.style.background = 'rgba(5,8,15,.95)';
    item.style.borderColor = 'rgba(255,255,255,.08)';
    item.style.color = '#fff';
    item.style.boxShadow = '0 14px 36px rgba(0,0,0,.45)';
    item.textContent = message;
    wrap.appendChild(item);
    window.setTimeout(() => {
      item.style.opacity = '0';
      item.style.transform = 'translateY(8px)';
      item.style.transition = 'all .3s ease';
      window.setTimeout(() => item.remove(), 300);
    }, 2500);
  }

  function sliderMarkup(urls, imgClass = 'slider-img', wrapperClass = '') {
    const list = unique(urls.map((url) => safeUrl(url)).filter(Boolean));
    if (!list.length) return '';
    if (list.length === 1) {
      return `<img class="${imgClass}" src="${escapeHtml(list[0])}" alt="image" loading="lazy">`;
    }
    return `
      <div class="slider-container ${wrapperClass}">
        <div class="image-slider">
          ${list.map((url) => `<img class="${imgClass}" src="${escapeHtml(url)}" alt="image" loading="lazy">`).join('')}
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

  function validateImageFile(file, maxMB = 5) {
    if (!file) return 'الملف غير موجود.';
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
    if (!allowed.includes(file.type)) return 'الملف لازم يكون صورة.';
    if (file.size > maxMB * 1024 * 1024) return `حجم الصورة أكبر من ${maxMB}MB.`;
    return '';
  }

  function validatePdfFile(file, maxMB = 8) {
    if (!file) return 'الملف غير موجود.';
    if (!['application/pdf'].includes(file.type)) return 'الملف لازم يكون PDF.';
    if (file.size > maxMB * 1024 * 1024) return `حجم الملف أكبر من ${maxMB}MB.`;
    return '';
  }

  async function uploadImage(file, folder) {
    if (!sb || !file) return null;
    const err = validateImageFile(file);
    if (err) throw new Error(err);
    const path = uploadPath(folder, file);
    const { error } = await sb.storage.from(STORAGE_BUCKET).upload(path, file, { upsert: false });
    if (error) throw error;
    const { data } = sb.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return data?.publicUrl || null;
  }

  async function uploadImages(files, folder, maxCount = 6) {
    const safeFiles = toArray(files).slice(0, maxCount);
    const urls = [];
    for (const file of safeFiles) {
      const url = await uploadImage(file, folder);
      if (url) urls.push(url);
    }
    return urls;
  }

  async function getContext() {
    if (state.session) return state;
    if (!sb) return state;

    const { data: sessionData, error: sessionError } = await sb.auth.getSession();
    if (sessionError || !sessionData?.session) return state;

    const session = sessionData.session;
    state.session = session;

    try {
      const { data: profile } = await sb
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();
      
      state.profile = profile;
      state.role = profile?.role || 'member';
    } catch (err) {
      console.warn('Profile load failed:', err);
    }
    return state;
  }

  async function recordAnalytics(eventName, meta = {}) {
    const page = getPageKey();
    const payload = {
      event_name: eventName,
      page_name: page,
      meta: JSON.stringify(meta || {}),
      user_id: state.session?.user?.id || null
    };

    try {
      if (sb) {
        const { error } = await sb.from('analytics_events').insert([payload]);
        if (!error) return;
      }
    } catch (err) {
      // ignore table absence
    }

    try {
      const queue = JSON.parse(localStorage.getItem(ANALYTICS_FALLBACK_KEY) || '[]');
      queue.push({ ...payload, created_at: new Date().toISOString() });
      localStorage.setItem(ANALYTICS_FALLBACK_KEY, JSON.stringify(queue.slice(-50)));
    } catch {
      // ignore
    }
  }

  async function queueNotification(notification = {}) {
    const payload = {
      title: safeText(notification.title, 'Aliens Space'),
      body: safeText(notification.body, ''),
      audience_role: notification.audience_role || 'all',
      target_url: notification.target_url || '',
      kind: notification.kind || 'info',
      created_at: new Date().toISOString(),
      is_read: false
    };

    try {
      if (sb) {
        const { error } = await sb.from('notifications').insert([payload]);
        if (!error) return payload;
      }
    } catch {
      // ignore and fall back locally
    }

    try {
      const current = JSON.parse(localStorage.getItem(NOTIFICATION_QUEUE_KEY) || '[]');
      current.unshift(payload);
      localStorage.setItem(NOTIFICATION_QUEUE_KEY, JSON.stringify(current.slice(0, 30)));
    } catch {
      // ignore
    }

    return payload;
  }

  function getSearchableText(item, fields) {
    return fields.map((field) => String(item?.[field] ?? '')).join(' ').toLowerCase();
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

 async function openApplicationForm() {
    const state = await ensureRecruitmentState();
    if (!state.open) {
      showToast('باب التقديم مغلق حاليًا، انتظرنا في الموسم القادم!', 'warning');
      return;
    }

    // 1. قاموس توصيف اللجان (تقدر تعدل الكلام المكتوب ده براحتك بعدين)
    const committeeDetails = {
      pr: "مسؤولة عن بناء علاقات قوية، التعامل مع الرعاة (Sponsors) والمتحدثين، وتمثيل التيم خارجياً. (المهارات: تواصل ممتاز، تفاوض، لباقة).",
      media: "مسؤولة عن التصوير، المونتاج، وتوثيق كل أحداث التيم. (المهارات: خبرة في استخدام الكاميرا أو برامج المونتاج زي Premiere).",
      ir: "مسؤولة عن متابعة أعضاء التيم، حل المشاكل الداخلية، وتقييم الأداء (HR). (المهارات: ذكاء اجتماعي، حيادية، وقدرة على الاستماع).",
      marketing: "مسؤولة عن إدارة صفحات السوشيال ميديا، كتابة المحتوى (Copywriting)، وعمل خطط تسويقية. (المهارات: إبداع، فهم للسوشيال ميديا).",
      magic_hand: "مسؤولة عن التصميم الجرافيكي، الديكورات، وأي حاجة محتاجة لمسة فنية. (المهارات: ذوق فني، خبرة ببرامج التصميم أو الأعمال اليدوية).",
      charity: "مسؤولة عن تنظيم القوافل الطبية، حملات التبرع، والأعمال الخيرية. (المهارات: حب العمل التطوعي، قدرة على التنظيم والمساعدة).",
      event_planning: "مسؤولة عن تنظيم الإيفنتات على أرض الواقع، حجز القاعات، واللوجستيات. (المهارات: إدارة الوقت، تخطيط، وتصرف سريع تحت الضغط).",
      secretariat: "مسؤولة عن التنظيم الإداري، كتابة التقارير، تسجيل الغياب، والمهام الورقية. (المهارات: دقة، تنظيم، وإجادة برامج الأوفيس)."
    };

    let modal = q('#applyModal');
    if (!modal) {
      // 2. تصميم الفورم المنبثق (Modal)
      modal = document.createElement('div');
      modal.id = 'applyModal';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-card" style="max-width: 600px;">
          <div class="modal-header">
            <div>
              <h3 style="margin:0 0 6px; color: var(--accent);"><i class="fa-solid fa-rocket"></i> نموذج الانضمام للمركبة</h3>
              <p class="safe-note" style="margin:0;">املأ البيانات بدقة، وسيتم التواصل معك من قبل لجنة الـ IR.</p>
            </div>
            <button type="button" class="modal-close" onclick="document.getElementById('applyModal').classList.remove('show')">×</button>
          </div>
          <form id="nativeApplyForm" class="table-like">
            <div class="form-grid">
              <div class="admin-form-group">
                <label>الاسم الرباعي</label>
                <input type="text" id="applyName" required>
              </div>
              <div class="admin-form-group">
                <label>رقم الواتساب (للتواصل)</label>
                <input type="text" id="applyPhone" required placeholder="مثال: 01xxxxxxxxx">
              </div>
              <div class="admin-form-group">
                <label>السنة الدراسية</label>
                <select id="applyLevel" required>
                  <option value="الفرقة الأولى">الفرقة الأولى</option>
                  <option value="الفرقة الثانية">الفرقة الثانية</option>
                  <option value="الفرقة الثالثة">الفرقة الثالثة</option>
                  <option value="الفرقة الرابعة">الفرقة الرابعة</option>
                  <option value="الفرقة الخامسة">الفرقة الخامسة</option>
                  <option value="خريج">خريج</option>
                </select>
              </div>
              <div class="admin-form-group">
                <label>اللجنة المطلوبة (الرغبة الأولى)</label>
                <select id="applyCommittee" required>
                  <option value="" disabled selected>-- اختر لجنتك --</option>
                  <option value="pr">Public Relations (PR)</option>
                  <option value="media">Media</option>
                  <option value="ir">Internal Relations (IR)</option>
                  <option value="marketing">Marketing</option>
                  <option value="magic_hand">Magic Hand</option>
                  <option value="charity">Charity</option>
                  <option value="event_planning">Event Planning</option>
                  <option value="secretariat">Secretariat</option>
                </select>
              </div>
            </div>
            
            <div id="committeeDescBox" style="margin-top: 12px; padding: 14px; background: rgba(57, 255, 20, 0.05); border-right: 3px solid var(--accent); border-radius: 12px; font-size: 0.9rem; line-height: 1.6; display: none;"></div>

            <div class="admin-form-group" style="margin-top: 14px;">
              <label>ليه اختارت اللجنة دي بالتحديد؟ وايه اللي ممكن تقدمه للتيم؟</label>
              <textarea id="applyReason" rows="3" required placeholder="اكتب نبذة مختصرة عن شغفك أو خبرتك..."></textarea>
            </div>
            <div class="form-actions" style="margin-top: 20px;">
              <button type="submit" class="cta-btn primary-btn" id="submitApplyBtn">إرسال الطلب 🚀</button>
            </div>
            <p id="applyMsg" class="auth-msg"></p>
          </form>
        </div>
      `;
      document.body.appendChild(modal);

     // 3. قفل النافذة لو ضغط بره الكارت (ميزة إضافية)
      modal.onclick = function(e) {
        if (e.target === modal) {
          modal.classList.remove('show');
        }
      };

      // 4. التفاعل الذكي (Live Description) للجان
      const committeeSelect = q('#applyCommittee', modal);
      const descBox = q('#committeeDescBox', modal);
      
      committeeSelect.addEventListener('change', (e) => {
        const selectedValue = e.target.value;
        if (committeeDetails[selectedValue]) {
          descBox.style.display = 'block';
          descBox.innerHTML = `<strong style="color:var(--accent);"><i class="fa-solid fa-circle-info"></i> عن اللجنة:</strong> <br> ${committeeDetails[selectedValue]}`;
        } else {
          descBox.style.display = 'none';
        }
      });

      // 5. إرسال البيانات للـ Supabase
      q('#nativeApplyForm', modal).addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = q('#submitApplyBtn', modal);
        const msg = q('#applyMsg', modal);
        
        const name = q('#applyName', modal).value.trim();
        let rawPhone = q('#applyPhone', modal).value.trim();
        
        let cleanPhone = rawPhone.replace(/\D/g, ''); // مسح أي مسافات أو حروف
        if (cleanPhone.startsWith('20')) {
          // الرقم سليم ومكتوب بالكود
        } else if (cleanPhone.startsWith('0')) {
          cleanPhone = '20' + cleanPhone.substring(1); // تحويل 010 إلى 2010
        } else {
          cleanPhone = '20' + cleanPhone; // تحويل 10 إلى 2010
        }
        const phone = cleanPhone; // دلوقتي الرقم جاهز 100% للواتساب

        const level = q('#applyLevel', modal).value;
        const committee = q('#applyCommittee', modal).value;
        const committeeName = q('#applyCommittee', modal).options[q('#applyCommittee', modal).selectedIndex].text;
        const reason = q('#applyReason', modal).value.trim();

        if (!committee) return setMessage(msg, 'يرجى اختيار اللجنة المطلوبة.', 'warning');
        if (!window.sb) return setMessage(msg, 'قاعدة البيانات غير متصلة.', 'error');

        setBusy(btn, true, 'جاري الإرسال...', 'إرسال الطلب 🚀');
        setMessage(msg, 'جاري رفع طلبك للمركبة...', '');
        
        try {
          const { error } = await sb.from('applications').insert([{
            applicant_name: name,
            phone: phone,
            faculty_level: level,
            committee_key: committee,
            committee_name: committeeName,
            role_requested: committee,
            answers: { reason: reason },
            status: 'new'
          }]);

          if (error) throw error;

          showToast('تم إرسال طلبك بنجاح! سيتم التواصل معك قريباً 🛸', 'success');
          modal.classList.remove('show');
          q('#nativeApplyForm', modal).reset();
          descBox.style.display = 'none'; // إخفاء الوصف بعد الإرسال
        } catch (err) {
          setMessage(msg, 'حدث خطأ: ' + err.message, 'error');
        } finally {
          setBusy(btn, false, '', 'إرسال الطلب 🚀');
        }
      });
    }
    
    // إظهار الفورم
    modal.classList.add('show');
  }
  function switchTab(tab) {
    qa('.tab-btn').forEach((btn) => btn.classList.remove('active'));
    qa('.auth-form').forEach((form) => form.classList.remove('active-form'));
    q(`#${tab}TabBtn`)?.classList.add('active');
    q(`#${tab}Form`)?.classList.add('active-form');
  }

  async function resolvePromoRole(code) {
    const normalized = String(code || '').trim().toUpperCase();
    if (!normalized) return 'member';

    const staticMap = new Map([
      ['SP0', 'premium'],
      ['AD0', 'moderator'],
      ['MOD0', 'moderator']
    ]);
    if (staticMap.has(normalized)) return staticMap.get(normalized);

    if (!sb) return 'member';
    try {
      const { data, error } = await sb.from('promo_codes').select('code, role, is_used').eq('code', normalized).limit(1).maybeSingle();
      if (error || !data) return 'member';
      if (data.is_used) return 'member';
      await sb.from('promo_codes').update({ is_used: true }).eq('code', normalized);
      return data.role || 'premium';
    } catch {
      return 'member';
    }
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
        .maybeSingle();

      if (error || !profile) {
        return setMessage(msg, 'اسم المستخدم غير موجود', 'error');
      }
      email = profile.email;
    }

    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return setMessage(msg, `خطأ: ${error.message}`, 'error');

    state.session = data.session || null;
    state.profile = null;
    state.role = null;
    const ctx = await getContext();
    await recordAnalytics('login', { role: ctx.role || 'member' });
    window.location.href = ctx.role === 'head' ? 'admin.html' : 'index.html';
  }

  async function signupAction(event) {
    event.preventDefault();
    const name = q('#signupName')?.value.trim() || '';
    const username = normalizeUsername(q('#signupUsername')?.value);
    const email = q('#signupEmail')?.value.trim() || '';
    const password = q('#signupPassword')?.value || '';
    const promo = q('#signupPromo')?.value.trim() || '';
    const avatarFile = q('#signupAvatar')?.files?.[0] || null;
    const msg = q('#signupMsg');

    if (!sb) return setMessage(msg, 'Supabase غير متصل.', 'error');
    if (!name || !username || !email || !password) return setMessage(msg, 'املأ جميع البيانات المطلوبة.', 'error');
    if (!isEmail(email)) return setMessage(msg, 'البريد الإلكتروني غير صالح.', 'error');
    if (password.length < 6) return setMessage(msg, 'كلمة المرور لازم تكون 6 أحرف على الأقل.', 'error');
    if (!/^[a-z0-9_]+$/.test(username)) return setMessage(msg, 'اسم المستخدم لازم يكون إنجليزي بدون مسافات.', 'error');

    setMessage(msg, 'جاري إنشاء الحساب...', '');

    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, username } }
    });

    if (error) return setMessage(msg, error.message, 'error');

    const userId = data?.user?.id;
    if (userId) {
      let avatarUrl = null;
      if (avatarFile) {
        const validationError = validateImageFile(avatarFile, 4);
        if (validationError) return setMessage(msg, validationError, 'error');
        avatarUrl = await uploadImage(avatarFile, 'avatars');
      }

      const userRole = await resolvePromoRole(promo);

      await sb.from('profiles').upsert({
        id: userId,
        full_name: name,
        username,
        email,
        role: userRole,
        avatar_url: avatarUrl
      }, { onConflict: 'id' });
    }

    await recordAnalytics('signup', { username });
    setMessage(msg, 'تم إنشاء الحساب بنجاح ✅', 'success');
    q('#signupForm')?.reset();
  }

  function setupAuth() {
    const loginForm = q('#loginForm');
    const signupForm = q('#signupForm');
    q('#loginTabBtn')?.addEventListener('click', () => switchTab('login'));
    q('#signupTabBtn')?.addEventListener('click', () => switchTab('signup'));
    loginForm?.addEventListener('submit', loginAction);
    signupForm?.addEventListener('submit', signupAction);
  }

  async function syncHome(ctx) {
    const stateData = await ensureRecruitmentState();
    const open = stateData.open;
    const link = stateData.link;

    const joinBtn = q('#joinTeamBtn');
    const heroBtn = q('#heroActionBtn');
    const statusMsg = q('#recruitmentStatusMsg');
    const memoryNote = q('#memoryAccessNote');
    const headBtn = q('#headWhatsAppBtn');
    const subBtn = q('#subWhatsAppBtn');

    if (joinBtn) {
      joinBtn.disabled = !open;
      joinBtn.textContent = open ? 'Join Our Crew 🛸' : 'Boarding Closed';
      joinBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openApplicationForm();
      });
    }
    
    // معالجة الزرار التانية (لو فيه أكتر من واحد)
    qa('#joinTeamBtn').forEach(btn => {
      btn.disabled = !open;
      btn.textContent = open ? 'Join Our Crew 🛸' : 'Boarding Closed';
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openApplicationForm();
      });
    });

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
      const canWrite = !!ctx.session && (ctx.role === 'member' || ctx.role === 'premium' || ctx.role === 'head');
      memoryNote.textContent = canWrite
        ? 'يمكنك نشر الذكريات الآن.'
        : 'حائط الذكريات متاح بعد تسجيل الدخول كعضو أو مسؤول.';
      setVisible(memoryNote, true);
    }

    let headPhone = '';
    let subPhone = '';
    try {
      if (sb) {
        const { data: rows } = await sb.from('site_settings').select('*');
        const settings = new Map((rows || []).map((row) => [row.setting_key, row.setting_value]));
        headPhone = safePhone(settings.get('pr_head_phone'));
        subPhone = safePhone(settings.get('pr_sub_phone'));
      }
    } catch {
      headPhone = '';
      subPhone = '';
    }
    if (headBtn && headPhone) headBtn.href = `https://wa.me/${headPhone}`;
    if (subBtn && subPhone) subBtn.href = `https://wa.me/${subPhone}`;
  }

  async function fetchTable(table, columns = '*', order = 'id', ascending = false, limit = null) {
    if (!sb) return [];
    let query = sb.from(table).select(columns);
    if (order) query = query.order(order, { ascending });
    if (Number.isFinite(limit)) query = query.limit(limit);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  function sectionedRender(target, sections) {
    target.innerHTML = sections.length ? sections.join('') : '<div class="empty-state">لا توجد بيانات حالياً.</div>';
  }

  function normalizeUrlList(raw) {
    return String(raw || '')
      .split(',')
      .map((item) => safeUrl(item))
      .filter(Boolean);
  }

  async function loadEvents() {
    const grid = q('#eventsGrid');
    if (!grid || !sb) return;
    grid.innerHTML = '';
    const toolbar = buildToolbar(grid, 'ابحث في الفعاليات...', `<span class="page-tag"><i class="fa-solid fa-calendar-days"></i> Events</span>`);
    const search = toolbar?.querySelector('.search-input');
    const events = await fetchTable('events', '*', 'id', false).catch((err) => {
      console.error(err);
      grid.innerHTML = '<div class="empty-state error">تعذر تحميل الفعاليات.</div>';
      return [];
    });

    const render = () => {
      const query = normalizeUsername(search?.value || '');
      const filtered = events.filter((item) => {
        const hay = getSearchableText(item, ['title', 'description', 'action_link']);
        return !query || hay.includes(query);
      });

      grid.innerHTML = filtered.length ? filtered.map((evt) => {
        const urls = normalizeUrlList(evt.image_url);
        const cover = urls.length ? sliderMarkup(urls, 'event-cover') : '';
        const action = safeUrl(evt.action_link) ? `<a class="cta-btn primary-btn" href="${escapeHtml(safeUrl(evt.action_link))}" target="_blank" rel="noopener noreferrer">Join Now</a>` : '';
        return `
          <article class="event-card">
            ${cover}
            <div class="event-card-body">
              <div class="card-meta">
                <span class="badge success"><i class="fa-solid fa-bolt"></i> Event</span>
              </div>
              <h3>${escapeHtml(safeText(evt.title, 'Untitled Event'))}</h3>
              <p>${escapeHtml(safeText(evt.description, ''))}</p>
              <div class="card-actions">${action}</div>
            </div>
          </article>
        `;
      }).join('') : '<div class="empty-state">لا توجد فعاليات مطابقة للبحث.</div>';
    };

    const rerender = debounce(render, 120);
    search?.addEventListener('input', rerender);
    render();
    await recordAnalytics('view_events');
  }

  async function loadMemories(ctx) {
    const grid = q('#memoriesGrid');
    if (!grid || !sb) return;
    grid.innerHTML = '';

    const toolbar = buildToolbar(grid, 'ابحث في الذكريات...', `<span class="page-tag"><i class="fa-solid fa-feather-pointed"></i> Memories</span>`);
    const search = toolbar?.querySelector('.search-input');
    const memories = await fetchTable('memories', '*', 'id', false).catch((err) => {
      console.error(err);
      grid.innerHTML = '<div class="empty-state error">تعذر تحميل الذكريات.</div>';
      return [];
    });

    const render = () => {
      const query = normalizeUsername(search?.value || '');
      const filtered = memories.filter((item) => {
        const hay = getSearchableText(item, ['author_name', 'memory_text', 'author_role']);
        return !query || hay.includes(query);
      });

      grid.innerHTML = filtered.length ? filtered.map((mem) => {
        const roleBadge = mem.author_role === 'head'
          ? '<span class="badge success">Head</span>'
          : mem.author_role === 'premium'
            ? '<span class="badge warning"><i class="fa-solid fa-star"></i> Premium</span>'
            : '<span class="badge">Member</span>';

        const avatarHtml = mem.author_avatar
          ? `<img src="${escapeHtml(mem.author_avatar)}" alt="avatar" style="width:48px;height:48px;border-radius:50%;object-fit:cover;border:2px solid var(--accent);">`
          : `<div style="width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;color:var(--accent);font-size:1.2rem;"><i class="fa-solid fa-user-astronaut"></i></div>`;

        const images = normalizeUrlList(mem.image_url);
        const publishBtn = ctx.session ? `<button type="button" class="cta-btn secondary-btn copy-memory-btn" data-text="${escapeHtml(mem.memory_text)}">نسخ</button>` : '';

        return `
          <article class="memory-card">
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px; padding-bottom:12px; border-bottom:1px solid rgba(255,255,255,0.05);">
              ${avatarHtml}
              <div style="display:flex; flex-direction:column; gap:4px; min-width:0;">
                <strong style="font-size:1rem;">${escapeHtml(mem.author_name || 'Anonymous')}</strong>
                <div class="card-meta">${roleBadge}</div>
              </div>
            </div>
            <p style="line-height:1.8; color:var(--text); white-space:pre-wrap;">${escapeHtml(mem.memory_text || '')}</p>
            ${images.length ? `<div style="margin-top:12px;">${sliderMarkup(images, 'event-cover')}</div>` : ''}
            <div class="card-actions">${publishBtn}</div>
          </article>
        `;
      }).join('') : '<div class="empty-state">لا توجد ذكريات مطابقة للبحث.</div>';
    };

    const rerender = debounce(render, 120);
    search?.addEventListener('input', rerender);

    grid.addEventListener('click', async (event) => {
      const btn = event.target.closest('.copy-memory-btn');
      if (!btn) return;
      const text = btn.dataset.text || '';
      try {
        await navigator.clipboard.writeText(text);
        showToast('تم نسخ الذكرى.', 'success');
      } catch {
        showToast('تعذر النسخ.', 'warning');
      }
    });

    render();
    await recordAnalytics('view_memories');
  }

  async function loadCultural(ctx) {
    const grid = q('#eventsGrid');
    if (!grid || !sb) return;

    const toolbar = buildToolbar(grid, 'ابحث في المجتمع الثقافي...', `<span class="page-tag"><i class="fa-solid fa-book-open"></i> Cultural</span>`);
    const search = toolbar?.querySelector('.search-input');
    const resources = await fetchTable('cultural_resources', '*', 'id', false).catch((err) => {
      console.error(err);
      grid.innerHTML = '<div class="empty-state error">تعذر تحميل المجتمع الثقافي.</div>';
      return [];
    });

    const canAccessPremium = ctx.role === 'premium' || ctx.role === 'head';

    const render = () => {
      const query = normalizeUsername(search?.value || '');
      const filtered = resources.filter((item) => {
        const hay = getSearchableText(item, ['title', 'section_name', 'resource_url']);
        return !query || hay.includes(query);
      });

      grid.innerHTML = filtered.length ? filtered.map((item) => {
        const locked = item.is_premium_only && !canAccessPremium;
        const className = locked ? 'event-card locked-card' : 'event-card';
        const resourceUrl = safeUrl(item.resource_url);
        return `
          <article class="${className}" style="${locked ? 'filter:blur(1.5px);' : ''}">
            <div class="event-card-body">
              <div class="card-meta">
                <span class="badge success">${escapeHtml(item.section_name || 'General')}</span>
                ${item.is_premium_only ? '<span class="badge warning"><i class="fa-solid fa-lock"></i> Premium</span>' : ''}
              </div>
              <h3>${escapeHtml(item.title || 'Resource')}</h3>
              <p>${escapeHtml(item.description || 'مصدر تعليمي ومهني.')}</p>
              ${locked ? '<div class="empty-state error" style="min-height:auto; margin-top:14px;">المحتوى مخصص للمميزين فقط.</div>' : `
                <div class="card-actions">
                  <a class="cta-btn primary-btn" href="${escapeHtml(resourceUrl || '#')}" target="_blank" rel="noopener noreferrer">فتح المصدر</a>
                </div>
              `}
            </div>
          </article>
        `;
      }).join('') : '<div class="empty-state">لا توجد مصادر مطابقة للبحث.</div>';
    };

    const rerender = debounce(render, 120);
    search?.addEventListener('input', rerender);
    render();
    await recordAnalytics('view_cultural');
  }

  async function loadInternships(ctx) {
    const grid = q('#eventsGrid');
    if (!grid || !sb) return;
    const toolbar = buildToolbar(grid, 'ابحث في فرص التدريب...', `<span class="page-tag"><i class="fa-solid fa-briefcase"></i> Internships</span>`);
    const search = toolbar?.querySelector('.search-input');

    if (ctx.role !== 'premium' && ctx.role !== 'head') {
      grid.innerHTML = '<div class="empty-state error">غير مصرح لك بدخول هذه الصفحة.</div>';
      return;
    }

    const internships = await fetchTable('internships', '*', 'id', false).catch((err) => {
      console.error(err);
      grid.innerHTML = '<div class="empty-state error">تعذر تحميل الفرص.</div>';
      return [];
    });

    const render = () => {
      const query = normalizeUsername(search?.value || '');
      const filtered = internships.filter((item) => {
        const hay = getSearchableText(item, ['company_name', 'title', 'description']);
        return !query || hay.includes(query);
      });

      grid.innerHTML = filtered.length ? filtered.map((item) => `
        <article class="event-card" style="border-color:var(--warning);">
          ${item.image_url ? `<img class="event-cover" src="${escapeHtml(safeUrl(item.image_url))}" alt="internship cover" loading="lazy">` : ''}
          <div class="event-card-body">
            <div class="card-meta">
              <span class="badge warning"><i class="fa-solid fa-briefcase"></i> Internship</span>
            </div>
            <h3 style="color:var(--warning);">${escapeHtml(item.company_name || 'Company')}</h3>
            <h4>${escapeHtml(item.title || 'Opportunity')}</h4>
            <p>${escapeHtml(item.description || '')}</p>
            ${safeUrl(item.apply_link) ? `<div class="card-actions"><a class="cta-btn primary-btn" style="background:var(--warning); color:#000;" href="${escapeHtml(safeUrl(item.apply_link))}" target="_blank" rel="noopener noreferrer">تقديم الآن</a></div>` : ''}
          </div>
        </article>
      `).join('') : '<div class="empty-state">لا توجد فرص مطابقة للبحث.</div>';
    };

    const rerender = debounce(render, 120);
    search?.addEventListener('input', rerender);
    render();
    await recordAnalytics('view_internships');
  }

  async function loadProjects() {
    const grid = q('#eventsGrid');
    if (!grid || !sb) return;
    const toolbar = buildToolbar(grid, 'ابحث في مشاريع الأعضاء...', `<span class="page-tag"><i class="fa-solid fa-diagram-project"></i> Projects</span>`);
    const search = toolbar?.querySelector('.search-input');
    const projects = await fetchTable('member_projects', '*, profiles(full_name)', 'id', false).catch((err) => {
      console.error(err);
      grid.innerHTML = '<div class="empty-state error">تعذر تحميل المشاريع.</div>';
      return [];
    });

    const render = () => {
      const query = normalizeUsername(search?.value || '');
      const filtered = projects.filter((item) => {
        const hay = getSearchableText(item, ['project_title', 'description', 'contact_phone', 'social_link', 'project_link']);
        return !query || hay.includes(query);
      });

      grid.innerHTML = filtered.length ? filtered.map((item) => {
        const urls = normalizeUrlList(item.image_url);
        const whatsAppBtn = item.contact_phone
          ? `<a href="https://wa.me/${safePhone(item.contact_phone)}" target="_blank" rel="noopener noreferrer" class="cta-btn primary-btn" style="background:#25d366; color:#000; border:none;"><i class="fa-brands fa-whatsapp"></i> تواصل</a>`
          : '';
        const socialBtn = safeUrl(item.social_link)
          ? `<a href="${escapeHtml(safeUrl(item.social_link))}" target="_blank" rel="noopener noreferrer" class="cta-btn secondary-btn"><i class="fa-solid fa-link"></i> سوشيال</a>`
          : '';
        const projBtn = safeUrl(item.project_link)
          ? `<a href="${escapeHtml(safeUrl(item.project_link))}" target="_blank" rel="noopener noreferrer" class="cta-btn secondary-btn">المشروع</a>`
          : '';

        return `
          <article class="event-card">
            ${urls.length ? sliderMarkup(urls, 'event-cover') : ''}
            <div class="event-card-body">
              <div class="card-meta">
                <span class="badge success"><i class="fa-solid fa-layer-group"></i> Project</span>
              </div>
              <h3>${escapeHtml(item.project_title || 'Project')}</h3>
              <p>${escapeHtml(item.description || '')}</p>
              <div style="color:var(--accent); font-weight:bold; font-size:0.9rem;">صاحب المشروع: ${escapeHtml(item.profiles?.full_name || 'عضو')}</div>
              <div class="card-actions">${whatsAppBtn}${socialBtn}${projBtn}</div>
            </div>
          </article>
        `;
      }).join('') : '<div class="empty-state">لا توجد مشاريع مطابقة للبحث.</div>';
    };

    const rerender = debounce(render, 120);
    search?.addEventListener('input', rerender);
    render();
    await recordAnalytics('view_projects');
  }

  async function loadGallery(ctx) {
    const container = q('#dynamicGalleryContainer');
    if (!container || !sb) return;
    container.innerHTML = '';

    const toolbar = buildToolbar(container, 'ابحث في المعرض...');
    const search = toolbar?.querySelector('.search-input');

    const [images, likes] = await Promise.all([
      fetchTable('gallery_images', '*', 'created_at', true).catch((err) => {
        console.error(err);
        container.innerHTML = '<div class="empty-state error">تعذر تحميل المعرض.</div>';
        return [];
      }),
      fetchTable('gallery_likes', '*', 'id', false).catch(() => [])
    ]);

    const likeCounts = new Map();
    const userLiked = new Set();
    (likes || []).forEach((like) => {
      const key = String(like.image_name);
      likeCounts.set(key, (likeCounts.get(key) || 0) + 1);
      if (ctx.session && like.user_id === ctx.session.user.id) userLiked.add(key);
    });

    const render = () => {
      const query = normalizeUsername(search?.value || '');
      const sections = new Map();

      (images || []).forEach((item) => {
        const hay = getSearchableText(item, ['section_name', 'image_url']);
        if (query && !hay.includes(query)) return;
        const key = item.section_name || 'General';
        if (!sections.has(key)) sections.set(key, []);
        sections.get(key).push(item);
      });

      if (!sections.size) {
        container.innerHTML = '<div class="empty-state">لا توجد صور مطابقة للبحث.</div>';
        return;
      }

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
                  <img src="${escapeHtml(item.image_url)}" alt="gallery image" loading="lazy">
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
            showToast('يجب تسجيل الدخول للإعجاب.', 'warning');
            return;
          }

          const imageId = button.dataset.id;
          const countEl = button.querySelector('.count');
          const isLiked = button.classList.toggle('liked');
          const current = Number(countEl?.textContent || 0);
          if (countEl) countEl.textContent = String(Math.max(0, current + (isLiked ? 1 : -1)));

          try {
            if (isLiked) {
              await sb.from('gallery_likes').insert([{ image_name: imageId, user_id: ctx.session.user.id }]);
            } else {
              await sb.from('gallery_likes').delete().match({ image_name: imageId, user_id: ctx.session.user.id });
            }
            await recordAnalytics(isLiked ? 'gallery_like' : 'gallery_unlike', { image_id: imageId });
          } catch (err) {
            console.error(err);
            showToast('تعذر تحديث الإعجاب.', 'warning');
          }
        });
      });
    };

    const rerender = debounce(render, 120);
    search?.addEventListener('input', rerender);
    render();
    await recordAnalytics('view_gallery');
  }

  async function handleMemorySubmit(event, ctx) {
    event.preventDefault();
    const msg = q('#memoryMsg');
    const btn = q('#submitMemoryBtn');
    const input = q('#memoryImgFile');
    const text = q('#memoryText')?.value.trim() || '';

    if (!ctx?.session) return setMessage(msg, 'يجب تسجيل الدخول لنشر الذكريات.', 'error');
    if (text.length < 5) return setMessage(msg, 'اكتب ذكرى أوضح من 5 أحرف.', 'error');

    const files = Array.from(input?.files || []);
    if (files.some((file) => validateImageFile(file, 4))) {
      return setMessage(msg, 'تأكد أن الصور المرفوعة صيغتها صحيحة وحجمها مناسب.', 'error');
    }

    setBusy(btn, true, files.length ? 'جاري رفع الصور والنشر...' : 'جاري النشر...', 'توثيق ونشر 🚀');
    setMessage(msg, 'جاري النشر...', '');

    try {
      const urls = await uploadImages(files, 'memories', 6);
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
      await queueNotification({ title: 'ذكرى جديدة', body: 'تمت إضافة ذكرى جديدة على حائط الذكريات.', audience_role: 'all', kind: 'memory', target_url: 'memories.html' });
      await recordAnalytics('memory_post');
      await loadMemories(ctx);
    } catch (err) {
      setMessage(msg, `خطأ: ${err.message}`, 'error');
    } finally {
      setBusy(btn, false, '', 'توثيق ونشر 🚀');
    }
  }

 async function openProfileEditor(ctx) {
  if (!ctx?.session) return;

  let modal = q('#profileModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'profileModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-card" style="max-width: 500px;">
        <div class="modal-header">
          <h3>ملفك الشخصي 🛸</h3>
          <button type="button" class="modal-close">×</button>
        </div>
        <form id="profileEditorForm" class="table-like">
          <div class="profile-avatar-section" style="text-align:center; margin: 15px 0;">
            <img id="profileAvatar" src="${ctx.profile?.avatar_url || 'https://via.placeholder.com/100'}" alt="Avatar" style="width:100px; height:100px; border-radius:50%; object-fit:cover; border:2px solid var(--accent);">
            <br>
            <button type="button" class="cta-btn secondary-btn" id="triggerAvatarBtn" style="margin-top:10px;">تغيير الصورة</button>
            <input type="file" id="avatarInput" accept="image/*" style="display:none;">
          </div>
          <div class="admin-form-group">
            <label>الاسم بالكامل</label>
            <input type="text" id="profileEditorName" required value="${escapeHtml(ctx.profile?.full_name || '')}">
          </div>
          <div class="admin-form-group">
            <label>اسم المستخدم</label>
            <input type="text" id="profileEditorUsername" required value="${escapeHtml(ctx.profile?.username || '')}">
          </div>
          <div id="userLiveStatus" style="margin-top: 15px; padding: 10px; border-radius: 8px; background: rgba(57,255,20,0.05); border: 1px solid var(--accent);">
            <div id="liveStatusContent">جاري التحقق...</div>
          </div>
          <button type="submit" class="cta-btn primary-btn" style="width:100%; margin-top:20px;">حفظ التعديلات</button>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
    
    // ربط زر الإغلاق
    modal.querySelector('.modal-close').onclick = () => modal.classList.remove('show');
    
    // ربط زر تغيير الصورة بـ الـ Input المخفي
    q('#triggerAvatarBtn', modal).onclick = () => q('#avatarInput', modal).click();
    
    // معاينة الصورة فوراً
    q('#avatarInput', modal).onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => q('#profileAvatar', modal).src = ev.target.result;
        reader.readAsDataURL(file);
      }
    };
  }

  modal.classList.add('show');

  // جلب الحالة لايف
  window.sb.from('applications')
    .select('status, committee_name')
    .eq('applicant_name', ctx.profile.full_name)
    .maybeSingle()
    .then(({ data }) => {
      const statusDiv = q('#liveStatusContent', modal);
      if (statusDiv) {
        statusDiv.innerHTML = data 
          ? `مقدم على لجنة: <strong>${data.committee_name}</strong><br>الحالة: <strong>${data.status}</strong>`
          : `اللجنة: ${ctx.profile?.committee?.toUpperCase() || 'General'}<br>المنصب: ${ctx.profile?.position || 'Member'}`;
      }
    });

  // منطق الحفظ
  q('#profileEditorForm', modal).onsubmit = async (e) => {
    e.preventDefault();
    const name = q('#profileEditorName', modal).value;
    const username = q('#profileEditorUsername', modal).value;
    const avatarFile = q('#avatarInput', modal).files[0];
    let avatarUrl = ctx.profile?.avatar_url;

    try {
      if (avatarFile) {
        avatarUrl = await window.uploadImage(avatarFile, 'avatars');
      }
      await window.sb.from('profiles').update({ full_name: name, username, avatar_url: avatarUrl }).eq('id', ctx.session.user.id);
      alert('تم الحفظ!');
      window.location.reload();
    } catch (err) {
      alert('خطأ: ' + err.message);
    }
  };
}
async function renderProfilesManagement() {
    const list = q('#profilesManagementList');
    if (!list || !sb) return;

    // بنسحب الداتا الجديدة بما فيها committee و position
    const profiles = await fetchTable('profiles', 'id, full_name, username, email, role, avatar_url, committee, position', 'full_name', true).catch((err) => {
      console.error(err);
      list.innerHTML = '<div class="empty-state error">تعذر تحميل المستخدمين.</div>';
      return [];
    });

    if (!profiles.length) {
      list.innerHTML = '<div class="empty-state">لا توجد بيانات مستخدمين.</div>';
      return;
    }

    const currentUserRole = state.role;

    list.innerHTML = profiles.map((user) => {
      const avatar = user.avatar_url
        ? `<img src="${escapeHtml(user.avatar_url)}" alt="avatar" style="width:45px;height:45px;border-radius:50%;object-fit:cover;border:2px solid var(--accent);">`
        : `<div style="width:45px;height:45px;border-radius:50%;background:rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:center;color:var(--accent);font-size:1.2rem;"><i class="fa-solid fa-user"></i></div>`;
      
      const isTargetOG = user.role === 'OG' || user.position === 'OG';
      const isTargetHead = user.role === 'head' || user.position === 'Head';
      
      const canEdit = currentUserRole === 'OG' || (!isTargetOG && !(currentUserRole === 'head' && isTargetHead));
      
      let actionsHtml = '';
      if (canEdit) {
        // قسمنا التحكم لقائمتين (اللجنة + البوزيشن)
        actionsHtml = `
          <div class="actions" style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
            <select class="committee-select" style="min-width:130px; padding:8px; border-radius:10px; background:rgba(0,0,0,0.6); color:white; border:1px solid rgba(255,255,255,0.15);">
              <option value="none" ${user.committee === 'none' ? 'selected' : ''}>بدون لجنة (General)</option>
              <option value="pr" ${user.committee === 'pr' ? 'selected' : ''}>PR</option>
              <option value="media" ${user.committee === 'media' ? 'selected' : ''}>Media</option>
              <option value="ir" ${user.committee === 'ir' ? 'selected' : ''}>IR</option>
              <option value="marketing" ${user.committee === 'marketing' ? 'selected' : ''}>Marketing</option>
              <option value="magic_hand" ${user.committee === 'magic_hand' ? 'selected' : ''}>Magic Hand</option>
              <option value="charity" ${user.committee === 'charity' ? 'selected' : ''}>Charity</option>
              <option value="secretariat" ${user.committee === 'secretariat' ? 'selected' : ''}>Secretariat</option>
              <option value="event_planning" ${user.committee === 'event_planning' ? 'selected' : ''}>Event Planning</option>
            </select>

            <select class="position-select" style="min-width:110px; padding:8px; border-radius:10px; background:rgba(0,0,0,0.6); color:white; border:1px solid rgba(255,255,255,0.15);">
              <option value="Member" ${user.position === 'Member' ? 'selected' : ''}>Member</option>
              <option value="Sub-Head" ${user.position === 'Sub-Head' ? 'selected' : ''}>Sub-Head</option>
              <option value="Head" ${user.position === 'Head' ? 'selected' : ''}>Head 👑</option>
              <option value="Premium" ${user.position === 'Premium' ? 'selected' : ''}>Premium 🌟</option>
              ${currentUserRole === 'OG' ? `<option value="OG" ${user.position === 'OG' ? 'selected' : ''}>OG 👽</option>` : ''}
            </select>
// يظهر فقط للهيدز لتوزيع الأعضاء على مسؤولي الـ IR
            ${(currentUserRole === 'OG' || currentUserRole === 'head' || (user.committee === 'ir' && user.position === 'Head')) ? `
            <select class="assigned-ir-select" style="min-width:130px; padding:8px; border-radius:10px; background:rgba(0,0,0,0.6); color:white; border:1px dashed var(--accent);">
              <option value="none">-- تعيين لمسؤول IR --</option>
              ${profiles.filter(p => p.committee === 'ir').map(ir => `<option value="${ir.id}" ${user.assigned_ir === ir.id ? 'selected' : ''}>${escapeHtml(ir.full_name)}</option>`).join('')}
            </select>
            ` : ''}

            <button type="button" class="cta-btn primary-btn update-profile-btn" style="padding:8px 16px; font-size:0.9rem; border-radius:10px;">حفظ</button>
          </div>
        `;
      } else {
        actionsHtml = `<div class="actions"><span class="badge warning"><i class="fa-solid fa-shield"></i> محمي</span></div>`;
      }

      // عرض مسمى اللجنة والمنصب تحت اسم العضو
      const displayCommittee = user.committee && user.committee !== 'none' ? user.committee.toUpperCase() : 'General';
      const displayPosition = user.position || 'Member';

      return `
        <div class="table-row" data-user-id="${escapeHtml(user.id)}" style="flex-wrap: wrap; gap: 14px;">
          <div class="main" style="flex-direction:row; align-items:center; gap:12px; flex: 1; min-width: 250px;">
            ${avatar}
            <div style="display:flex; flex-direction:column; gap:4px;">
              <div class="title">${escapeHtml(user.full_name || user.username || user.email || user.id)}</div>
              <div class="sub">
                <span style="color:var(--accent); font-weight:900;">${escapeHtml(displayCommittee)}</span> 
                <span style="color:var(--muted);"> | ${escapeHtml(displayPosition)}</span>
              </div>
            </div>
          </div>
          ${actionsHtml}
        </div>
      `;
    }).join('');

    // تفعيل أزرار الحفظ المزدوجة
    qa('.update-profile-btn', list).forEach((button) => {
      button.addEventListener('click', async () => {
        const row = button.closest('.table-row');
        const userId = row?.dataset?.userId;
        const committee = row?.querySelector('.committee-select')?.value || 'none';
        const position = row?.querySelector('.position-select')?.value || 'Member';
               const assignedIrSelect = row?.querySelector('.assigned-ir-select');
        const assigned_ir = assignedIrSelect && assignedIrSelect.value !== 'none' ? assignedIrSelect.value : null;

        // وفي سطر الـ Update، ضيف assigned_ir: assigned_ir معاهم.
        
        if (!userId) return;
        if (!confirm(`تأكيد نقل العضو إلى: ${committee.toUpperCase()} بصفة ${position}؟`)) return;

        // الترجمة الذكية عشان السيستم القديم يفضل شغال من غير أي تعديل في باقي الملفات
        let systemRole = 'member';
        if (position === 'OG') systemRole = 'OG';
        else if (position === 'Head') systemRole = 'head';
        else if (position === 'Premium') systemRole = 'premium';
        else if (committee !== 'none') systemRole = committee;

        const { error } = await sb.from('profiles').update({ 
          committee: committee,
          position: position,
          role: systemRole 
        }).eq('id', userId);

        if (error) {
          showToast(`خطأ: ${error.message}`, 'error');
          return;
        }
        
        showToast('تم تحديث العضو بنجاح 🛸', 'success');
        await renderProfilesManagement(); // ريفريش فوري للقائمة
      });
    });
  }
  async function loadExistingSections() {
    try {
      const gallery = await fetchTable('gallery_images', 'section_name', 'id', false);
      const gallerySections = unique((gallery || []).map((row) => row.section_name).filter(Boolean));
      const galList = q('#gallerySectionsList');
      if (galList) galList.innerHTML = gallerySections.map((s) => `<option value="${escapeHtml(s)}"></option>`).join('');

      const cultural = await fetchTable('cultural_resources', 'section_name', 'id', false);
      const culturalSections = unique((cultural || []).map((row) => row.section_name).filter(Boolean));
      const cultList = q('#cultSectionsList');
      if (cultList) cultList.innerHTML = culturalSections.map((s) => `<option value="${escapeHtml(s)}"></option>`).join('');
    } catch (err) {
      console.error('Error loading sections:', err);
    }
  }

  async function loadAdminData() {

    const [settingsData, events, memories, gallery, cultural, internships, projects] = await Promise.all([
      fetchTable('site_settings', '*', 'setting_key', true),
      fetchTable('events', '*', 'id', false),
      fetchTable('memories', '*', 'id', false),
      fetchTable('gallery_images', '*', 'created_at', true),
      fetchTable('cultural_resources', '*', 'id', false),
      fetchTable('internships', '*', 'id', false),
      fetchTable('member_projects', '*, profiles(full_name)', 'id', false)
    ]);

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
    const memoriesList = q('#memoriesManagementList');
    const galleryList = q('#galleryManagementList');
    const culturalList = q('#culturalManagementList');
    const internshipsList = q('#internshipsManagementList');
    const projectsList = q('#projectsManagementList');

    if (eventsList) {
      eventsList.innerHTML = managementHtml(events, {
        titleKey: 'title',
        subtitleKey: 'description',
        deleteLabel: 'Delete',
        type: 'event'
      }).replace(/data-delete-type="event"/g, 'data-delete-type="event"');
    }
    if (memoriesList) {
      memoriesList.innerHTML = managementHtml(memories, {
        titleKey: 'author_name',
        subtitleKey: 'memory_text',
        deleteLabel: 'Delete',
        type: 'memory'
      });
    }
    if (galleryList) {
      galleryList.innerHTML = gallery.length ? gallery.map((img) => `
        <div class="management-item">
          <div class="main" style="flex-direction:row; align-items:center; gap:12px;">
            <img src="${escapeHtml(img.image_url)}" alt="gallery" style="width:70px; height:70px; object-fit:cover; border-radius:10px; border:1px solid var(--accent);">
            <div class="meta">
              <strong>${escapeHtml(img.section_name || 'Gallery')}</strong>
              <span>${escapeHtml(img.image_url || '')}</span>
            </div>
          </div>
          <div class="controls">
            <button type="button" class="cta-btn danger" data-delete-id="${escapeHtml(img.id)}" data-delete-type="gallery">حذف</button>
          </div>
        </div>
      `).join('') : '<div class="empty-state">لا توجد صور في المعرض حالياً.</div>';
    }
    if (culturalList) {
      culturalList.innerHTML = cultural.length ? cultural.map((item) => `
        <div class="management-item">
          <div class="meta">
            <strong>${escapeHtml(item.title || 'Source')}</strong>
            <span>${escapeHtml(item.section_name || '')} · ${item.is_premium_only ? 'Premium' : 'Public'}</span>
          </div>
          <div class="controls">
            <button type="button" class="cta-btn danger" data-delete-id="${escapeHtml(item.id)}" data-delete-type="cultural">حذف</button>
          </div>
        </div>
      `).join('') : '<div class="empty-state">لا توجد مصادر حالياً.</div>';
    }
    if (internshipsList) {
      internshipsList.innerHTML = internships.length ? internships.map((item) => `
        <div class="management-item">
          <div class="meta">
            <strong>${escapeHtml(item.company_name || 'Company')} · ${escapeHtml(item.title || '')}</strong>
            <span>${escapeHtml(item.description || '')}</span>
          </div>
          <div class="controls">
            <button type="button" class="cta-btn danger" data-delete-id="${escapeHtml(item.id)}" data-delete-type="internship">حذف</button>
          </div>
        </div>
      `).join('') : '<div class="empty-state">لا توجد فرص تدريب.</div>';
    }
    if (projectsList) {
      projectsList.innerHTML = projects.length ? projects.map((item) => `
        <div class="management-item">
          <div class="meta">
            <strong>${escapeHtml(item.project_title || 'Project')}</strong>
            <span>${escapeHtml(item.description || '')}</span>
            <span>صاحب المشروع: ${escapeHtml(item.profiles?.full_name || 'عضو')}</span>
          </div>
          <div class="controls">
            <button type="button" class="cta-btn danger" data-delete-id="${escapeHtml(item.id)}" data-delete-type="project">حذف</button>
          </div>
        </div>
      `).join('') : '<div class="empty-state">لا توجد مشاريع.</div>';
    }

    await loadExistingSections();

    qa('[data-delete-id]').forEach((button) => {
      button.addEventListener('click', async () => {
        const id = button.dataset.deleteId;
        const type = button.dataset.deleteType;
        if (!id) return;
        if (!confirm('تأكيد الحذف النهائي؟')) return;

        const tableMap = {
          event: 'events',
          memory: 'memories',
          gallery: 'gallery_images',
          cultural: 'cultural_resources',
          internship: 'internships',
          project: 'member_projects'
        };

        const table = tableMap[type];
        if (!table) return;

        const { error } = await sb.from(table).delete().eq('id', id);
        if (error) {
          showToast(`خطأ: ${error.message}`, 'warning');
          return;
        }
        showToast('تم الحذف.', 'success');
        await loadAdminData();
      });
    });

    await renderProfilesManagement();
  }

  async function setupAdmin(ctx) {
    const adminRoles = ['head', 'moderator', 'OG', 'pr', 'media', 'ir', 'marketing', 'magic_hand', 'charity', 'secretariat', 'event_planning'];
    if (!adminRoles.includes(ctx.role)) {
      window.location.href = 'index.html';
      return;
    }

    setVisible(q('#adminLoader'), false);
    setVisible(q('#adminContent'), true);

    // --- توزيع الصلاحيات وإخفاء الكروت حسب اللجنة ---
    const cards = qa('.admin-card');
    cards.forEach(card => {
      const title = card.querySelector('h3')?.textContent || '';
      let allowed = false;

      // الـ OG والهيد ليهم كل حاجة مبدئيا
      if (ctx.role === 'OG' || ctx.role === 'head') allowed = true; 
      else if (ctx.role === 'moderator' && !title.includes('إعدادات المركبة') && !title.includes('إدارة الأعضاء')) allowed = true;
      // الـ PR يشوف الإيفنتات والإنترنشيب بس
      else if (ctx.role === 'pr' && (title.includes('فعالية') || title.includes('تدريب'))) allowed = true;
      // الميديا يشوف المعرض 
      else if (ctx.role === 'media' && title.includes('صورة لمعرض')) allowed = true;
      // الـ IR يشوف إدارة الأعضاء (مؤقتاً لحد ما نعمله فورم التقديم المدمج)
      else if (ctx.role === 'ir' && (title.includes('إدارة الأعضاء') || title.includes('المتقدمين'))) allowed = true;
      
      if (!allowed) card.style.display = 'none';
    });
    // ------------------------------------------------

    const settingsForm = q('#settingsForm');
    const addEventForm = q('#addEventForm');
    const addGalleryForm = q('#addGalleryImageForm');
    const addCulturalForm = q('#addCulturalForm');
    const addInternshipForm = q('#addInternshipForm');
    const addProjectForm = q('#addProjectForm');

    settingsForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const msg = q('#settingsMsg');
      setMessage(msg, 'جاري الحفظ...', '');

      const payload = [
        { setting_key: 'recruitment_status', setting_value: q('#recruitmentStatus')?.value || 'close' },
        { setting_key: 'recruitment_link', setting_value: safeUrl(q('#recruitmentLink')?.value) || '' },
        { setting_key: 'pr_head_phone', setting_value: normalizePhone(q('#prHeadPhone')?.value) },
        { setting_key: 'pr_sub_phone', setting_value: normalizePhone(q('#prSubPhone')?.value) }
      ];

      const { error } = await sb.from('site_settings').upsert(payload, { onConflict: 'setting_key' });
      if (error) return setMessage(msg, `خطأ: ${error.message}`, 'error');
      setMessage(msg, 'تم الحفظ بنجاح ✅', 'success');
      await queueNotification({ title: 'تم تحديث إعدادات الموقع', body: 'تم حفظ إعدادات التقديم وأرقام التواصل.', audience_role: 'all', kind: 'system', target_url: 'index.html' });
      await syncHome(ctx);
    });

    addEventForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const msg = q('#eventMsg');
      const btn = q('#eventSubmitBtn');
      const files = Array.from(q('#eventImgFile')?.files || []);
      const title = q('#eventTitle')?.value.trim() || '';
      const description = q('#eventDesc')?.value.trim() || '';
      const actionLink = safeUrl(q('#eventLink')?.value) || '';

      if (!title || !description || !files.length) return setMessage(msg, 'املأ البيانات واختر صورة واحدة على الأقل.', 'error');
      if (files.some((file) => validateImageFile(file, 4))) return setMessage(msg, 'تأكد من نوع الصور وحجمها.', 'error');

      setBusy(btn, true, 'جاري النشر...', 'نشر الإيفنت 🚀');
      setMessage(msg, 'جاري النشر...', '');

      try {
        const urls = await uploadImages(files, 'events', 8);
        const { error } = await sb.from('events').insert([{
          title,
          description,
          image_url: urls.join(','),
          action_link: actionLink
        }]);
        if (error) throw error;

        setMessage(msg, 'تمت الإضافة بنجاح ✅', 'success');
        await queueNotification({ title: 'فعالية جديدة', body: title, audience_role: 'all', kind: 'event', target_url: 'events.html' });
        q('#addEventForm')?.reset();
        await loadAdminData();
      } catch (err) {
        setMessage(msg, `خطأ: ${err.message}`, 'error');
      } finally {
        setBusy(btn, false, '', 'نشر الإيفنت 🚀');
      }
    });

    addGalleryForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const msg = q('#galleryMsg');
      const btn = q('#gallerySubmitBtn');
      const sectionName = q('#gallerySectionName')?.value.trim() || '';
      const files = Array.from(q('#galleryImgFile')?.files || []);

      if (!sectionName || !files.length) return setMessage(msg, 'اختر اسم السكشن وصورة واحدة على الأقل.', 'error');
      if (files.some((file) => validateImageFile(file, 5))) return setMessage(msg, 'الصورة غير صالحة أو كبيرة.', 'error');

      setBusy(btn, true, 'جاري الرفع...', 'إضافة الصورة 🖼️');
      try {
        const urls = await uploadImages(files, 'gallery', 8);
        const rows = urls.map((url) => ({ section_name: sectionName, image_url: url }));
        const { error } = await sb.from('gallery_images').insert(rows);
        if (error) throw error;
        setMessage(msg, 'تمت الإضافة بنجاح ✅', 'success');
        await queueNotification({ title: 'صورة جديدة بالمعرض', body: sectionName || 'تمت إضافة صورة جديدة.', audience_role: 'all', kind: 'gallery', target_url: 'gallery.html' });
        q('#addGalleryImageForm')?.reset();
        await loadAdminData();
      } catch (err) {
        setMessage(msg, `خطأ: ${err.message}`, 'error');
      } finally {
        setBusy(btn, false, '', 'إضافة الصورة 🖼️');
      }
    });

    addCulturalForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const msg = q('#cultMsg');
      const btn = q('#cultSubmitBtn');
      const sectionName = q('#cultSection')?.value.trim() || '';
      const title = q('#cultTitle')?.value.trim() || '';
      const url = safeUrl(q('#cultLink')?.value) || '';
      const premium = q('#cultPremium')?.value === 'true';

      if (!sectionName || !title || !url) return setMessage(msg, 'املأ البيانات بشكل صحيح.', 'error');
      setBusy(btn, true, 'جاري الحفظ...', 'إضافة المصدر 📚');

      try {
        const { error } = await sb.from('cultural_resources').insert([{
          section_name: sectionName,
          title,
          resource_url: url,
          is_premium_only: premium
        }]);
        if (error) throw error;
        setMessage(msg, 'تمت الإضافة بنجاح ✅', 'success');
        await queueNotification({ title: 'مصدر جديد', body: title || 'تمت إضافة مصدر جديد للمجتمع الثقافي.', audience_role: 'premium', kind: 'cultural', target_url: 'cultural.html' });
        q('#addCulturalForm')?.reset();
        await loadAdminData();
      } catch (err) {
        setMessage(msg, `خطأ: ${err.message}`, 'error');
      } finally {
        setBusy(btn, false, '', 'إضافة المصدر 📚');
      }
    });

    addInternshipForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const msg = q('#intMsg');
      const btn = q('#intSubmitBtn');
      const company = q('#intCompany')?.value.trim() || '';
      const title = q('#intTitle')?.value.trim() || '';
      const description = q('#intDesc')?.value.trim() || '';
      const link = safeUrl(q('#intLink')?.value) || '';
      const files = Array.from(q('#intImgFile')?.files || []);

      if (!company || !title || !description || !link) return setMessage(msg, 'املأ جميع البيانات المطلوبة.', 'error');
      if (files.some((file) => validateImageFile(file, 5))) return setMessage(msg, 'الصورة غير صالحة أو كبيرة.', 'error');

      setBusy(btn, true, 'جاري الرفع...', 'إضافة الفرصة 🌟');
      try {
        const urls = await uploadImages(files, 'internships', 4);
        const { error } = await sb.from('internships').insert([{
          company_name: company,
          title,
          description,
          apply_link: link,
          image_url: urls[0] || null
        }]);
        if (error) throw error;
        setMessage(msg, 'تمت الإضافة بنجاح ✅', 'success');
        await queueNotification({ title: 'فرصة تدريب جديدة', body: company || 'تمت إضافة فرصة جديدة.', audience_role: 'premium', kind: 'internship', target_url: 'internships.html' });
        q('#addInternshipForm')?.reset();
        await loadAdminData();
      } catch (err) {
        setMessage(msg, `خطأ: ${err.message}`, 'error');
      } finally {
        setBusy(btn, false, '', 'إضافة الفرصة 🌟');
      }
    });

    addProjectForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const msg = q('#projMsg');
      const btn = q('#projSubmitBtn');
      const title = q('#projTitle')?.value.trim() || '';
      const description = q('#projDesc')?.value.trim() || '';
      const phone = normalizePhone(q('#projPhone')?.value);
      const social = safeUrl(q('#projSocial')?.value) || '';
      const link = safeUrl(q('#projLink')?.value) || '';
      const files = Array.from(q('#projImgFile')?.files || []);

      if (!title || !description) return setMessage(msg, 'املأ عنوان ووصف المشروع.', 'error');
      if (files.some((file) => validateImageFile(file, 5))) return setMessage(msg, 'الصورة غير صالحة أو كبيرة.', 'error');

      setBusy(btn, true, 'جاري الرفع...', 'إضافة المشروع 💡');
      try {
        const urls = await uploadImages(files, 'projects', 8);
        const { error } = await sb.from('member_projects').insert([{
          project_title: title,
          description,
          contact_phone: phone,
          social_link: social,
          project_link: link,
          image_url: urls.join(',')
        }]);
        if (error) throw error;
        setMessage(msg, 'تمت الإضافة بنجاح ✅', 'success');
        await queueNotification({ title: 'مشروع عضو جديد', body: title || 'تمت إضافة مشروع جديد.', audience_role: 'all', kind: 'project', target_url: 'projects.html' });
        q('#addProjectForm')?.reset();
        await loadAdminData();
      } catch (err) {
        setMessage(msg, `خطأ: ${err.message}`, 'error');
      } finally {
        setBusy(btn, false, '', 'إضافة المشروع 💡');
      }
    });

    await loadAdminData();
       await renderApplicationsManagement(ctx);
  }

  function normalizeDraftText(value) {
    return String(value || '').trim().replace(/\s+/g, ' ');
  }

  function estimateATSScore() {
    const name = q('#cvName')?.textContent || '';
    const job = q('#cvJob')?.textContent || '';
    const contact = q('#cvContact')?.textContent || '';
    const sections = qa('.cv-section-content').map((el) => el.textContent || '').join(' ');
    const fullText = `${name} ${job} ${contact} ${sections}`.toLowerCase();

    const checks = [
      [/email|@/, 10],
      [/phone|tel|mobile|\+?\d{8,}/, 10],
      [/linkedin|github|portfolio/, 10],
      [/\b(skill|skills|مهارات)\b/, 12],
      [/\b(experience|experience|خبرة)\b/, 12],
      [/\b(education|education|تعليم)\b/, 12],
      [/\b(project|project|مشروع)\b/, 8],
      [/\b(pharmacy|clinical|medical|ممارسة|صيدلة)\b/, 8],
      [/\b(team|leadership|communication|problem solving|analysis|research)\b/, 10]
    ];

    let score = 20;
    const notes = [];

    checks.forEach(([pattern, points]) => {
      if (pattern.test(fullText)) score += points;
      else notes.push(`أضف/حسّن: ${pattern}`);
    });

    const words = fullText.split(/\s+/).filter(Boolean).length;
    if (words > 80) score += 8;
    else notes.push('السيرة الذاتية قصيرة جدًا، حاول تزود التفاصيل.');

    score = Math.max(0, Math.min(100, score));
    return { score, notes: notes.slice(0, 5) };
  }

  function renderCvScore() {
    const box = q('#cvScoreBox');
    if (!box) return;
    const { score, notes } = estimateATSScore();
    box.innerHTML = `
      <div class="cv-score-card">
        <div style="display:flex; justify-content:space-between; gap:12px; align-items:center;">
          <strong>ATS Score محلي</strong>
          <span class="badge ${score >= 80 ? 'success' : score >= 60 ? 'warning' : 'danger'}">${score}/100</span>
        </div>
        <div class="cv-score-bar"><span style="width:${score}%"></span></div>
        <div class="safe-note" style="margin-top:10px;">${notes.length ? notes.map((note) => `• ${escapeHtml(note)}`).join('<br>') : 'السيرة الذاتية متوازنة حاليًا.'}</div>
      </div>
    `;
  }

  function saveCvDraft() {
    const draft = {
      name: q('#cvName')?.textContent || '',
      job: q('#cvJob')?.textContent || '',
      contact: q('#cvContact')?.textContent || '',
      paperClass: q('#cvPaper')?.className || '',
      sections: qa('#paperSectionsArea .cv-section').map((section) => ({
        id: section.id,
        title: q('.cv-section-title', section)?.textContent || '',
        content: q('.cv-section-content', section)?.textContent || ''
      })),
      inputs: {}
    };

    qa('.live-input, .live-font').forEach((input) => {
      const target = input.dataset.target;
      if (!target) return;
      draft.inputs[target] = draft.inputs[target] || {};
      if (input.classList.contains('live-input')) draft.inputs[target].value = input.value;
      if (input.classList.contains('live-font')) draft.inputs[target].fontSize = input.value;
    });

    if (q('#cvImageInput')?.dataset?.previewUrl) draft.photoUrl = q('#cvImageInput').dataset.previewUrl;
    if (q('#photoPosition')) draft.photoPosition = q('#photoPosition').value;

    localStorage.setItem(CV_DRAFT_KEY, JSON.stringify(draft));
    showToast('تم حفظ المسودة محليًا.', 'success');
  }

  function loadCvDraft() {
    try {
      const draft = JSON.parse(localStorage.getItem(CV_DRAFT_KEY) || 'null');
      if (!draft) return;
      Object.entries(draft.inputs || {}).forEach(([target, values]) => {
        const liveInputs = qa(`.live-input[data-target="${CSS.escape(target)}"]`);
        liveInputs.forEach((input) => {
          if ('value' in values && input.classList.contains('live-input')) input.value = values.value || '';
          if ('fontSize' in values && input.classList.contains('live-font')) input.value = values.fontSize || input.value;
        });
      });
      if (draft.photoPosition && q('#photoPosition')) q('#photoPosition').value = draft.photoPosition;
      if (draft.photoUrl && q('#cvPhoto')) q('#cvPhoto').src = draft.photoUrl;
      if (draft.photoUrl && q('#cvImageInput')) q('#cvImageInput').dataset.previewUrl = draft.photoUrl;
      applyPhotoPosition();
      updateCvPaperFromInputs();
      renderCvScore();
    } catch {
      // ignore
    }
  }

  function applyPhotoPosition() {
    const paper = q('#cvPaper');
    const pos = q('#photoPosition')?.value || 'hidden';
    if (!paper) return;
    paper.classList.remove('photo-hidden', 'photo-left', 'photo-right', 'photo-visible');
    if (pos === 'left') paper.classList.add('photo-visible', 'photo-left');
    else if (pos === 'right') paper.classList.add('photo-visible', 'photo-right');
    else paper.classList.add('photo-hidden');
  }

  function updateCvPaperFromInputs() {
    qa('.live-input').forEach((input) => {
      const targetId = input.dataset.target;
      const target = q(`#${CSS.escape(targetId)}`);
      if (!target) return;
      target.textContent = input.value || target.textContent;
    });
    qa('.live-font').forEach((input) => {
      const targetId = input.dataset.target;
      const target = q(`#${CSS.escape(targetId)}`);
      if (!target) return;
      const value = Number(input.value || 0);
      if (value > 0) target.style.fontSize = `${value}pt`;
    });
    renderCvScore();
  }

  function bindCvInputs() {
    qa('.live-input').forEach((input) => {
      input.addEventListener('input', () => {
        const target = q(`#${CSS.escape(input.dataset.target)}`);
        if (target) target.textContent = input.value || '';
        renderCvScore();
      });
    });

    qa('.live-font').forEach((input) => {
      input.addEventListener('input', () => {
        const target = q(`#${CSS.escape(input.dataset.target)}`);
        if (target) target.style.fontSize = `${Number(input.value || 0)}pt`;
        renderCvScore();
      });
    });

    q('#photoPosition')?.addEventListener('change', applyPhotoPosition);
    q('#cvImageInput')?.addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const error = validateImageFile(file, 3);
      if (error) return showToast(error, 'warning');

      const reader = new FileReader();
      reader.onload = () => {
        const url = String(reader.result || '');
        const photo = q('#cvPhoto');
        if (photo) photo.src = url;
        event.target.dataset.previewUrl = url;
        showToast('تم تحديث الصورة.', 'success');
        renderCvScore();
      };
      reader.readAsDataURL(file);
    });

    q('#downloadPdfBtn')?.addEventListener('click', async () => {
      const paper = q('#cvPaper');
      if (!paper || !window.html2pdf) {
        showToast('مكتبة PDF غير متاحة.', 'warning');
        return;
      }

      await recordAnalytics('cv_download');
      const opt = {
        margin: 0.25,
        filename: 'Aliens_CV.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
      };
      window.html2pdf().set(opt).from(paper).save();
    });

    q('#saveCvDraftBtn')?.addEventListener('click', saveCvDraft);
    q('#clearCvDraftBtn')?.addEventListener('click', () => {
      localStorage.removeItem(CV_DRAFT_KEY);
      showToast('تم حذف المسودة.', 'success');
    });
    q('#analyzeCvBtn')?.addEventListener('click', renderCvScore);
  }

  let customSectionCounter = 0;
  function addCustomSection() {
    const sections = q('#sortableSections');
    const paper = q('#paperSectionsArea');
    if (!sections || !paper) return;

    customSectionCounter += 1;
    const id = `custom-${customSectionCounter}`;

    const block = document.createElement('div');
    block.className = 'builder-block';
    block.dataset.sync = id;
    block.innerHTML = `
      <div class="block-header">
        <h4><i class="fa-solid fa-folder-plus"></i> قسم مخصص</h4>
        <div class="block-actions">
          <button type="button" onclick="moveBlockUp(this)"><i class="fa-solid fa-arrow-up"></i></button>
          <button type="button" onclick="moveBlockDown(this)"><i class="fa-solid fa-arrow-down"></i></button>
          <button type="button" onclick="removeCustomBlock(this)"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
      <div class="input-row">
        <input type="text" class="live-input" data-target="title-${id}" placeholder="عنوان القسم">
        <label>حجم</label><input type="number" class="live-font" data-target="title-${id}" value="14">
      </div>
      <div class="input-row">
        <textarea class="live-input" data-target="content-${id}" rows="4" placeholder="اكتب المحتوى هنا..."></textarea>
        <label>حجم</label><input type="number" class="live-font" data-target="content-${id}" value="11">
      </div>
    `;
    sections.appendChild(block);

    const sec = document.createElement('div');
    sec.className = 'cv-section';
    sec.id = id;
    sec.innerHTML = `
      <h3 class="cv-section-title" id="title-${id}" style="font-size:14pt;">New Section</h3>
      <p class="cv-section-content" id="content-${id}" style="font-size:11pt;">Write something useful...</p>
    `;
    paper.querySelector('#paperSectionsArea')?.appendChild(sec) || paper.appendChild(sec);

    bindDynamicBlock(block);
    renderCvScore();
  }

  function bindDynamicBlock(block) {
    qa('.live-input', block).forEach((input) => {
      input.addEventListener('input', () => {
        const target = q(`#${CSS.escape(input.dataset.target)}`);
        if (target) target.textContent = input.value || target.textContent;
        renderCvScore();
      });
    });
    qa('.live-font', block).forEach((input) => {
      input.addEventListener('input', () => {
        const target = q(`#${CSS.escape(input.dataset.target)}`);
        if (target) target.style.fontSize = `${Number(input.value || 0)}pt`;
        renderCvScore();
      });
    });
  }

  function moveBlockUp(button) {
    const block = button.closest('.builder-block');
    const prev = block?.previousElementSibling;
    if (block && prev) block.parentNode.insertBefore(block, prev);
    syncCvSectionOrder();
  }

  function moveBlockDown(button) {
    const block = button.closest('.builder-block');
    const next = block?.nextElementSibling;
    if (block && next) block.parentNode.insertBefore(next, block);
    syncCvSectionOrder();
  }

  function removeCustomBlock(button) {
    const block = button.closest('.builder-block');
    if (!block) return;
    const sync = block.dataset.sync;
    block.remove();
    q(`#${CSS.escape(sync)}`)?.remove();
    syncCvSectionOrder();
  }

  function syncCvSectionOrder() {
    const paper = q('#paperSectionsArea');
    if (!paper) return;
    const ordered = qa('#sortableSections .builder-block[data-sync]');
    ordered.forEach((block) => {
      const sync = block.dataset.sync;
      const section = q(`#${CSS.escape(sync)}`);
      if (section) paper.appendChild(section);
    });
  }

  function setupCvBuilder() {
    bindCvInputs();
    loadCvDraft();

    q('#addCustomSectionBtn')?.addEventListener('click', addCustomSection);
    syncCvSectionOrder();
    renderCvScore();
  }

  function initAnimations() {
    if (typeof window.AOS !== 'undefined') {
      window.AOS.init({ duration: 600, once: true, offset: 20 });
    }

    if (q('#particles-js') && typeof window.particlesJS === 'function') {
      const isMobile = window.innerWidth <= 768;
      window.particlesJS('particles-js', {
        particles: {
          number: { value: isMobile ? 15 : 30 },
          color: { value: '#39ff14' },
          size: { value: 2, random: true },
          line_linked: { enable: false },
          move: { enable: true, speed: 0.8 }
        },
        interactivity: { events: { onhover: { enable: false }, onclick: { enable: false } } },
        retina_detect: true
      });
    }
  }
// 1. دالة وهمية لمنع أي Crash لو الكود القديم حاول يناديها
  function renderNav(ctx) {}
  window.renderNav = renderNav;

  // 2. إرجاع دالة تسجيل الخروج الأساسية اللي بتعتمد عليها كل الصفحات
  async function handleLogout() {
    localStorage.removeItem('aliens_role');
    sessionStorage.removeItem('aliens_entry_role');
    if (window.sb) await window.sb.auth.signOut();
    window.location.href = 'index.html';
  }
  window.handleLogout = handleLogout;

  async function initPage() {
    initAnimations();

    const ctx = await getContext();
    const page = getPageKey();
    if (page === 'home' || page === 'index') {
      await syncHome(ctx);
      await recordAnalytics('view_home');
    }

    if (page === 'auth') {
      if (ctx.session) {
        window.location.href = ctx.role === 'head' ? 'admin.html' : 'index.html';
        return;
      }
      setupAuth();
    }

    if (page === 'events') await loadEvents();
    if (page === 'gallery') await loadGallery(ctx);
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

    if (page === 'admin') await setupAdmin(ctx);
    if (page === 'cultural') await loadCultural(ctx);
    if (page === 'internships') await loadInternships(ctx);
    if (page === 'projects') await loadProjects();
    if (page === 'cv') setupCvBuilder();
  }

  window.handleLogout = handleLogout;
  window.selectRole = selectRole;
  window.switchTab = switchTab;
  window.loginAction = loginAction;
  window.signupAction = signupAction;
  window.addCustomSection = addCustomSection;
  window.moveBlockUp = moveBlockUp;
  window.moveBlockDown = moveBlockDown;
  window.removeCustomBlock = removeCustomBlock;

// أداة تحميل الـ PDF
async function downloadCvAsPdf() {
    const element = document.getElementById('cvPaper'); 
    if(!element) {
        alert('مش لاقي ورقة الـ CV، تأكد إن الـ ID هو cvPaper');
        return;
    }
    const opt = {
        margin: 0.5,
        filename: 'Aliens_CV.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
}

// ربط الـ Inputs بالـ CV (عشان الكلام يظهر لحظياً)
function bindCvInputs() {
    document.querySelectorAll('[data-target]').forEach(input => {
        input.addEventListener('input', (e) => {
            const targetId = e.target.getAttribute('data-target');
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                targetElement.innerText = e.target.value;
            }
        });
    });
    
    // ربط زرار التحميل
    document.getElementById('downloadPdfBtn')?.addEventListener('click', downloadCvAsPdf);
}

// تشغيل الربط أول ما الصفحة تفتح
document.addEventListener('DOMContentLoaded', () => {
    if(document.body.dataset.page === 'cv') {
        bindCvInputs();
    }
});

async function renderApplicationsManagement(ctx) {
    const list = q('#applicationsManagementList');
    const statsContainer = q('#irStats');
    if (!list || !sb) return;

    // تحديد صلاحيات الشخص اللي فاتح الموقع
    const isOG = ctx.role === 'OG';
    const isHead = ctx.role === 'head' || ctx.profile?.position === 'Head';
    const isIRHead = ctx.profile?.committee === 'ir' && ctx.profile?.position === 'Head';
    const isIRMember = ctx.profile?.committee === 'ir';
    const myCommittee = ctx.profile?.committee;

    // جلب أعضاء الـ IR لتعيين الطلبات لهم
    let irMembers = [];
    if (isOG || isHead || isIRHead) {
      const { data: profiles } = await sb.from('profiles').select('id, full_name, committee');
      if (profiles) irMembers = profiles.filter(p => p.committee === 'ir');
    }

    let query = sb.from('applications').select('*').order('created_at', { ascending: false });
    const { data: apps, error } = await query;

    if (error) {
      list.innerHTML = '<div class="empty-state error">تعذر تحميل طلبات التقديم.</div>';
      return;
    }

    if (!apps.length) {
      list.innerHTML = '<div class="empty-state">لا توجد طلبات تقديم حالياً.</div>';
      return;
    }

    function buildAppsHtml(filterCommittee) {
      let filtered = filterCommittee === 'all' ? apps : apps.filter(a => a.committee_key === filterCommittee);
      
      // حجب الرؤية حسب الصلاحية
      if (isIRMember && !isIRHead && !isOG && !isHead) {
        // الـ IR العادي بيشوف الطلبات المتوزعة عليه فقط
        filtered = filtered.filter(a => a.assigned_to === ctx.session.user.id);
      } else if (!isIRMember && !isOG && !isHead) {
        // رئيس لجنة تانية بيشوف طلبات لجنته بس
        filtered = filtered.filter(a => a.committee_key === myCommittee);
      }

      if (!filtered.length) {
        list.innerHTML = '<div class="empty-state">لا توجد طلبات متاحة لك حالياً.</div>';
        return;
      }

      list.innerHTML = filtered.map((app) => {
        // زرار التعيين لـ IR (يظهر للهيدز فقط)
        let assignmentSelect = '';
        if (isOG || isHead || isIRHead) {
          assignmentSelect = `
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.05);">
              <label style="font-size:0.85rem; color:var(--muted);">توزيع الطلب على IR:</label>
              <select class="assign-ir-select" data-app-id="${app.id}" style="padding: 4px 8px; border-radius:8px; margin-right:8px; background:rgba(0,0,0,0.5);">
                <option value="">-- لم يتم التوزيع --</option>
                ${irMembers.map(ir => `<option value="${ir.id}" ${app.assigned_to === ir.id ? 'selected' : ''}>${escapeHtml(ir.full_name)}</option>`).join('')}
              </select>
            </div>
          `;
        }

        // صلاحيات التعديل في القوائم المنسدلة
        const canEditIR = isIRMember || isOG || isHead;
        const canEditCommittee = (isHead || isOG || (ctx.profile?.position === 'Head' && app.committee_key === myCommittee));

        return `
          <div class="table-row" data-app-id="${app.id}" style="flex-direction: column; align-items: flex-start; gap: 10px; padding: 18px; border-radius: 16px; border: 1px solid var(--line);">
            
            <div style="display: flex; justify-content: space-between; width: 100%; align-items: center; flex-wrap: wrap; gap: 10px;">
              <div>
                <strong style="font-size: 1.15rem; color: var(--text);">${escapeHtml(app.applicant_name)}</strong>
                <span class="badge" style="background: rgba(57, 255, 20, 0.1); color: var(--accent); margin-right: 8px;">${escapeHtml(app.committee_name)}</span>
                <span style="font-size: 0.85rem; color: var(--muted); margin-right: 8px;">(${escapeHtml(app.faculty_level)})</span>
              </div>
              <a href="https://wa.me/${app.phone}" class="cta-btn primary-btn" target="_blank" style="padding: 6px 14px; font-size: 0.85rem; background: #25D366; border-color: #25D366; color: black;">
                <i class="fa-brands fa-whatsapp"></i> تواصل
              </a>
            </div>
            
            <div style="background: rgba(255,255,255,0.02); padding: 12px; border-radius: 12px; width: 100%; margin-top: 6px;">
              <span style="font-size: 0.85rem; color: var(--accent); font-weight: bold; display: block; margin-bottom: 6px;">لماذا هذه اللجنة؟</span>
              <p style="margin: 0; font-size: 0.95rem; color: var(--muted); line-height: 1.5;">${escapeHtml(app.answers?.reason || 'لا توجد إجابة.')}</p>
            </div>

            <div style="display: flex; gap: 16px; width: 100%; margin-top: 8px; flex-wrap: wrap;">
              <div style="flex: 1; min-width: 200px; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 12px; border: 1px dashed rgba(57, 255, 20, 0.2);">
                <label style="font-size:0.85rem; color:var(--text); font-weight:bold; display:block; margin-bottom:6px;">قرار الـ IR (المقابلة)</label>
                <select class="ir-status-select" data-app-id="${app.id}" style="width:100%; padding: 6px; border-radius: 8px;" ${canEditIR ? '' : 'disabled'}>
                  <option value="pending" ${app.ir_status === 'pending' ? 'selected' : ''}>⏳ قيد الانتظار</option>
                  <option value="accepted" ${app.ir_status === 'accepted' ? 'selected' : ''}>✅ مقبول (مبدئياً)</option>
                  <option value="rejected" ${app.ir_status === 'rejected' ? 'selected' : ''}>❌ مرفوض</option>
                </select>
              </div>

              <div style="flex: 1; min-width: 200px; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 12px; border: 1px dashed rgba(71, 199, 255, 0.2);">
                <label style="font-size:0.85rem; color:var(--text); font-weight:bold; display:block; margin-bottom:6px;">قرار رئيس اللجنة (${app.committee_name})</label>
                <select class="committee-status-select" data-app-id="${app.id}" style="width:100%; padding: 6px; border-radius: 8px;" ${canEditCommittee ? '' : 'disabled'}>
                  <option value="pending" ${app.committee_status === 'pending' ? 'selected' : ''}>⏳ قيد الانتظار</option>
                  <option value="accepted" ${app.committee_status === 'accepted' ? 'selected' : ''}>✅ مقبول نهائياً</option>
                  <option value="rejected" ${app.committee_status === 'rejected' ? 'selected' : ''}>❌ مرفوض</option>
                </select>
              </div>
            </div>

            ${assignmentSelect}
          </div>
        `;
      }).join('');

      // تفعيل تغيير حالة الـ IR
      qa('.ir-status-select', list).forEach(sel => {
        sel.addEventListener('change', async () => {
          await sb.from('applications').update({ ir_status: sel.value }).eq('id', sel.dataset.appId);
          showToast('تم تحديث تقييم الـ IR.', 'success');
        });
      });

      // تفعيل تغيير حالة الكوميتي
      qa('.committee-status-select', list).forEach(sel => {
        sel.addEventListener('change', async () => {
          await sb.from('applications').update({ committee_status: sel.value }).eq('id', sel.dataset.appId);
          showToast('تم تحديث قرار رئيس اللجنة.', 'success');
        });
      });

  // تفعيل التوزيع (للهيدز)
qa('.assign-ir-select', list).forEach(sel => {
  sel.addEventListener('change', async (e) => {
    const appId = e.target.dataset.appId;
    const assignedTo = e.target.value || null;

    // إظهار حالة جاري المعالجة
    sel.disabled = true;
    showToast('جاري توزيع الطلب...', 'info');

    try {
      const { error } = await sb
        .from('applications')
        .update({ assigned_to: assignedTo }) // تحديث العمود في الداتابيز
        .eq('id', appId);

      if (error) throw error;

      showToast('تم توزيع الطلب بنجاح 🛸', 'success');
      
      // اختيارياً: إعادة تحميل القائمة عشان التغييرات تبان
      await renderApplicationsManagement(ctx); 
      
    } catch (err) {
      showToast('خطأ: ' + err.message, 'error');
    } finally {
      sel.disabled = false;
    }
  });
});
    }
}
window.getContext = getContext;
window.renderApplicationsManagement = renderApplicationsManagement;
window.uploadImage = uploadImage;
window.openApplicationForm = openApplicationForm;
window.openProfileEditor = openProfileEditor;
document.addEventListener('DOMContentLoaded', initPage);
})();
