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
      <div class="modal-card" style="max-width: 600px; max-height: 90vh; overflow-y: auto;">
        <div class="modal-header">
          <div><h3 style="margin:0 0 6px; color: var(--accent);"><i class="fa-solid fa-rocket"></i> نموذج الانضمام</h3></div>
          <button type="button" class="modal-close">×</button>
        </div>
        <form id="nativeApplyForm" class="table-like">
          <div class="admin-form-group"><label>الاسم الرباعي</label><input type="text" id="applyName" required></div>
          <div class="admin-form-group"><label>رقم الواتساب</label><input type="text" id="applyPhone" placeholder="مثال: 01xxxxxxxxx" required></div>
          <div class="admin-form-group"><label>اللجنة</label>
            <select id="applyCommittee" required>
              <option value="" disabled selected>-- اختر لجنتك --</option>
              <option value="pr">PR</option>
              <option value="ir">IR</option>
              <option value="media">Media</option>
              <option value="marketing">Marketing</option>
              <option value="magic_hand">Magic Hand</option>
              <option value="event_planning">Event Planning</option>
            </select>
          </div>
          
          <!-- حاوية الأسئلة الديناميكية -->
          <div id="dynamicQuestionsArea" style="margin-top: 15px; border-top: 1px solid var(--line); padding-top: 15px;"></div>

          <button type="submit" class="cta-btn primary-btn" id="submitApplyBtn" style="margin-top: 20px; width: 100%;">إرسال الطلب 🚀</button>
          <p id="applyMsg" class="auth-msg"></p>
        </form>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('.modal-close').onclick = () => modal.classList.remove('show');

    // جلب الأسئلة بناءً على اللجنة
    q('#applyCommittee', modal).addEventListener('change', async (e) => {
      const committee = e.target.value;
      const qArea = q('#dynamicQuestionsArea', modal);
      qArea.innerHTML = '<p style="color:var(--muted);"><i class="fa-solid fa-spinner fa-spin"></i> جاري تحميل أسئلة اللجنة...</p>';

      const { data: questions } = await window.sb.from('dynamic_questions').select('*').eq('committee_key', committee);

      if (!questions || questions.length === 0) {
         qArea.innerHTML = `
 `;
      } else {
         qArea.innerHTML = questions.map(q => `
            <div class="admin-form-group" style="margin-bottom: 15px;">
                <label style="color:var(--accent);">${escapeHtml(q.question_text)}</label>
                <textarea class="dynamic-answer" data-question="${escapeHtml(q.question_text)}" rows="2" required></textarea>
            </div>
         `).join('');
      }
    });

    // إرسال الطلب للإدارة
    q('#nativeApplyForm', modal).addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = q('#submitApplyBtn', modal); 
      const msg = q('#applyMsg', modal);
      const name = q('#applyName', modal).value.trim();
      const phone = q('#applyPhone', modal).value.trim();
      const committee = q('#applyCommittee', modal).value;

      if (!committee) return setMessage(msg, 'يرجى اختيار اللجنة.', 'warning');

      // تجميع الإجابات في شكل JSON
      const answers = {};
      qa('.dynamic-answer', modal).forEach(ta => {
          answers[ta.dataset.question] = ta.value.trim();
      });

      setBusy(btn, true, 'جاري الإرسال...', 'إرسال الطلب 🚀');
      try {
        const { error } = await window.sb.from('applications').insert([{
            applicant_name: name,
            phone: phone,
            committee_key: committee,
            committee_name: q('#applyCommittee').options[q('#applyCommittee').selectedIndex].text,
            dynamic_answers: answers,
            role_requested: 'Member', // تم إضافة هذا السطر لحل المشكلة
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
    
    // إذا لم يكن إيميل، ابحث في جدول البروفايل عن الـ email المرتبط بالـ username
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
    
    // تسجيل الدخول
    const { data, error } = await window.sb.auth.signInWithPassword({ email, password });
    
    if (error) {
       return setMessage(msg, 'البريد أو كلمة المرور غير صحيحة.', 'error');
    }
    
    // تحديث الكاش والتحويل
    window._cachedContext = null; 
    await getContext(); 
    window.location.href = 'index.html'; // خليه يروح للرئيسية وهو هيحول نفسه للوحة التحكم
    
  } catch (err) {
    setMessage(msg, 'خطأ في الاتصال بالسيرفر.', 'error');
  }
}
async function loadGalleryPage() {
  const container = q('#dynamicGalleryContainer');
  if (!container) return;

  const { data: items } = await window.sb.from('gallery_images').select('*').order('created_at', { ascending: false });
  const userId = window._cachedContext?.session?.user?.id;
  
  // 1. التعديل هنا: استخدمنا image_name بدل image_id
  const { data: myLikes } = userId ? await window.sb.from('gallery_likes').select('image_name').eq('user_id', userId) : { data: [] };
  
  // 2. التعديل هنا: استخدام image_name للمقارنة
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

// لا تنسى استدعاء تحديث العدادات لكل الصور بعد ما الكود يخلص
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

  // 1. تحديث الـ UI فوراً (Optimistic UI)
  const btn = q(`button[onclick="toggleLike(${imageId})"]`);
  const icon = btn.querySelector('i');
  const isLiked = icon.classList.contains('fa-solid');
  
  // نعكس الحالة فوراً
  icon.classList.toggle('fa-solid');
  icon.classList.toggle('fa-regular');
  btn.style.color = isLiked ? '#fff' : '#ef4444';

  // 2. تحديث الداتابيز في الخلفية
  try {
    if (isLiked) {
      await window.sb.from('gallery_likes').delete().eq('image_name', imageId).eq('user_id', userId);
    } else {
      await window.sb.from('gallery_likes').insert([{ image_name: imageId, user_id: userId }]);
    }
    // تحديث العداد بعد الرفع
    updateLikeCount(imageId);
  } catch (e) {
    // لو حصل خطأ، نرجع الحالة زي ما كانت
    icon.classList.toggle('fa-solid');
    icon.classList.toggle('fa-regular');
    btn.style.color = isLiked ? '#ef4444' : '#fff';
    showToast('خطأ في الاتصال بالسيرفر', 'error');
  }
};



async function initPage() {
  const ctx = await getContext(); const page = getPageKey();

if (page === 'home' || page === 'index') {
    await syncWhatsAppButtons();
  }
  
  if (page === 'admin') await setupAdmin(ctx); // تشغيل لوحة التحكم
  q('#logoutBtn')?.addEventListener('click', window.handleLogout);
}

document.addEventListener('DOMContentLoaded', async () => { // <--- إضافة async هنا ضرورية
  if (!window._initDone) { 
    window._initDone = true; 
    await initPage(); // أضفنا await هنا للضمان
  }

  // الآن ستعمل الدالة بشكل سليم
  if (document.body.dataset.page === 'gallery') {
    await loadGalleryPage();
  }
});

// =========================================================
// نظام إنشاء الحساب الديناميكي (Sign Up) - النسخة النهائية المعتمدة
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
  const signupForm = q('#signupForm');
  if (!signupForm) return;

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = q('#signupForm button[type="submit"]');
    const msg = q('#signupMsg');
    
    // جلب البيانات من الفورم
    const name = q('#signupName').value.trim();
    const username = normalizeUsername(q('#signupUsername').value);
    const email = q('#signupEmail').value.trim();
    const password = q('#signupPassword').value;
    const promoCode = q('#signupPromo')?.value.trim(); 

    setBusy(btn, true, 'جاري إنشاء الحساب...', 'إنشاء الحساب 📝');
    if (msg) { msg.textContent = ''; msg.style.display = 'none'; }

    // القيم الافتراضية لأي عضو جديد
    let finalRole = 'member';
    let finalCommittee = '';
    let finalPosition = 'Member';
    let codeIdToUpdate = null; // عشان نزود عدد الاستخدامات لو فيه كود

    try {
      // 1. التحقق من كود الترقية وسحب البيانات الجاهزة من الداتابيز
     if (promoCode) {
        const { data: codeData, error: codeError } = await window.sb
          .from('promo_codes')
          .select('*')
          .ilike('code', promoCode) 
          .maybeSingle();

        if (codeError) throw new Error("حدث خطأ أثناء الاتصال بقاعدة البيانات.");
        if (!codeData) throw new Error("كود الترقية الذي أدخلته غير صحيح أو منتهي!");
        if (codeData.is_active === false) throw new Error("عفواً، هذا الكود تم إيقاف تفعيله.");

        // سحب البيانات المباشرة من العواميد اللي ظبطناها في الداتابيز
        finalRole = codeData.role || 'member';
        // خلينا الافتراضي 'none' عشان الداتابيز متبقاش فاضية
        finalCommittee = codeData.committee_key || 'none';
        finalPosition = codeData.committee_position || 'Member';
        codeIdToUpdate = codeData.id;
      }

      // 2. إنشاء الحساب في Supabase Auth
      const { data, error } = await window.sb.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name, username: username }
        }
      });

      if (error) throw error;

      // 3. تحديث جدول الـ profiles بالعواميد الموحدة والقديمة (الضخ المزدوج)
      if (data?.user) {
        setTimeout(async () => {
          // تحديث بيانات العضو
          const { error: updateErr } = await window.sb.from('profiles').update({
            role: finalRole,
            committee_key: finalCommittee,      // العمود الجديد
            committee_position: finalPosition,  // العمود الجديد للرتبة
            committee: finalCommittee,          // العمود القديم (عشان core.js يقرأه)
            position: finalPosition,            // العمود القديم (عشان core.js يقرأه)
            updated_at: new Date().toISOString()
          }).eq('id', data.user.id);
          
          if (updateErr) console.error("Error updating profile:", updateErr);

          // زيادة عداد استخدامات البرومو كود بـ 1
          if (codeIdToUpdate) {
             await window.sb.rpc('increment_promo_use', { row_id: codeIdToUpdate }) // لو عاملها بـ RPC
             .catch(async () => {
                // بديل سريع لو معندكش دالة RPC
                const { data: currentCode } = await window.sb.from('promo_codes').select('current_uses').eq('id', codeIdToUpdate).single();
                if (currentCode) {
                  await window.sb.from('promo_codes').update({ current_uses: (currentCode.current_uses || 0) + 1 }).eq('id', codeIdToUpdate);
                }
             });
          }
        }, 1500); // تأخير 1.5 ثانية لضمان عمل الـ Trigger
      }

      // 4. إظهار رسالة النجاح والدخول الفوري
      if (msg) {
        msg.className = 'auth-msg success show'; 
        msg.style.display = 'block';
        msg.innerHTML = '<i class="fa-solid fa-check-circle"></i> تم إنشاء حسابك بنجاح! يرجي التفعيل من خلال البريد الالكتروني ... 🚀';
        signupForm.reset();
        
        // توجيه المستخدم بعد ثانيتين
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

// =========================================================
// نظام تسجيل الخروج الإجباري (Sign Out)
// =========================================================
window.handleLogout = async function(e) {
  if (e) e.preventDefault();
  try {
    if (window.sb) {
      await window.sb.auth.signOut();
    }
    // تنظيف الكاش والسيشن عشان ميفتكرش اليوزر القديم
    localStorage.removeItem('aliens_role');
    localStorage.removeItem('sb-hvvfvsugamyexvvqhzkw-auth-token'); // مسح توكن التخزين
    sessionStorage.clear();
    
    // توجيه لصفحة تسجيل الدخول
    window.location.href = 'auth.html';
  } catch (err) {
    console.error("Logout Error:", err);
    window.location.href = 'auth.html';
  }
};

// ربط الدالة بأي زرار خروج في الشاشة أوتوماتيك
document.addEventListener('click', (e) => {
  const logoutBtn = e.target.closest('#logoutQuickBtn') || 
                    e.target.closest('#sidebarLogoutBtn') || 
                    e.target.closest('#logoutBtn');
  
  if (logoutBtn) {
    window.handleLogout(e);
  }
});

// أضف هذا الجزء في app.js لربط جميع أزرار الانضمام
document.addEventListener('click', (e) => {
  // بنشوف لو العنصر اللي اتضغط عليه هو الزرار أو جزء جواه
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
  // 1. جلب الإعدادات من الداتابيز
  const { data } = await window.sb.from('site_settings').select('*');
  if (!data) return;

  const settings = new Map(data.map(row => [row.setting_key, row.setting_value]));

  // 2. جلب الأرقام
  const headPhone = settings.get('pr_head_phone');
  const subHeadPhone = settings.get('pr_sub_head_phone');

  // 3. تحديث الأزرار في الصفحة index_3.html
  const headBtn = q('#headWhatsAppBtn');
  const subBtn = q('#subWhatsAppBtn');

  if (headBtn && headPhone) {
    headBtn.href = `https://wa.me/${headPhone.replace(/\D/g, '')}`;
    headBtn.target = "_blank"; // إضافة هذا السطر لفتح الرابط في صفحة جديدة
  }
  
  if (subBtn && subHeadPhone) {
    subBtn.href = `https://wa.me/${subHeadPhone.replace(/\D/g, '')}`;
    subBtn.target = "_blank"; // إضافة هذا السطر لفتح الرابط في صفحة جديدة
  }
}