async function initProfile() {
  const btn = q('#saveProfileBtn');
  setBusy(btn, true, 'جاري تحميل بياناتك...');

  let ctx = await window.getContext();
  
  if (!ctx || !ctx.session) {
    window.location.href = 'auth.html';
    return;
  }

  const p = ctx.profile;

  if (!p) {
    q('#userNameDisplay').innerText = "خطأ في تحميل البيانات";
    return;
  }

  // 1. تحديث بطاقة المستخدم (السايد بار)
  q('#userNameDisplay').innerText = p.full_name || 'عضو Aliens';
  q('#userUsernameDisplay').innerText = p.username ? `@${p.username}` : 'بدون يوزرنيم';
  
  // تحديث الصورة
  const avatarPreview = q('#avatarPreview');
  if (p.avatar_url) {
    avatarPreview.src = p.avatar_url;
  } else {
    // صورة افتراضية لو معندوش
    avatarPreview.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(p.full_name || 'Aliens') + '&background=random&color=fff';
  }

  // تحديث الشارات (Badges)
  const roleBadge = q('#userRoleBadge');
  const commBadge = q('#userCommitteeBadge');
  const posBadge = q('#userPositionBadge');

  roleBadge.innerText = (p.role || 'Member').toUpperCase();
  
  if (p.committee) {
    commBadge.style.display = 'inline-block';
    commBadge.innerText = p.committee.toUpperCase();
  }
  
  if (p.position && p.position !== 'Member') {
    posBadge.style.display = 'inline-block';
    posBadge.innerText = p.position;
  }

  // 2. تحديث حقول الإدخال
  q('#editFullName').value = p.full_name || '';
  q('#editUsername').value = p.username || '';

  // 3. جلب التقييمات الشهرية
  const { data: evals } = await window.sb
    .from('performance_evaluations')
    .select('*')
    .eq('member_id', p.id)
    .order('evaluation_month', { ascending: false });

  const list = q('#userEvaluationsList');
  if (evals && evals.length > 0) {
    list.innerHTML = evals.map(e => `
      <div style="background:rgba(255,255,255,0.02); border:1px solid #222; border-radius:8px; padding:15px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div style="display:flex; align-items:center; gap:15px;">
          <div style="background:#111; padding:10px; border-radius:8px; border:1px solid #333; text-align:center; min-width:80px;">
            <i class="fa-regular fa-calendar" style="color:var(--accent); margin-bottom:5px;"></i>
            <div style="font-size:0.85rem; color:white;">${e.evaluation_month}</div>
          </div>
          <div>
            <div style="font-size:0.85rem; color:var(--muted);">ملاحظات التقييم:</div>
            <div style="color:white; font-size:0.95rem;">${escapeHtml(e.notes || 'لا توجد ملاحظات.')}</div>
          </div>
        </div>
        <div style="background:rgba(57,255,20,0.1); color:var(--accent); font-weight:bold; padding:10px 15px; border-radius:8px; border:1px solid rgba(57,255,20,0.2);">
          ${e.score} / 100
        </div>
      </div>
    `).join('');
  } else {
    list.innerHTML = '<div style="background:rgba(255,255,255,0.02); padding:20px; border-radius:8px; text-align:center; color:var(--muted);">لم يتم تسجيل أي تقييمات لك حتى الآن.</div>';
  }
  
  setBusy(btn, false, '', 'حفظ التعديلات 💾');
}

// تشغيل الـ Live Preview للصورة لما يختار ملف
q('#editAvatar')?.addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      q('#avatarPreview').src = e.target.result;
    }
    reader.readAsDataURL(file);
  }
});

// حفظ البيانات
q('#editProfileForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = q('#saveProfileBtn');
  setBusy(btn, true, 'جاري الحفظ...');

  try {
    const ctx = await window.getContext();
    const userId = ctx?.profile?.id;

    if (!userId) throw new Error("لم يتم التعرف على معرف المستخدم.");

    const fullName = q('#editFullName').value;
    const username = q('#editUsername').value;
    const newPass = q('#editPassword').value;
    const avatarFile = q('#editAvatar').files[0];

    const updates = { updated_at: new Date().toISOString() };
    if (fullName.trim()) updates.full_name = fullName.trim();
    if (username.trim()) updates.username = username.trim();

    // رفع الصورة لو موجودة
    if (avatarFile) {
      const avatarUrl = await uploadImage(avatarFile, 'avatars');
      if (avatarUrl) updates.avatar_url = avatarUrl;
    }

    // تحديث قاعدة بيانات الـ Profiles
    const { error: pError } = await window.sb.from('profiles').update(updates).eq('id', userId);
    if (pError) throw pError;

    // تحديث الباسورد في الـ Auth لو المستخدم كتب باسورد جديد
    if (newPass && newPass.length >= 6) {
      const { error: authError } = await window.sb.auth.updateUser({ password: newPass });
      if (authError) throw authError;
    }

    // مسح الكاش وتحديث الصفحة
    window._cachedContext = null; 
    await window.getContext();    
    
    showToast('تم تحديث بياناتك بنجاح!', 'success');
    setTimeout(() => location.reload(), 1500);

  } catch (err) {
    showToast('خطأ: ' + err.message, 'error');
  } finally {
    setBusy(btn, false, '', 'حفظ التعديلات 💾');
  }
});

document.addEventListener('DOMContentLoaded', initProfile);