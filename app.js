async function ensureRecruitmentState() {
  if (typeof window.__recruitmentOpen === 'boolean' && typeof window.__recruitmentLink === 'string') return { open: window.__recruitmentOpen, link: window.__recruitmentLink };
  try {
    if (!sb) return { open: false, link: RECRUITMENT_FALLBACK_LINK };
    const { data } = await sb.from('site_settings').select('*');
    const settings = new Map((data || []).map((row) => [row.setting_key, row.setting_value]));
    const open = isTruthySetting(settings.get('recruitment_status'));
    const link = safeUrl(settings.get('recruitment_link')) || RECRUITMENT_FALLBACK_LINK;
    window.__recruitmentOpen = open; window.__recruitmentLink = link;
    return { open, link };
  } catch { return { open: false, link: RECRUITMENT_FALLBACK_LINK }; }
}

async function recordAnalytics(eventName, meta = {}) {
  const payload = { event_name: eventName, page_name: getPageKey(), meta: JSON.stringify(meta || {}), user_id: window._cachedContext?.session?.user?.id || null };
  try { if (sb) await sb.from('analytics_events').insert([payload]); } catch (err) {}
}

async function openApplicationForm() {
  const stateData = await ensureRecruitmentState();
  if (!stateData.open) { showToast('باب التقديم مغلق حاليًا، انتظرنا الموسم القادم!', 'warning'); return; }

  let modal = q('#applyModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'applyModal';
    modal.className = 'modal-overlay';
    
    modal.innerHTML = `
      <div class="modal-card" style="max-width: 600px; max-height: 90vh; overflow-y: auto; background: #0a0f18; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 25px;">
        <div class="modal-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px; border-bottom: 1px solid #222; padding-bottom: 15px;">
          <div><h3 style="margin:0; color: var(--accent); font-size: 1.3rem;"><i class="fa-solid fa-rocket"></i> نموذج الانضمام</h3></div>
          <button type="button" class="modal-close" style="background:none; border:none; color:white; font-size:1.5rem; cursor:pointer;">×</button>
        </div>
        
        <form id="nativeApplyForm" class="table-like">
          <div class="admin-form-group" style="margin-bottom:15px;">
            <label style="color:var(--muted); margin-bottom:5px; display:block;">الاسم الرباعي</label>
            <input type="text" id="applyName" style="width:100%; padding:10px; background:#111; color:white; border:1px solid #333; border-radius:8px;" required>
          </div>
          
          <div class="admin-form-group" style="margin-bottom:15px;">
            <label style="color:var(--muted); margin-bottom:5px; display:block;">رقم الواتساب</label>
            <input type="text" id="applyPhone" placeholder="مثال: 01xxxxxxxxx" style="width:100%; padding:10px; background:#111; color:white; border:1px solid #333; border-radius:8px;" required>
          </div>

          <div class="admin-form-group" style="margin-bottom:15px;">
            <label style="color:var(--muted); margin-bottom:5px; display:block;">السنة الدراسية</label>
            <select id="applyFacultyLevel" required style="width:100%; padding:10px; background:#111; color:white; border:1px solid #333; border-radius:8px;">
              <option value="" disabled selected>-- اختر السنة الدراسية --</option>
              <option value="1">الفرقة الأولى</option>
              <option value="2">الفرقة الثانية</option>
              <option value="3">الفرقة الثالثة</option>
              <option value="4">الفرقة الرابعة</option>
              <option value="5">الفرقة الخامسة</option>
              <option value="Graduated">خريج</option>
            </select>
          </div>

          <div class="admin-form-group" style="margin-bottom:15px;">
            <label style="color:var(--muted); margin-bottom:5px; display:block;">اللجنة (اختر لجنتك)</label>
            <select id="applyCommittee" required style="width:100%; padding:10px; background:#111; color:white; border:1px solid #333; border-radius:8px;">
              <option value="" disabled selected>-- اختر لجنتك --</option>
              <option value="pr">PR</option>
              <option value="ir">IR</option>
              <option value="Charity">Charity</option>
              <option value="marketing">Marketing</option>
              <option value="media">Media</option>
              <option value="magic_hand">Magic Hand</option>
              <option value="event_planning">Event Planning</option>
              <option value="secretary">Secretary</option>
            </select>
          </div>
          
          <div id="dynamicQuestionsArea" style="margin-top: 15px; border-top: 1px solid #222; padding-top: 15px;"></div>

          <button type="submit" class="cta-btn primary-btn" id="submitApplyBtn" style="margin-top: 20px; width: 100%; padding: 12px; font-size: 1.1rem;">إرسال الطلب 🚀</button>
          <p id="applyMsg" class="auth-msg"></p>
        </form>
      </div>`;
    
    document.body.appendChild(modal);
    modal.querySelector('.modal-close').onclick = () => modal.classList.remove('show');

    q('#applyCommittee', modal).addEventListener('change', async (e) => {
      const committee = e.target.value;
      const qArea = q('#dynamicQuestionsArea', modal);
      qArea.innerHTML = '<p style="color:var(--muted);"><i class="fa-solid fa-spinner fa-spin"></i> جاري تحميل أسئلة اللجنة...</p>';

      const { data: questions } = await window.sb.from('dynamic_questions').select('*').eq('committee_key', committee);

      if (!questions || questions.length === 0) {
         qArea.innerHTML = ``;
      } else {
         qArea.innerHTML = questions.map(q => `
            <div class="admin-form-group" style="margin-bottom: 15px;">
                <label style="color:var(--accent); margin-bottom:8px; display:block;">${escapeHtml(q.question_text)}</label>
                <textarea class="dynamic-answer" data-question="${escapeHtml(q.question_text)}" rows="2" style="width:100%; padding:10px; background:#111; color:white; border:1px solid #333; border-radius:8px;" required></textarea>
            </div>
         `).join('');
      }
    });

    q('#nativeApplyForm', modal).addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = q('#submitApplyBtn', modal); 
      const msg = q('#applyMsg', modal);
      
      const name = q('#applyName', modal).value.trim();
      const phone = q('#applyPhone', modal).value.trim();
      const facultyLevel = q('#applyFacultyLevel', modal).value; 
      const committee = q('#applyCommittee', modal).value;

      if (!facultyLevel) return setMessage(msg, 'يرجى اختيار السنة الدراسية.', 'warning');
      if (!committee) return setMessage(msg, 'يرجى اختيار اللجنة.', 'warning');

      const answers = {};
      qa('.dynamic-answer', modal).forEach(ta => {
          answers[ta.dataset.question] = ta.value.trim();
      });

      setBusy(btn, true, 'جاري الإرسال...', 'إرسال الطلب 🚀');
      try {
        const { error } = await window.sb.from('applications').insert([{
            applicant_name: name,
            phone: phone,
            faculty_level: facultyLevel,
            committee_key: committee,
            committee_name: q('#applyCommittee').options[q('#applyCommittee').selectedIndex].text,
            dynamic_answers: answers,
            role_requested: 'Member',
            status: 'new',
            ir_decision: 'pending',
            committee_decision: 'pending'
        }]);
        
        if (error) throw error;
        
        showToast('تم إرسال طلبك بنجاح!', 'success');
        modal.classList.remove('show'); 
        q('#nativeApplyForm', modal).reset();
        q('#dynamicQuestionsArea', modal).innerHTML = '';
        
      } catch (err) { setMessage(msg, 'خطأ: ' + err.message, 'error'); } 
      finally { setBusy(btn, false, '', 'إرسال الطلب 🚀'); }
    });
  }
  
  modal.classList.add('show');
}
window.openApplicationForm = openApplicationForm;
window.loginAction = async function(event) {
  event.preventDefault();
  const input = normalizeUsername(q('#loginId')?.value);
  const password = q('#loginPassword')?.value || '';
  const msg = q('#loginMsg');
  
  if (!sb) return setMessage(msg, 'Supabase غير متصل.', 'error');
  setMessage(msg, 'جاري الدخول للمركبة...', '');
  
  try {
    let email = input;
    if (!isEmail(input)) {
      const { data: profile, error: profileErr } = await window.sb
        .from('profiles')
        .select('email')
        .ilike('username', input)
        .maybeSingle();
      
      if (profileErr || !profile) {
        return setMessage(msg, 'اسم المستخدم غير موجود.', 'error');
      }
      email = profile.email;
    }
    
    const { data, error } = await window.sb.auth.signInWithPassword({ email, password });
    if (error) {
       return setMessage(msg, 'البريد أو كلمة المرور غير صحيحة.', 'error');
    }
    
    window._cachedContext = null; 
    await getContext(); 
    window.location.href = 'index.html'; 
  } catch (err) {
    setMessage(msg, 'خطأ في الاتصال بالسيرفر.', 'error');
  }
}

async function loadGalleryPage() {
  const container = q('#dynamicGalleryContainer');
  if (!container) return;

  const { data: items } = await window.sb.from('gallery_images').select('*').order('created_at', { ascending: false });
  const userId = window._cachedContext?.session?.user?.id;
  
  const { data: myLikes } = userId ? await window.sb.from('gallery_likes').select('image_name').eq('user_id', userId) : { data: [] };
  const likedIds = new Set(myLikes?.map(l => l.image_name) || []);

  const sections = (items || []).reduce((acc, item) => {
    acc[item.section_name] = acc[item.section_name] || [];
    acc[item.section_name].push(item);
    return acc;
  }, {});

container.innerHTML = Object.keys(sections).map(section => `
  <div class="gallery-section" style="margin-bottom: 50px;">
    <h2 style="color:var(--accent); font-size: 1.8rem; margin-bottom: 25px; border-right: 5px solid var(--accent); padding-right: 15px;">
      ${escapeHtml(section)}
    </h2>
    <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(300px, 1fr)); gap:25px;">
      ${sections[section].map(img => `
        <div class="gallery-card">
          <img src="${img.image_url}" alt="${escapeHtml(section)}">
          
          <div style="position:absolute; top:15px; right:15px; display:flex; flex-direction:column; align-items:center; z-index:10;">
            <button class="like-btn-floating" onclick="toggleLike(${img.id})" style="color: ${likedIds.has(String(img.id)) ? '#ef4444' : '#fff'};">
              <i class="fa-${likedIds.has(String(img.id)) ? 'solid' : 'regular'} fa-heart"></i>
            </button>
            <span id="like-count-${img.id}" style="color:white; font-size:0.75rem; margin-top:5px; background:rgba(0,0,0,0.5); padding:2px 6px; border-radius:10px;">
              ...
            </span>
          </div>
          
        </div>
      `).join('')}
    </div>
  </div>
`).join('');

items.forEach(img => updateLikeCount(img.id));
}

async function updateLikeCount(imageId) {
  const { count, error } = await window.sb
    .from('gallery_likes')
    .select('*', { count: 'exact', head: true })
    .eq('image_name', imageId);
  
  const counter = q(`#like-count-${imageId}`);
  if (counter) counter.innerText = count || 0;
}

window.toggleLike = async (imageId) => {
  const userId = window._cachedContext?.session?.user?.id;
  if (!userId) return showToast('يجب تسجيل الدخول للإعجاب', 'warning');

  const btn = q(`button[onclick="toggleLike(${imageId})"]`);
  const icon = btn.querySelector('i');
  const isLiked = icon.classList.contains('fa-solid');
  
  icon.classList.toggle('fa-solid');
  icon.classList.toggle('fa-regular');
  btn.style.color = isLiked ? '#fff' : '#ef4444';

  try {
    if (isLiked) {
      await window.sb.from('gallery_likes').delete().eq('image_name', imageId).eq('user_id', userId);
    } else {
      await window.sb.from('gallery_likes').insert([{ image_name: imageId, user_id: userId }]);
    }
    updateLikeCount(imageId);
  } catch (e) {
    icon.classList.toggle('fa-solid');
    icon.classList.toggle('fa-regular');
    btn.style.color = isLiked ? '#ef4444' : '#fff';
    showToast('خطأ في الاتصال بالسيرفر', 'error');
  }
};

async function setupMemoriesPage(ctx) {
  const form = q('#memoryForm');
  const grid = q('#memoriesGrid');
  
  const loadMemories = async () => {
    if(!grid) return;
    grid.innerHTML = '<div style="color:var(--muted); text-align:center; grid-column:1/-1;"><i class="fa-solid fa-spinner fa-spin"></i> جاري تحميل الذكريات...</div>';
    
    const { data, error } = await window.sb
      .from('memories')
      .select('*, profiles(full_name, avatar_url), memory_likes(user_id), memory_comments(id, author_name, comment_text, created_at)')
      .order('created_at', { ascending: false });
      
    if(error) return grid.innerHTML = `<div style="color:#fca5a5; grid-column:1/-1;">خطأ: ${error.message}</div>`;
    if(!data || data.length === 0) return grid.innerHTML = '<div style="color:var(--muted); text-align:center; grid-column:1/-1;">لا توجد ذكريات بعد. كن أول من يوثق لحظته!</div>';
    
    const currentUserId = ctx?.session?.user?.id;

    grid.innerHTML = data.map(m => {
      const likesCount = m.memory_likes?.length || 0;
      const isLiked = m.memory_likes?.some(like => like.user_id === currentUserId);
      const commentsHTML = (m.memory_comments || []).map(c => `
        <div style="background:rgba(255,255,255,0.02); padding:8px 12px; border-radius:8px; margin-top:5px; font-size:0.85rem;">
          <strong style="color:var(--accent);">${escapeHtml(c.author_name)}:</strong> ${escapeHtml(c.comment_text)}
        </div>
      `).join('');

      return `
      <div class="memory-card" style="padding:20px; border:1px solid var(--line); border-radius:18px; background:rgba(255,255,255,0.03);">
        <div class="memory-meta" style="display:flex; gap:12px; align-items:center; margin-bottom:15px;">
          ${m.profiles?.avatar_url || m.author_avatar ? `<img src="${m.profiles?.avatar_url || m.author_avatar}" style="width:45px; height:45px; border-radius:12px; object-fit:cover;">` : `<div style="width:45px; height:45px; border-radius:12px; background:rgba(57,255,20,0.1); display:flex; align-items:center; justify-content:center; color:var(--accent);">👽</div>`}
          <div>
            <div style="font-size:1.05rem; color:white;">${escapeHtml(m.profiles?.full_name || m.author_name || 'عضو مجهول')}</div>
            <div style="font-size:0.8rem; color:var(--muted);">${new Date(m.created_at).toLocaleDateString('ar-EG')}</div>
          </div>
        </div>
        <div style="color:#e2e8f0; line-height:1.8; font-size:0.95rem; white-space:pre-wrap;">${escapeHtml(m.memory_text)}</div>
        ${m.image_url ? `<img src="${m.image_url}" style="margin-top:15px; border-radius:12px; max-height:250px; width:100%; object-fit:cover;">` : ''}
        
        <div style="display:flex; gap:15px; margin-top:15px; padding-top:15px; border-top:1px solid var(--line);">
          <button onclick="toggleMemoryLike(${m.id}, ${isLiked})" style="background:none; border:none; color:${isLiked ? 'var(--danger)' : 'var(--muted)'}; cursor:pointer; font-size:1rem;">
            <i class="${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart"></i> ${likesCount}
          </button>
        </div>

        <div style="margin-top:15px;">
          ${commentsHTML}
          <div style="display:flex; gap:10px; margin-top:10px;">
            <input type="text" id="commentInput_${m.id}" placeholder="اكتب تعليقاً..." style="flex:1; padding:8px; border-radius:6px; background:#111; border:1px solid #333; color:white;">
            <button onclick="addMemoryComment(${m.id})" style="background:var(--accent); color:#000; border:none; padding:8px 15px; border-radius:6px; cursor:pointer; font-weight:bold;">إرسال</button>
          </div>
        </div>
      </div>
    `}).join('');
  };

  await loadMemories();

  if(form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if(!ctx.session) return showToast('يجب تسجيل الدخول!', 'warning');
      const btn = q('#submitMemoryBtn'), text = q('#memoryText').value.trim(), file = q('#memoryImgFile').files[0];
      if(!text) return;
      setBusy(btn, true, 'جاري النشر...');
      try {
        let imgUrl = null; if(file) imgUrl = await uploadImage(file, 'gallery');
        await window.sb.from('memories').insert({ user_id: ctx.session.user.id, memory_text: text, image_url: imgUrl, author_name: ctx.profile?.full_name || 'عضو', is_approved: true });
        form.reset(); showToast('تم النشر!', 'success'); await loadMemories();
      } catch(err) { showToast('خطأ: ' + err.message, 'error'); } 
      finally { setBusy(btn, false, '', 'توثيق ونشر 🚀'); }
    });
  }
}

async function renderGenericGrid(tableName, containerId, cardRenderer) {
  const grid = q(`#${containerId}`);
  if(!grid) return;
  grid.innerHTML = '<div style="color:var(--muted); text-align:center; grid-column:1/-1;"><i class="fa-solid fa-spinner fa-spin"></i> جاري استكشاف البيانات...</div>';
  
  const { data, error } = await window.sb.from(tableName).select('*').order('created_at', { ascending: false });
  
  if(error) return grid.innerHTML = `<div style="color:#fca5a5; grid-column:1/-1;">خطأ في جلب البيانات: ${error.message}</div>`;
  if(!data || data.length === 0) return grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">لا يوجد محتوى متاح في هذا القسم حالياً.</div>`;
  
  grid.innerHTML = data.map(cardRenderer).join('');
}

// دالة الـ Init المعدلة

async function initPage() {
  const ctx = await getContext(); 
  const page = getPageKey();

  // تفعيل الإشعارات إذا كانت الدالة موجودة في core.js
  if (typeof window.setupRealtimeNotifications === 'function') {
    window.setupRealtimeNotifications();
  }

  if (page === 'home' || page === 'index') {
    await syncWhatsAppButtons();
    // إظهار الرسالة مرة واحدة في الجلسة (تدعم اللغتين)
    if (!sessionStorage.getItem('welcome_toast_shown')) {
      setTimeout(() => {
        const isAr = (localStorage.getItem('aliens_lang') || 'en') === 'ar';
        const msg = isAr ? '🚀 لا تنسَ تصفح "مشاريع أعضائنا" من القائمة لدعمهم!' : '🚀 Don\'t forget to check out "Members Projects" to support them!';
        if (window.showToast) window.showToast(msg, 'info');
        sessionStorage.setItem('welcome_toast_shown', 'true');
      }, 2000);
    }
  }
  
  if (page === 'admin' && typeof setupAdmin === 'function') await setupAdmin(ctx); 
  if (page === 'memories') await setupMemoriesPage(ctx);
  
  if (page === 'events') await renderGenericGrid('events', 'eventsGrid', (item) => `
    <div class="event-card">
      ${item.image_url ? `<img src="${item.image_url}" class="event-cover" alt="Event">` : `<div class="event-cover" style="background:#0a101d; display:flex; align-items:center; justify-content:center;"><i class="fa-solid fa-calendar-days fa-3x" style="color:var(--line-strong)"></i></div>`}
      <div class="event-card-body">
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.description)}</p>
        <div class="event-actions" style="margin-top:auto; padding-top:15px;">
          ${item.action_link ? `<a href="${item.action_link}" target="_blank" class="cta-btn primary-btn" style="width:100%;"><i class="fa-solid fa-rocket"></i> التفاصيل والتسجيل</a>` : ''}
        </div>
      </div>
    </div>
  `);

  if (page === 'internships') await renderGenericGrid('internships', 'eventsGrid', (item) => `
    <div class="store-card" style="border:1px solid var(--line); border-radius:18px; background:rgba(255,255,255,0.02); padding:18px; display:flex; flex-direction:column; gap:12px;">
      ${item.image_url ? `<div class="store-media"><img src="${item.image_url}" class="store-thumb"></div>` : ''}
      <div class="store-topline" style="display:flex; justify-content:space-between; align-items:flex-start;">
        <h3 style="margin:0; font-size:1.15rem; color:white;">${escapeHtml(item.title)}</h3>
        <span class="store-chip" style="font-size:0.8rem; flex-shrink:0;"><i class="fa-solid fa-briefcase"></i> ${escapeHtml(item.company_name || 'تدريب عملي')}</span>
      </div>
      <p style="color:var(--muted); margin:0; line-height:1.7; font-size:0.95rem;">${escapeHtml(item.description)}</p>
      <div style="margin-top:auto; padding-top:15px;">
        ${item.apply_link ? `<a href="${item.apply_link}" target="_blank" class="cta-btn secondary-btn" style="width:100%;"><i class="fa-solid fa-link"></i> قدم الآن</a>` : ''}
      </div>
    </div>
  `);

  if (page === 'projects') await renderGenericGrid('member_projects', 'eventsGrid', (item) => `
    <div class="store-card" style="border:1px solid var(--line); border-radius:18px; background:rgba(255,255,255,0.02); padding:18px; display:flex; flex-direction:column; gap:12px;">
      ${item.image_url ? `<div class="store-media"><img src="${item.image_url}" class="store-thumb"></div>` : ''}
      <div class="store-topline" style="display:flex; justify-content:space-between; align-items:flex-start;">
        <h3 style="margin:0; font-size:1.15rem; color:white;">${escapeHtml(item.project_title)}</h3>
        <span class="store-chip" style="font-size:0.8rem; flex-shrink:0;"><i class="fa-solid fa-lightbulb"></i> مشروع</span>
      </div>
      <p style="color:var(--muted); margin:0; line-height:1.7; font-size:0.95rem;">${escapeHtml(item.description)}</p>
      <div style="margin-top:auto; padding-top:15px; display:flex; gap:10px;">
        ${item.project_link ? `<a href="${item.project_link}" target="_blank" class="cta-btn secondary-btn" style="flex:1;"><i class="fa-solid fa-link"></i> رابط المشروع</a>` : ''}
        ${item.contact_phone ? `<a href="https://wa.me/${item.contact_phone.replace(/\D/g, '')}" target="_blank" class="cta-btn primary-btn" style="flex:1;"><i class="fa-brands fa-whatsapp"></i> تواصل</a>` : ''}
      </div>
    </div>
  `);

  if (page === 'cultural') await renderGenericGrid('cultural_resources', 'eventsGrid', (item) => `
    <div class="store-card" style="border:1px solid var(--line); border-radius:18px; background:rgba(255,255,255,0.02); padding:18px; display:flex; flex-direction:column; gap:12px;">
      <div class="store-topline" style="display:flex; justify-content:space-between; align-items:flex-start;">
        <h3 style="margin:0; font-size:1.15rem; color:white;">${escapeHtml(item.title)}</h3>
        <span class="store-chip" style="font-size:0.8rem; flex-shrink:0;"><i class="fa-solid fa-book-open"></i> ${escapeHtml(item.resource_type || 'مصادر/كتب')}</span>
      </div>
      <div style="margin-top:auto; padding-top:15px;">
        ${item.resource_url ? `<a href="${item.resource_url}" target="_blank" class="cta-btn secondary-btn" style="width:100%;"><i class="fa-solid fa-download"></i> تصفح المصدر</a>` : ''}
      </div>
    </div>
  `);
  
  q('#logoutBtn')?.addEventListener('click', window.handleLogout);
}


document.addEventListener('DOMContentLoaded', async () => {
  if (!window._initDone) { 
    window._initDone = true; 
    await initPage(); 
  }
  if (document.body.dataset.page === 'gallery') {
    await loadGalleryPage();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const signupForm = q('#signupForm');
  if (!signupForm) return;

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = q('#signupForm button[type="submit"]');
    const msg = q('#signupMsg');
    
    const name = q('#signupName').value.trim();
    const username = normalizeUsername(q('#signupUsername').value);
    const email = q('#signupEmail').value.trim();
    const password = q('#signupPassword').value;
    const promoCode = q('#signupPromo')?.value.trim(); 

    setBusy(btn, true, 'جاري إنشاء الحساب...', 'إنشاء الحساب 📝');
    if (msg) { msg.textContent = ''; msg.style.display = 'none'; }

    let finalRole = 'member';
    let finalCommittee = '';
    let finalPosition = 'Member';
    let codeIdToUpdate = null;

    try {
     if (promoCode) {
        const { data: codeData, error: codeError } = await window.sb
          .from('promo_codes')
          .select('*')
          .ilike('code', promoCode) 
          .maybeSingle();

        if (codeError) throw new Error("حدث خطأ أثناء الاتصال بقاعدة البيانات.");
        if (!codeData) throw new Error("كود الترقية الذي أدخلته غير صحيح أو منتهي!");
        if (codeData.is_active === false) throw new Error("عفواً، هذا الكود تم إيقاف تفعيله.");

        finalRole = codeData.role || 'member';
        finalCommittee = codeData.committee_key || 'none';
        finalPosition = codeData.committee_position || 'Member';
        codeIdToUpdate = codeData.id;
      }

      const { data, error } = await window.sb.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name, username: username }
        }
      });

      if (error) throw error;

      if (data?.user) {
        setTimeout(async () => {
          const { error: updateErr } = await window.sb.from('profiles').update({
            role: finalRole,
            committee_key: finalCommittee,      
            committee_position: finalPosition,  
            committee: finalCommittee,          
            position: finalPosition,            
            updated_at: new Date().toISOString()
          }).eq('id', data.user.id);
          
          if (updateErr) console.error("Error updating profile:", updateErr);

          if (codeIdToUpdate) {
             await window.sb.rpc('increment_promo_use', { row_id: codeIdToUpdate })
             .catch(async () => {
                const { data: currentCode } = await window.sb.from('promo_codes').select('current_uses').eq('id', codeIdToUpdate).single();
                if (currentCode) {
                  await window.sb.from('promo_codes').update({ current_uses: (currentCode.current_uses || 0) + 1 }).eq('id', codeIdToUpdate);

                }
             });
          }
        }, 1500); 
      }

      if (msg) {
        msg.className = 'auth-msg success show'; 
        msg.style.display = 'block';
        msg.innerHTML = '<i class="fa-solid fa-check-circle"></i> تم إنشاء حسابك بنجاح! يرجي التفعيل من خلال البريد الالكتروني ... 🚀';
        signupForm.reset();
        
        setTimeout(() => {
          window.location.href = 'auth.html';
        }, 2000);
      }

    } catch (err) {
      if (msg) {
        msg.className = 'auth-msg error show';
        msg.style.display = 'block';
        msg.textContent = err.message;
      }
    } finally {
      setBusy(btn, false, '', 'إنشاء الحساب 📝');
    }
  });
});

window.handleLogout = async function(e) {
  if (e) e.preventDefault();
  try {
    if (window.sb) {
      await window.sb.auth.signOut();
    }
    localStorage.removeItem('aliens_role');
    localStorage.removeItem('sb-hvvfvsugamyexvvqhzkw-auth-token'); 
    sessionStorage.clear();
    
    window.location.href = 'auth.html';
  } catch (err) {
    console.error("Logout Error:", err);
    window.location.href = 'auth.html';
  }
};

document.addEventListener('click', (e) => {
  const logoutBtn = e.target.closest('#logoutQuickBtn') || 
                    e.target.closest('#sidebarLogoutBtn') || 
                    e.target.closest('#logoutBtn');
  
  if (logoutBtn) {
    window.handleLogout(e);
  }
});

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.join-crew-btn');
  if (btn) {
    e.preventDefault();
    if (typeof window.openApplicationForm === 'function') {
      window.openApplicationForm();
    } else {
      console.error("openApplicationForm is not defined");
    }
  }
});

async function syncWhatsAppButtons() {
  const headBtn = q('#headWhatsAppBtn');
  const subBtn = q('#subWhatsAppBtn');
  
  if (!headBtn && !subBtn) return;

  try {
    const { data: settings, error } = await window.sb
      .from('site_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['pr_head_phone', 'pr_sub_phone']);

    if (error || !settings) {
      console.error("خطأ في جلب إعدادات الواتساب:", error);
      return;
    }

    const formatPhone = (phoneStr) => {
      if (!phoneStr) return null;
      let clean = phoneStr.replace(/\D/g, ''); 
      if (clean.startsWith('0')) clean = '20' + clean.substring(1);
      else if (clean.length === 10) clean = '20' + clean; 
      return clean;
    };

    const headSetting = settings.find(s => s.setting_key === 'pr_head_phone')?.setting_value;
    const subSetting = settings.find(s => s.setting_key === 'pr_sub_phone')?.setting_value;

    const headPhone = formatPhone(headSetting);
    const subPhone = formatPhone(subSetting);

    if (headBtn && headPhone) {
      headBtn.href = `https://wa.me/${headPhone}`;
      headBtn.style.display = 'inline-flex';
    } else if (headBtn) {
      headBtn.style.display = 'none'; 
    }

    if (subBtn && subPhone) {
      subBtn.href = `https://wa.me/${subPhone}`;
      subBtn.style.display = 'inline-flex';
    } else if (subBtn) {
      subBtn.style.display = 'none'; 
    }

  } catch (err) {
    console.error("خطأ تقني في أزرار الواتساب:", err);
  }
}

window.toggleMemoryLike = async function(memoryId, currentlyLiked) {
  const ctx = await getContext();
  if(!ctx.session) return showToast('يجب تسجيل الدخول', 'warning');
  const userId = ctx.session.user.id;
  try {
    if (currentlyLiked) {
      await window.sb.from('memory_likes').delete().eq('memory_id', memoryId).eq('user_id', userId);
    } else {
      await window.sb.from('memory_likes').insert({ memory_id: memoryId, user_id: userId });
    }
    setupMemoriesPage(ctx); 
  } catch(e) { showToast('خطأ في الإعجاب', 'error'); }
};

window.addMemoryComment = async function(memoryId) {
  const ctx = await getContext();
  if(!ctx.session) return showToast('يجب تسجيل الدخول', 'warning');
  const text = q(`#commentInput_${memoryId}`).value.trim();
  if(!text) return;
  try {
    await window.sb.from('memory_comments').insert({
      memory_id: memoryId, user_id: ctx.session.user.id, author_name: ctx.profile?.full_name || 'عضو', comment_text: text
    });
    showToast('تمت إضافة التعليق', 'success');
    setupMemoriesPage(ctx); 
  } catch(e) { showToast('خطأ في التعليق', 'error'); }
};