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

window.sb = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
  : null;

const sb = window.sb;

const state = {
  session: null, profile: null, role: null,
  cache: { pageData: new Map(), galleryLikes: new Map(), currentUserLikes: new Set() }
};

function q(selector, root = document) { return root.querySelector(selector); }
function qa(selector, root = document) { return Array.from(root.querySelectorAll(selector)); }
function getFileName() { return (window.location.pathname.split('/').pop() || 'index.html').toLowerCase(); }
function getPageKey() { return (document.body?.dataset?.page || getFileName().replace('.html', '') || 'home').toLowerCase(); }
function isEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim()); }
function isTruthySetting(value) { return ['open', '1', 'true', 'yes', 'on'].includes(String(value ?? '').trim().toLowerCase()); }

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[ch]);
}

function safeText(value, fallback = '') { return String(value ?? '').trim() || fallback; }
function normalizeUsername(value) { return String(value || '').trim().toLowerCase(); }
function normalizePhone(value) { return String(value || '').replace(/[^\d+]/g, ''); }
function safePhone(value) { return String(value || '').replace(/\D/g, ''); }
function safeUrl(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  try { return new URL(text, window.location.origin).href; } catch { return ''; }
}

function toArray(value) { return Array.isArray(value) ? value : (value == null ? [] : [value]); }
function unique(items) { return Array.from(new Set(items.filter(Boolean))); }

function debounce(fn, delay = 160) {
  let timer = null;
  return (...args) => { window.clearTimeout(timer); timer = window.setTimeout(() => fn(...args), delay); };
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

function setVisible(el, visible) { if (el) el.classList.toggle('hidden', !visible); }

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
  item.style.cssText = 'justify-content:space-between; background:rgba(5,8,15,.95); border-color:rgba(255,255,255,.08); color:#fff; box-shadow:0 14px 36px rgba(0,0,0,.45);';
  item.textContent = message;
  wrap.appendChild(item);
  window.setTimeout(() => {
    item.style.opacity = '0'; item.style.transform = 'translateY(8px)'; item.style.transition = 'all .3s ease';
    window.setTimeout(() => item.remove(), 300);
  }, 2500);
}

function sliderMarkup(urls, imgClass = 'slider-img', wrapperClass = '') {
  const list = unique(urls.map((url) => safeUrl(url)).filter(Boolean));
  if (!list.length) return '';
  if (list.length === 1) return `<img class="${imgClass}" src="${escapeHtml(list[0])}" loading="lazy">`;
  return `<div class="slider-container ${wrapperClass}"><div class="image-slider">${list.map((url) => `<img class="${imgClass}" src="${escapeHtml(url)}" loading="lazy">`).join('')}</div><div class="swipe-hint"><i class="fa-solid fa-angles-left"></i> اسحب للصور</div></div>`;
}

function uploadPath(folder, file) {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
  const stamp = Date.now().toString(36);
  const random = (crypto?.randomUUID?.() || Math.random().toString(36).slice(2)).replace(/-/g, '');
  return `${folder}/${stamp}_${random}.${ext}`;
}

function validateImageFile(file, maxMB = 5) {
  if (!file || !file.name) return 'الملف غير موجود أو تالف.';
  const fileName = (file.name || '').toLowerCase();
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.heif'];
  const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
  const fileType = file.type || '';
  if (!hasValidExtension && !fileType.startsWith('image/')) return 'الملف لازم يكون صورة (jpg, png, webp, etc).';
  if (file.size > maxMB * 1024 * 1024) return `حجم الصورة أكبر من ${maxMB}MB.`;
  return '';
}

async function uploadImage(file, folder) {
  if (!sb || !file) return null;
  const err = validateImageFile(file);
  if (err) throw new Error(err);
  const path = uploadPath(folder, file);
  const { error } = await sb.storage.from(STORAGE_BUCKET).upload(path, file);
  if (error) throw error;
  const { data } = sb.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data?.publicUrl || null;
}

async function uploadImages(files, folder, maxCount = 6) {
  const safeFiles = Array.from(files || []).slice(0, maxCount);
  const urls = [];
  for (const file of safeFiles) {
    try { 
      const url = await uploadImage(file, folder); 
      if (url) urls.push(url); 
    } catch (e) { 
      console.error('فشل رفع الصورة:', e); 
      throw e; 
    }
  }
  return urls;
}

async function getContext() {
  if (window._cachedContext && window._cachedContext.session) return window._cachedContext;
  if (!sb) return { session: null, profile: null, role: 'guest' };
  
  const { data: { session }, error: sessionError } = await sb.auth.getSession();
  if (sessionError || !session) return { session: null, profile: null, role: 'guest' };
  
  try {
    const { data: profile } = await sb.from('profiles')
      .select('id, role, committee, committee_key, position, committee_position, full_name, avatar_url, username')
      .eq('id', session.user.id)
      .maybeSingle();
    
    const finalProfile = profile || { id: session.user.id };
    
    window._cachedContext = { 
      session, 
      profile: finalProfile, 
      role: finalProfile.role || 'member' 
    };
    return window._cachedContext;
  } catch (err) { 
    return { session, profile: { id: session.user.id }, role: 'member' }; 
  }
}

async function fetchTable(table, columns = '*', order = 'id', ascending = false, limit = null) {
  if (!sb) return [];
  let query = sb.from(table).select(columns);
  if (order) query = query.order(order, { ascending });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

function normalizeUrlList(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  return String(raw).split(',').map(s => s.trim()).filter(Boolean);
}

window.getContext = getContext;
window.showToast = showToast;

// ==========================================
// 📡 تفعيل الإشعارات اللحظية (Realtime Subscriptions)
// ==========================================
window.setupRealtimeNotifications = () => {
  if (!window.sb) return;
  window.sb.channel('public-updates')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'internships' }, () => {
      const isAr = (localStorage.getItem('aliens_lang') || 'en') === 'ar';
      window.showToast(isAr ? '🌟 فرصة تدريب جديدة متاحة الآن!' : '🌟 New internship available now!', 'info');
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cultural_resources' }, () => {
      const isAr = (localStorage.getItem('aliens_lang') || 'en') === 'ar';
      window.showToast(isAr ? '📚 مصدر ثقافي جديد تمت إضافته!' : '📚 New cultural resource added!', 'info');
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'gallery_images' }, () => {
      const isAr = (localStorage.getItem('aliens_lang') || 'en') === 'ar';
      window.showToast(isAr ? '🖼️ تم إضافة صور جديدة للمعرض!' : '🖼️ New photos added to gallery!', 'success');
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'member_projects' }, () => {
      const isAr = (localStorage.getItem('aliens_lang') || 'en') === 'ar';
      window.showToast(isAr ? '💡 مشروع جديد لأحد الأعضاء تم نشره!' : '💡 New member project published!', 'success');
    })
    .subscribe();
};