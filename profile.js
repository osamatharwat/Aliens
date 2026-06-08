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
    console.error("Profile not found in context!");
    q('#userNameDisplay').innerText = "خطأ في تحميل البيانات";
    return;
  }

  // تحديث الـ UI
  q('#userNameDisplay').innerText = p.full_name || 'عضو جديد';
  q('#userCommittee').innerText = p.committee ? p.committee.toUpperCase() : 'غير محدد';
  q('#userPosition').innerText = p.position || 'Member';

  // تحديث حقول الـ Input 
  q('#editFullName').value = p.full_name || '';
  q('#editUsername').value = p.username || '';

  // جلب التقييمات
  const { data: evals } = await window.sb
    .from('performance_evaluations')
    .select('*')
    .eq('member_id', p.id)
    .order('evaluation_month', { ascending: false });

  const list = q('#userEvaluationsList');
  if (evals && evals.length > 0) {
    list.innerHTML = evals.map(e => `
      <div class="table-row" style="padding:15px; border-bottom:1px solid #333; display:flex; justify-content:space-between; color:white;">
        <span><strong>${e.evaluation_month}</strong></span>
        <span>الدرجة: ${e.score}/100</span>
        <span style="color:var(--muted);">${e.notes || ''}</span>
      </div>
    `).join('');
  } else {
    list.innerHTML = '<p style="padding:15px; color:var(--muted);">لا يوجد تقييمات مسجلة بعد.</p>';
  }
  
  setBusy(btn, false, '', 'حفظ التعديلات 💾');
}

document.addEventListener('DOMContentLoaded', initProfile);

q('#editProfileForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = q('#saveProfileBtn');
  setBusy(btn, true, 'جاري الحفظ...');

  try {
    const ctx = await window.getContext();
    const userId = ctx?.profile?.id;

    if (!userId) {
      throw new Error("لم يتم التعرف على معرف المستخدم.");
    }

    const fullName = q('#editFullName').value;
    const username = q('#editUsername').value;
    const newPass = q('#editPassword').value;
    const avatarFile = q('#editAvatar').files[0];

    const updates = {};
    if (fullName.trim()) updates.full_name = fullName.trim();
    if (username.trim()) updates.username = username.trim();

    if (avatarFile) {
      const avatarUrl = await uploadImage(avatarFile, 'avatars');
      if (avatarUrl) updates.avatar_url = avatarUrl;
    }

    const { error: pError } = await window.sb.from('profiles')
      .update(updates)
      .eq('id', userId);

    if (pError) throw pError;

    if (newPass) {
      const { error: authError } = await window.sb.auth.updateUser({ password: newPass });
      if (authError) throw authError;
    }

    window._cachedContext = null; 
    await window.getContext();    
    
    showToast('تم تحديث بياناتك بنجاح!', 'success');
    setTimeout(() => location.reload(), 1000);

  } catch (err) {
    showToast('خطأ: ' + err.message, 'error');
  } finally {
    setBusy(btn, false, '', 'حفظ التعديلات 💾');
  }
});


q('#editProfileForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = q('#saveProfileBtn');
  setBusy(btn, true, 'جاري الحفظ...');

  try {
    const ctx = await window.getContext();
    const userId = ctx?.profile?.id;

    if (!userId) {
      throw new Error("لم يتم التعرف على معرف المستخدم.");
    }

    const fullName = q('#editFullName').value;
    const username = q('#editUsername').value;
    const newPass = q('#editPassword').value;
    const avatarFile = q('#editAvatar').files[0];

    const updates = {};
    if (fullName.trim()) updates.full_name = fullName.trim();
    if (username.trim()) updates.username = username.trim();

    if (avatarFile) {
      const avatarUrl = await uploadImage(avatarFile, 'avatars');
      if (avatarUrl) updates.avatar_url = avatarUrl;
    }

    // التنفيذ
    const { error: pError } = await window.sb.from('profiles')
      .update(updates)
      .eq('id', userId);

    if (pError) throw pError;

    if (newPass && newPass.length >= 6) {
      const { error: authError } = await window.sb.auth.updateUser({ password: newPass });
      if (authError) throw authError;
    }

    // تحديث السيستم
    window._cachedContext = null; 
    await window.getContext();    
    
    showToast('تم تحديث بياناتك بنجاح!', 'success');
    setTimeout(() => location.reload(), 1000);

  } catch (err) {
    showToast('خطأ: ' + err.message, 'error');
  } finally {
    setBusy(btn, false, '', 'حفظ التعديلات 💾');
  }
});
