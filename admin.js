// ==========================================
// 1. دالة طي وفتح الأقسام (Accordion Logic) - محدثة للـ UX
// ==========================================
function initAccordions() {
  const cards = document.querySelectorAll('.admin-card');
  
  cards.forEach(card => {
    // 1. إجبار الكارت إنه ياخد العرض الكامل عشان نلغي شكل الشبكة العشوائي
    card.style.gridColumn = '1 / -1'; 
    card.style.marginBottom = '5px'; 

    const header = card.querySelector('h3');
    if (!header) return;

    // 2. تجميع النص والأيقونة الأساسية مع بعض في الجنب اليمين
    const titleHTML = header.innerHTML;
    header.innerHTML = ''; // تفريغ الهيدر القديم
    
    const titleSpan = document.createElement('span');
    titleSpan.innerHTML = titleHTML;
    titleSpan.style.display = 'flex';
    titleSpan.style.alignItems = 'center';
    titleSpan.style.gap = '12px';

    // 3. أيقونة السهم في الجنب الشمال
    const icon = document.createElement('i');
    icon.className = 'fa-solid fa-chevron-down toggle-icon';
    icon.style.transition = 'transform 0.3s ease';
    icon.style.fontSize = '1.1rem';
    icon.style.color = 'var(--muted)';

    header.appendChild(titleSpan);
    header.appendChild(icon);

    // 4. تظبيط شكل الهيدر (المؤشر والمسافات)
    header.style.cursor = 'pointer';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.userSelect = 'none';
    header.style.padding = '5px 0';
    
    // 5. تغليف محتوى الكارت
    const contentElements = Array.from(card.children).filter(child => child !== header);
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'card-content-wrapper';
    contentWrapper.style.display = 'none'; // مقفول افتراضياً
    contentWrapper.style.paddingTop = '20px';
    contentWrapper.style.borderTop = '1px solid rgba(255,255,255,0.05)';
    contentWrapper.style.marginTop = '15px';
    
    contentElements.forEach(el => contentWrapper.appendChild(el));
    card.appendChild(contentWrapper);

    // 6. تفعيل الضغط
    header.addEventListener('click', () => {
      const isClosed = contentWrapper.style.display === 'none';
      
      if (isClosed) {
        contentWrapper.style.display = 'block';
        icon.style.transform = 'rotate(180deg)';
        header.style.color = 'var(--accent)'; // تلوين العنوان بالأخضر لما يفتح
        icon.style.color = 'var(--accent)';
      } else {
        contentWrapper.style.display = 'none';
        icon.style.transform = 'rotate(0deg)';
        header.style.color = ''; // إرجاع اللون الأصلي
        icon.style.color = 'var(--muted)';
      }
    });
  });
}

// ==========================================
// 2. إدارة الأعضاء (الفلترة، التصدير، والإدارة)
// ==========================================
async function renderProfilesManagement() {
  const container = q('#profilesManagementList');
  if (!container || !window.sb) return;

  const { data: profiles, error: pError } = await window.sb
    .from('profiles')
    .select('*')
    .order('full_name', { ascending: true });

  if (pError) return container.innerHTML = `<div style="color:#fca5a5; padding:10px;">خطأ في جلب الأعضاء: ${pError.message}</div>`;
  if (!profiles || profiles.length === 0) return container.innerHTML = '<div style="padding:10px; color:var(--muted);">لا يوجد أعضاء حالياً.</div>';

  const irMembers = profiles.filter(p => 
    p.role === 'ir' || p.role === 'hr' || 
    (p.committee && p.committee.toLowerCase() === 'ir') || 
    p.role === 'head' || p.role === 'OG'
  );

  // هيكل الفلترة والعرض
  container.innerHTML = `
    <div style="display:flex; gap:10px; margin-bottom:15px; flex-wrap:wrap; background:rgba(0,0,0,0.3); padding:15px; border-radius:8px; border:1px solid rgba(255,255,255,0.05);">
      <input type="text" id="searchMember" placeholder="ابحث بالاسم..." style="flex:1; min-width:150px; padding:8px; background:#111; color:white; border:1px solid #333; border-radius:4px;">
      <select id="filterCommittee" style="padding:8px; background:#111; color:white; border:1px solid #333; border-radius:4px;">
        <option value="all">كل اللجان</option>
        <option value="pr">PR</option>
        <option value="ir">IR</option>
        <option value="marketing">Marketing</option>
        <option value="media">Media</option>
        <option value="magic_hand">Magic Hand</option>
        <option value="event_planning">Event Planning</option>
      </select>
      <button id="exportMembersBtn" style="background:#10b981; color:#000; border:none; padding:8px 15px; border-radius:4px; cursor:pointer; font-weight:bold;">
        <i class="fa-solid fa-file-csv"></i> تصدير البيانات
      </button>
    </div>
    <div id="profilesRenderArea"></div>
  `;

  const renderArea = q('#profilesRenderArea');

  // دالة رسم الأعضاء بناءً على الفلتر
  const drawProfiles = () => {
    const searchTerm = q('#searchMember').value.toLowerCase();
    const selectedComm = q('#filterCommittee').value;

    const filtered = profiles.filter(p => {
      const matchName = (p.full_name || '').toLowerCase().includes(searchTerm);
      const matchComm = selectedComm === 'all' || (p.committee && p.committee.toLowerCase() === selectedComm);
      return matchName && matchComm;
    });

    if (filtered.length === 0) {
      renderArea.innerHTML = '<div style="padding:10px; color:var(--muted);">لا يوجد نتائج مطابقة للبحث.</div>';
      return;
    }

    renderArea.innerHTML = filtered.map(p => {
      const currentRole = p.role || 'member';
      const currentCommittee = p.committee || '';
      const currentPosition = p.position || 'Member';
      const currentAssignedIr = p.assigned_ir || '';

      return `
        <div class="table-row" style="display:flex; flex-direction:column; gap:12px; border-bottom:1px solid #222; padding:15px; background:rgba(255,255,255,0.02); border-radius:8px; margin-bottom:10px;">
          <div>
            <strong style="color:white; font-size:1.1rem;">${escapeHtml(p.full_name)}</strong>
            ${p.username ? `<span style="color:var(--muted); font-size:0.85rem; margin-right:8px;">(@${escapeHtml(p.username)})</span>` : ''}
          </div>
          <div style="display:flex; gap:15px; flex-wrap:wrap; background:rgba(0,0,0,0.4); padding:12px; border-radius:8px; border:1px solid rgba(255,255,255,0.05);">
            
            <div style="flex:1; min-width:140px;">
              <label style="font-size:0.8rem; color:var(--muted); display:block; margin-bottom:5px;">صلاحية الموقع:</label>
              <select class="profile-update-select" data-field="role" data-id="${p.id}" style="width:100%; padding:8px; background:#111; color:white; border:1px solid #333; border-radius:4px;">
                <option value="member" ${currentRole === 'member' ? 'selected' : ''}>Member</option>
                <option value="ir" ${currentRole === 'ir' ? 'selected' : ''}>IR / HR</option>
                <option value="head" ${currentRole === 'head' ? 'selected' : ''}>Head</option>
                <option value="OG" ${currentRole === 'OG' ? 'selected' : ''}>OG</option>
              </select>
            </div>

            <div style="flex:1; min-width:140px;">
              <label style="font-size:0.8rem; color:var(--muted); display:block; margin-bottom:5px;">اللجنة:</label>
              <select class="profile-update-select" data-field="committee" data-id="${p.id}" style="width:100%; padding:8px; background:#111; color:white; border:1px solid #333; border-radius:4px;">
                <option value="" ${currentCommittee === '' ? 'selected' : ''}>-- بدون لجنة --</option>
                <option value="pr" ${currentCommittee === 'pr' ? 'selected' : ''}>PR</option>
                <option value="ir" ${currentCommittee === 'ir' ? 'selected' : ''}>IR</option>
                <option value="marketing" ${currentCommittee === 'marketing' ? 'selected' : ''}>Marketing</option>
                <option value="media" ${currentCommittee === 'media' ? 'selected' : ''}>Media</option>
                <option value="magic_hand" ${currentCommittee === 'magic_hand' ? 'selected' : ''}>Magic Hand</option>
                <option value="event_planning" ${currentCommittee === 'event_planning' ? 'selected' : ''}>Event Planning</option>
              </select>
            </div>

            <div style="flex:1; min-width:140px;">
              <label style="font-size:0.8rem; color:var(--muted); display:block; margin-bottom:5px;">المنصب:</label>
              <select class="profile-update-select" data-field="position" data-id="${p.id}" style="width:100%; padding:8px; background:#111; color:white; border:1px solid #333; border-radius:4px;">
                <option value="Member" ${currentPosition === 'Member' ? 'selected' : ''}>Member</option>
                <option value="Sub-Head" ${currentPosition === 'Sub-Head' ? 'selected' : ''}>Sub-Head</option>
                <option value="Head" ${currentPosition === 'Head' ? 'selected' : ''}>Head</option>
              </select>
            </div>

            <div style="flex:1; min-width:140px;">
              <label style="font-size:0.8rem; color:var(--muted); display:block; margin-bottom:5px;">الـ IR المسؤول:</label>
              <select class="profile-update-select" data-field="assigned_ir" data-id="${p.id}" style="width:100%; padding:8px; background:#111; color:white; border:1px solid #333; border-radius:4px;">
                <option value="">-- غير محدد --</option>
                ${irMembers.map(ir => `<option value="${ir.id}" ${currentAssignedIr === ir.id ? 'selected' : ''}>${escapeHtml(ir.full_name)}</option>`).join('')}
              </select>
            </div>

          </div>
        </div>
      `;
    }).join('');

    // تفعيل حفظ التعديلات بعد الرسم
    qa('.profile-update-select', renderArea).forEach(sel => {
      sel.addEventListener('change', async (e) => {
        const field = e.target.dataset.field;
        const id = e.target.dataset.id;
        let val = e.target.value;
        if (field === 'assigned_ir' && val === "") val = null;

        const updateData = { updated_at: new Date().toISOString() };
        updateData[field] = val;

        const { error } = await window.sb.from('profiles').update(updateData).eq('id', id);
        if (error) window.showToast(`خطأ في التحديث: ${error.message}`, 'error');
        else window.showToast('تم التحديث بنجاح', 'success');
      });
    });
  };

  // دالة استخراج البيانات لـ CSV
  const exportToCSV = () => {
    const headers = ['الاسم', 'اليوزرنيم', 'صلاحية الموقع', 'اللجنة', 'المنصب'];
    const rows = profiles.map(p => [
      p.full_name || '',
      p.username || '',
      p.role || 'member',
      p.committee || 'بدون لجنة',
      p.position || 'Member'
    ]);
    
    // \uFEFF لحل مشكلة اللغة العربية في الإكسيل
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");
        
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "aliens_members.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ربط الأزرار والبحث بالدوال
  q('#searchMember').addEventListener('input', drawProfiles);
  q('#filterCommittee').addEventListener('change', drawProfiles);
  q('#exportMembersBtn').addEventListener('click', exportToCSV);

  // الرسم الأولي
  drawProfiles();
}

// ==========================================
// 3. إدارة أسئلة اللجان
// ==========================================
async function renderDynamicQuestionsManagement(ctx) {
  const list = q('#questionsManagementList');
  if (!list || !window.sb) return;

  const { data: questions, error } = await window.sb.from('dynamic_questions').select('*').order('committee_key', { ascending: true });

  if (error) return list.innerHTML = `<div style="color:#fca5a5; padding:10px;">خطأ: ${error.message}</div>`;
  if (!questions || questions.length === 0) return list.innerHTML = '<div style="padding:10px; color:var(--muted);">لا توجد أسئلة مضافة.</div>';

  list.innerHTML = questions.map(qObj => `
    <div class="table-row" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
      <div>
        <strong style="color:var(--accent);">${escapeHtml(qObj.committee_key.toUpperCase())}</strong>
        <span style="color:var(--muted); margin:0 5px;">|</span>
        <span>${escapeHtml(qObj.question_text)}</span>
      </div>
      <div style="display:flex; gap:10px;">
        <button onclick="editQuestion('${qObj.id}', '${escapeHtml(qObj.question_text)}', this)" style="background:#f59e0b; color:#000; border:none; padding:5px 10px; cursor:pointer; border-radius:4px;">
          <i class="fa-solid fa-pen"></i> تعديل
        </button>
        <button onclick="deleteRow('dynamic_questions', '${qObj.id}')" style="background:#dc2626; color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:4px;">
          <i class="fa-solid fa-trash"></i> حذف
        </button>
      </div>
    </div>
  `).join('');
}

window.editQuestion = async (id, oldText, btnElement) => {
  const newText = prompt("تعديل نص السؤال:", oldText);
  if (newText && newText.trim() !== "" && newText !== oldText) {
    const { error } = await window.sb.from('dynamic_questions').update({ question_text: newText.trim() }).eq('id', id);
    if (error) showToast("خطأ في التعديل", "error");
    else {
      showToast("تم تعديل السؤال بنجاح", "success");
      await renderDynamicQuestionsManagement(window._currentCtx);
    }
  }
};

// ==========================================
// 4. إدارة طلبات التقديم (صلاحيات مخصصة للـ Heads)
// ==========================================

async function renderApplicationsManagement(ctx) {
  const list = q('#applicationsManagementList');
  if (!list || !window.sb) return;

  // 1. تحديد الصلاحيات بناءً على بيانات المستخدم
  const userRole = ctx.role;
  const userCommittee = (ctx.profile?.committee || '').toLowerCase();
  // الـ Super Admin هو الـ OG أو أي حد في لجنة الـ IR
  const isSuperAdmin = userRole === 'OG' || userCommittee === 'ir' || userRole === 'ir' || userRole === 'hr';

  // 2. بناء الـ Query
  let query = window.sb.from('applications').select('*').order('created_at', { ascending: false });

  // لو مش Super Admin وهو Head للجنة معينة، نفلتر الطلبات على لجنته بس
  if (!isSuperAdmin && userRole === 'head' && userCommittee) {
    query = query.eq('committee_key', userCommittee);
  }

  const { data: apps, error: appsError } = await query;
  const { data: irMembers } = await window.sb.from('profiles').select('id, full_name').in('role', ['ir', 'hr', 'head', 'OG']);

  if (appsError) return list.innerHTML = `<div style="color:#fca5a5; padding:10px;">خطأ: ${appsError.message}</div>`;
  if (!apps || apps.length === 0) return list.innerHTML = '<div style="padding:10px; color:var(--muted);">لا توجد طلبات تقديم حالياً لِلجنتك.</div>';

  window._currentApps = apps;

  list.innerHTML = apps.map(app => {
    let phone = String(app.phone || '').replace(/\D/g, '');
    if (phone.startsWith('0')) phone = '20' + phone.substring(1);
    else if (phone && !phone.startsWith('20')) phone = '20' + phone;

    return `
      <div class="table-row" style="display:flex; flex-direction:column; gap:12px; border-bottom:1px solid #222; padding:15px; background:rgba(255,255,255,0.02); border-radius:8px; margin-bottom:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div>
            <strong style="color:white; font-size:1.1rem;">${escapeHtml(app.applicant_name || '')}</strong>
            <span style="color:var(--muted); margin:0 5px;">|</span>
            <span style="color:var(--accent); font-weight:bold;">${escapeHtml(app.committee_name || app.committee_key || '')}</span>
          </div>
          <div style="display:flex; gap:10px;">
            <button onclick="window.viewAnswers(${app.id})" 
  style="background:var(--accent); color:#000; padding:6px 12px; border:none; border-radius:6px; cursor:pointer; font-weight:bold;">
  <i class="fa-solid fa-eye"></i> الردود
</button>

            ${phone ? `<a href="https://wa.me/${phone}" target="_blank" style="background:#25D366; color:#000; padding:6px 12px; border-radius:6px; text-decoration:none; display:flex; align-items:center;"><i class="fa-brands fa-whatsapp"></i></a>` : ''}
         
   <button onclick="window.deleteApplication(${app.id})" 
  style="background:#dc2626; color:white; padding:6px 12px; border:none; border-radius:6px; cursor:pointer;">
  <i class="fa-solid fa-trash"></i>
</button>
          </div>
        </div>

        <div style="display:flex; gap:15px; flex-wrap:wrap; background:rgba(0,0,0,0.4); padding:12px; border-radius:8px; border:1px solid rgba(255,255,255,0.05);">
          <div style="flex:1; min-width:140px;">
            <label style="font-size:0.8rem; color:var(--muted); display:block; margin-bottom:5px;">مسؤول الـ IR:</label>
            <select class="ir-assignee-select" data-id="${app.id}" ${!isSuperAdmin ? 'disabled' : ''} style="width:100%; padding:8px; background:#111; color:white; border:1px solid #333; border-radius:4px; ${!isSuperAdmin ? 'opacity:0.6;' : ''}">
              <option value="">-- غير محدد --</option>
              ${(irMembers || []).map(m => `<option value="${m.id}" ${app.ir_assignee_id === m.id ? 'selected' : ''}>${escapeHtml(m.full_name)}</option>`).join('')}
            </select>
          </div>
          <div style="flex:1; min-width:140px;">
            <label style="font-size:0.8rem; color:var(--muted); display:block; margin-bottom:5px;">قرار الـ IR:</label>
            <select class="ir-status-select" data-id="${app.id}" ${!isSuperAdmin ? 'disabled' : ''} style="width:100%; padding:8px; background:#111; color:white; border:1px solid #333; border-radius:4px; ${!isSuperAdmin ? 'opacity:0.6;' : ''}">
              <option value="pending" ${app.ir_status === 'pending' ? 'selected' : ''}>⏳ قيد الانتظار</option>
              <option value="accepted" ${app.ir_status === 'accepted' ? 'selected' : ''}>✅ مقبول</option>
              <option value="rejected" ${app.ir_status === 'rejected' ? 'selected' : ''}>❌ مرفوض</option>
            </select>
          </div>
          <div style="flex:1; min-width:140px;">
            <label style="font-size:0.8rem; color:var(--muted); display:block; margin-bottom:5px;">قرار اللجنة:</label>
            <select class="committee-status-select" data-id="${app.id}" style="width:100%; padding:8px; background:#111; color:white; border:1px solid #333; border-radius:4px;">
              <option value="pending" ${app.committee_status === 'pending' ? 'selected' : ''}>⏳ قيد الانتظار</option>
              <option value="accepted" ${app.committee_status === 'accepted' ? 'selected' : ''}>✅ مقبول</option>
              <option value="rejected" ${app.committee_status === 'rejected' ? 'selected' : ''}>❌ مرفوض</option>
            </select>
          </div>
        </div>
      </div>
    `;
  }).join('');

  qa('.ir-assignee-select, .ir-status-select, .committee-status-select', list).forEach(sel => {
    sel.addEventListener('change', async (e) => {
      const id = e.target.dataset.id;
      const field = e.target.classList.contains('ir-assignee-select') ? 'ir_assignee_id' 
                  : e.target.classList.contains('ir-status-select') ? 'ir_status' 
                  : 'committee_status';
      let val = e.target.value;
      if (field === 'ir_assignee_id' && val === "") val = null;

      const updateData = { updated_at: new Date().toISOString() };
      updateData[field] = val;

      const { error } = await window.sb.from('applications').update(updateData).eq('id', id);
      if (error) window.showToast(`خطأ: ${error.message}`, 'error');
      else window.showToast('تم التحديث بنجاح', 'success');
    });
  });
}

// ==========================================
// 5. لوحة تقييم الـ IR (تم حل مشكلة الـ UUID)
// ==========================================
async function renderIRDashboard(ctx) {
  const list = q('#irInterviewsList');
  if (!list || !window.sb) return;

  // جلب الـ ID بطريقة آمنة جداً لمنع خطأ الـ undefined
  const userId = ctx.profile?.id || ctx.session?.user?.id;

  if (!userId) {
    list.innerHTML = '<div style="padding:10px; color:#fca5a5;">خطأ: لم يتم التعرف على معرف الحساب (UUID) الخاص بك.</div>';
    return;
  }

  const { data: myApps, error } = await window.sb
    .from('applications')
    .select('*')
    .eq('ir_assignee_id', userId) // تم استخدام المعرف الآمن هنا
    .order('created_at', { ascending: false });

  if (error) return list.innerHTML = `<div style="color:#fca5a5; padding:10px;">خطأ: ${error.message}</div>`;
  if (!myApps || myApps.length === 0) return list.innerHTML = '<div style="padding:10px; color:var(--muted);">لا يوجد متقدمين موكلين إليك حالياً.</div>';

  if (!window._currentApps) window._currentApps = [];
  myApps.forEach(a => { if (!window._currentApps.find(ca => ca.id === a.id)) window._currentApps.push(a); });

  list.innerHTML = myApps.map(app => {
    let phone = String(app.phone || '').replace(/\D/g, '');
    if (phone.startsWith('0')) phone = '20' + phone.substring(1);
    else if (phone && !phone.startsWith('20')) phone = '20' + phone;

    const currentNote = app.decision_note || '';

    return `
      <div class="table-row" style="display:flex; flex-direction:column; gap:12px; border-bottom:1px solid #222; padding:15px; background:rgba(255,255,255,0.02); border-radius:8px; margin-bottom:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div>
            <strong style="color:white; font-size:1.1rem;">${escapeHtml(app.applicant_name)}</strong>
            <span style="color:var(--muted); margin:0 5px;">|</span>
            <span style="color:var(--accent); font-weight:bold;">${escapeHtml(app.committee_name || app.committee_key)}</span>
          </div>
          <div style="display:flex; gap:10px;">
            <button onclick="viewAnswers(${app.id})" style="background:var(--accent); color:#000; padding:6px 12px; border:none; border-radius:6px; cursor:pointer; font-weight:bold;">
              <i class="fa-solid fa-eye"></i> إجابات الفورم
            </button>
            ${phone ? `<a href="https://wa.me/${phone}" target="_blank" style="background:#25D366; color:#000; padding:6px 12px; border-radius:6px; text-decoration:none; display:flex; align-items:center;"><i class="fa-brands fa-whatsapp"></i> تواصل</a>` : ''}
          </div>
        </div>

        <div style="background:rgba(0,0,0,0.4); padding:15px; border-radius:8px; border:1px solid rgba(255,255,255,0.05); display:flex; flex-direction:column; gap:10px;">
          <div>
            <label style="font-size:0.85rem; color:var(--muted); display:block; margin-bottom:5px;">ملاحظات المقابلة (نقاط القوة، الضعف، التقييم العام):</label>
            <textarea class="ir-note-input" data-id="${app.id}" rows="3" style="width:100%; padding:10px; background:#111; color:white; border:1px solid #333; border-radius:6px;" placeholder="اكتب ملاحظاتك هنا...">${escapeHtml(currentNote)}</textarea>
          </div>
          <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
            <div style="flex:1; min-width:150px;">
              <label style="font-size:0.85rem; color:var(--muted); display:block; margin-bottom:5px;">القرار النهائي:</label>
              <select class="ir-final-decision" data-id="${app.id}" style="width:100%; padding:8px; background:#111; color:white; border:1px solid #333; border-radius:4px;">
                <option value="pending" ${app.ir_status === 'pending' ? 'selected' : ''}>⏳ قيد الانتظار</option>
                <option value="accepted" ${app.ir_status === 'accepted' ? 'selected' : ''}>✅ مقبول</option>
                <option value="rejected" ${app.ir_status === 'rejected' ? 'selected' : ''}>❌ مرفوض</option>
              </select>
            </div>
            <button class="save-evaluation-btn" data-id="${app.id}" style="background:var(--accent); color:#000; padding:8px 20px; border:none; border-radius:6px; cursor:pointer; font-weight:bold; height:fit-content; align-self:flex-end;">
              حفظ التقييم 💾
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  qa('.save-evaluation-btn', list).forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.id;
      const noteStr = q(`.ir-note-input[data-id="${id}"]`, list).value;
      const statusStr = q(`.ir-final-decision[data-id="${id}"]`, list).value;

      const oldText = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الحفظ...';

      const { error } = await window.sb.from('applications').update({
        decision_note: noteStr, ir_status: statusStr, updated_at: new Date().toISOString()
      }).eq('id', id);

      btn.innerHTML = oldText;
      if (error) window.showToast('خطأ في الحفظ: ' + error.message, 'error');
      else window.showToast('تم حفظ التقييم بنجاح!', 'success');
    });
  });
}
// ==========================================
// 6. تحميل بيانات الأدمن العامة وحذف الصفوف
// ==========================================
async function loadAdminData() {
  await renderProfilesManagement();
  await renderDynamicQuestionsManagement();
  await renderGalleryManagement();
  
  const events = await fetchTable('events');
  const eventsContainer = q('#eventsManagementList');
  if (eventsContainer) {
    eventsContainer.innerHTML = events.map(ev => `
      <div class="table-row">
        <strong>${escapeHtml(ev.title)}</strong> 
        <button onclick="deleteRow('events', '${ev.id}')" style="background:#dc2626; color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:4px;">حذف</button>
      </div>
    `).join('');
  }
}

window.deleteRow = async (table, id) => {
  if (confirm('هل أنت متأكد من الحذف؟')) {
    await window.sb.from(table).delete().eq('id', id);
    loadAdminData();
  }
};

// ==========================================
// 8. شاشة تقييم الأداء الشهري (Performance Evaluations)
// ==========================================
async function renderPerformanceEvaluations(ctx) {
  const container = q('#performanceManagementList');
  if (!container || !window.sb) return;

  const userId = ctx.profile?.id || ctx.session?.user?.id;
  const userRole = ctx.role;
  const isSuperAdmin = userRole === 'OG' || userRole === 'head';

  // 1. جلب الأعضاء: الـ IR بيشوف الموزعين عليه بس، والـ Heads بيشوفوا كله للمتابعة
  let query = window.sb.from('profiles').select('id, full_name, committee, assigned_ir').neq('role', 'OG');
  
  if (!isSuperAdmin && (userRole === 'ir' || userRole === 'hr')) {
    query = query.eq('assigned_ir', userId);
  }

  const { data: members, error } = await query;
  if (error) return container.innerHTML = `<div style="color:#fca5a5;">خطأ في جلب الأعضاء: ${error.message}</div>`;
  if (!members || members.length === 0) return container.innerHTML = '<div style="color:var(--muted); padding:10px;">لا يوجد أعضاء موكلين إليك لتقييمهم حالياً.</div>';

  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  
  // 2. بناء واجهة التقييم
  let html = `
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; margin-bottom:15px; background:rgba(0,0,0,0.3); padding:15px; border-radius:8px; border:1px solid rgba(255,255,255,0.05);">
      <div>
        <label style="color:var(--muted); font-size:0.85rem; margin-left:10px;">اختر شهر التقييم:</label>
        <input type="month" id="evalMonth" value="${currentMonth}" style="padding:8px; background:#111; color:white; border:1px solid #333; border-radius:4px;">
      </div>
      <button id="exportEvalBtn" style="background:#10b981; color:#000; border:none; padding:8px 15px; border-radius:4px; cursor:pointer; font-weight:bold; margin-top:10px;">
        <i class="fa-solid fa-file-csv"></i> تصدير تقييمات الشهر لـ Excel
      </button>
    </div>
    <div id="evaluationsRenderArea">
  `;

  html += members.map(m => `
    <div class="table-row" style="display:flex; flex-direction:column; gap:12px; border-bottom:1px solid #222; padding:15px; background:rgba(255,255,255,0.02); border-radius:8px; margin-bottom:10px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <strong style="color:white; font-size:1.1rem;">${escapeHtml(m.full_name)} <span style="color:var(--accent); font-size:0.85rem;">(${escapeHtml(m.committee || 'بدون لجنة')})</span></strong>
      </div>
      <div style="display:flex; gap:10px; flex-wrap:wrap; background:rgba(0,0,0,0.4); padding:12px; border-radius:8px; align-items:center; border:1px solid rgba(255,255,255,0.05);">
        <div style="flex:1; min-width:100px;">
          <label style="font-size:0.8rem; color:var(--muted); display:block; margin-bottom:5px;">التقييم من 100:</label>
          <input type="number" class="eval-score" data-id="${m.id}" min="0" max="100" placeholder="مثال: 85" style="width:100%; padding:8px; background:#111; color:white; border:1px solid #333; border-radius:4px;">
        </div>
        <div style="flex:3; min-width:200px;">
          <label style="font-size:0.8rem; color:var(--muted); display:block; margin-bottom:5px;">ملاحظات الـ IR:</label>
          <input type="text" class="eval-notes" data-id="${m.id}" placeholder="الالتزام، التطور، نقاط الضعف..." style="width:100%; padding:8px; background:#111; color:white; border:1px solid #333; border-radius:4px;">
        </div>
        <button class="save-eval-btn" data-id="${m.id}" style="background:var(--accent); color:#000; padding:8px 20px; border:none; border-radius:6px; cursor:pointer; font-weight:bold; height:fit-content; align-self:flex-end;">
          حفظ التقييم
        </button>
      </div>
    </div>
  `).join('');

  html += `</div>`;
  container.innerHTML = html;

  // 3. تفعيل أزرار الحفظ (باستخدام Upsert عشان لو قيم مرتين في نفس الشهر يعمل Update مش Insert)
  qa('.save-eval-btn', container).forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const memberId = e.target.dataset.id;
      const score = q(`.eval-score[data-id="${memberId}"]`, container).value;
      const notes = q(`.eval-notes[data-id="${memberId}"]`, container).value;
      const month = q('#evalMonth', container).value;

      if (!score || !month) return window.showToast('يرجى إدخال التقييم والشهر أولاً', 'warning');

      const originalText = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
      
      const { error } = await window.sb.from('performance_evaluations').upsert([{
        member_id: memberId,
        evaluator_id: userId,
        evaluation_month: month,
        score: parseFloat(score),
        notes: notes
      }], { onConflict: 'member_id, evaluation_month' }); 

      btn.innerHTML = originalText;
      if (error) window.showToast('خطأ في الحفظ: ' + error.message, 'error');
      else window.showToast('تم حفظ التقييم بنجاح', 'success');
    });
  });

  // 4. تصدير التقييمات كـ CSV
  q('#exportEvalBtn', container).addEventListener('click', async () => {
    const month = q('#evalMonth', container).value;
    const { data, error } = await window.sb.from('performance_evaluations')
      .select('*, profiles!member_id(full_name, committee)')
      .eq('evaluation_month', month);
      
    if (error) return window.showToast('خطأ في جلب البيانات: ' + error.message, 'error');
    if (!data || data.length === 0) return window.showToast('لا توجد تقييمات مسجلة لهذا الشهر', 'warning');

    const headers = ['الاسم', 'اللجنة', 'شهر التقييم', 'الدرجة (من 100)', 'الملاحظات'];
    const rows = data.map(d => [
      d.profiles?.full_name || 'غير معروف',
      d.profiles?.committee || '-',
      d.evaluation_month,
      d.score,
      `"${(d.notes || '').replace(/"/g, '""')}"` // عشان لو فيه مسافات أو فواصل في الملاحظات متضربش الـ CSV
    ]);

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `evaluations_${month}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
}

// ==========================================
// إدارة معرض الصور - النسخة النهائية المربوطة بالداتا
// ==========================================
async function renderGalleryManagement() {
  const container = q('#galleryManagementList');
  if (!container) return;

  const { data: galleryItems, error } = await window.sb
    .from('gallery_images') // تم التعديل لاسم الجدول الصح
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return console.error("Error:", error);

  const sections = (galleryItems || []).reduce((acc, item) => {
    acc[item.section_name] = acc[item.section_name] || [];
    acc[item.section_name].push(item);
    return acc;
  }, {});

  container.innerHTML = Object.keys(sections).length === 0 
    ? '<p>لا توجد صور حالياً.</p>'
    : Object.keys(sections).map(section => `
    <div style="background:rgba(255,255,255,0.03); padding:15px; margin-bottom:10px; border:1px solid #333;">
      <h4>${escapeHtml(section)}</h4>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        ${sections[section].map(img => `
          <div style="position:relative; width:80px; height:80px;">
            <img src="${img.image_url}" style="width:100%; height:100%; object-fit:cover;"> <button onclick="deleteGalleryItem(${img.id})" style="position:absolute; top:0; right:0; background:red; border:none; color:white;">X</button>
          </div>
        `).join('')}
      </div>
      <button onclick="addNewImagesToSection('${escapeHtml(section)}')">إضافة صور</button>
    </div>
  `).join('');
}

q('#addGalleryImageForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = q('#gallerySubmitBtn');
  const section = q('#gallerySectionName').value.trim();
  const files = q('#galleryImgFile').files;

  if (!section || files.length === 0) return showToast('بيانات ناقصة', 'warning');

  setBusy(btn, true, 'جاري الرفع...');
  try {
    const urls = await uploadImages(files, 'gallery');
    await window.sb.from('gallery_images').insert(urls.map(url => ({ section_name: section, image_url: url }))); // تم التعديل
    showToast('تم الرفع!', 'success');
    q('#addGalleryImageForm').reset();
    await renderGalleryManagement();
  } catch (err) {
    showToast('خطأ: ' + err.message, 'error');
  } finally {
    setBusy(btn, false, '', 'رفع الصورة للمعرض 🖼️');
  }
});


// ==========================================
// 7. دالة الإعداد الرئيسية وصلاحيات الدخول (محدثة بالكامل)
// ==========================================
async function setupAdmin(ctx) {
  const allowedRoles = ['head', 'OG', 'ir', 'hr'];
  if (!allowedRoles.includes(ctx.role)) {
    document.body.innerHTML = '<h1>غير مصرح لك بدخول هذه الصفحة</h1>';
    return;
  }
  
  window._currentCtx = ctx; 
  setVisible(q('#adminLoader'), false);
  setVisible(q('#adminContent'), true);
  
  // 1. تفعيل الكروت بناءً على الدور
  const isSuperAdmin = ctx.role === 'OG' || ctx.role === 'head';
  
  // إظهار كارت التقييم الشهري للجميع
  q('#card-performance').style.display = 'block';
  q('#card-ir-dashboard').style.display = 'block';

  if (ctx.role === 'ir' || ctx.role === 'hr') {
    // الـ IR بيشوف كروت الـ IR فقط
    qa('.admin-card').forEach(card => {
      if (card.id !== 'card-ir-dashboard' && card.id !== 'card-performance') {
        card.style.display = 'none';
      }
    });
    await renderIRDashboard(ctx);
    await renderPerformanceEvaluations(ctx);
  } else {
    // الـ Heads و OG بيشوفوا كل حاجة
    await loadAdminData();
    await renderApplicationsManagement(ctx);
    await renderIRDashboard(ctx);
    await renderPerformanceEvaluations(ctx);
    
    // إعدادات اللجان
    const userCommittee = (ctx.profile?.committee || '').toLowerCase();
    const qSelect = q('#questionCommittee');
    const isOwner = ctx.role === 'OG' || userCommittee === 'ir';
    
    if (!isOwner && qSelect) {
      Array.from(qSelect.options).forEach(opt => {
        if (opt.value && opt.value !== userCommittee) opt.disabled = true;
      });
      if (Array.from(qSelect.options).some(o => o.value === userCommittee)) {
        qSelect.value = userCommittee;
      }
    }

    // فورم إضافة سؤال
    q('#addQuestionForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const committee = q('#questionCommittee').value;
      const text = q('#questionText').value.trim();
      if (!committee || !text) return;
      try {
        const { error } = await window.sb.from('dynamic_questions').insert([{ committee_key: committee, question_text: text }]);
        if (error) throw error;
        showToast('تمت إضافة السؤال بنجاح!', 'success');
        q('#addQuestionForm').reset();
        await renderDynamicQuestionsManagement(ctx);
      } catch (err) { showToast('خطأ: ' + err.message, 'error'); }
    });


// حط دول بره أي دالة (في مستوى الملف نفسه)
window.deleteGalleryItem = async (id) => {
  await window.sb.from('gallery_images').delete().eq('id', id);
  await renderGalleryManagement();
};

window.addNewImagesToSection = async (sectionName) => {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*'; input.multiple = true;
  input.onchange = async (e) => {
    const urls = await uploadImages(e.target.files, 'gallery');
    await window.sb.from('gallery_images').insert(urls.map(url => ({ section_name: sectionName, image_url: url })));
    await renderGalleryManagement();
  };
  input.click();
};


    // فورم الإعدادات
    q('#settingsForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = [
        { setting_key: 'recruitment_status', setting_value: q('#recruitmentStatus').value },
        { setting_key: 'recruitment_link', setting_value: q('#recruitmentLink').value }
      ];
      await window.sb.from('site_settings').upsert(payload, { onConflict: 'setting_key' });
      showToast('تم حفظ الإعدادات');
    });
  }

  // تفعيل نظام الأكورديون في النهاية
  setTimeout(() => initAccordions(), 200); 
}

window.viewAnswers = function(appId) {
  // 1. بنجيب بيانات الطلب اللي ضغطت عليه
  const app = window._currentApps.find(a => a.id === appId);
  if (!app) return;

  // 2. بنحول الـ JSON بتاع الأسئلة لنص HTML
  let answersHtml = '<p>لا توجد ردود مسجلة لهذا الطلب.</p>';
  
  if (app.dynamic_answers && typeof app.dynamic_answers === 'object') {
    answersHtml = Object.entries(app.dynamic_answers)
      .map(([question, answer]) => `
        <div style="margin-bottom: 15px;">
           <strong style="color: var(--accent); display: block; margin-bottom: 5px;">${escapeHtml(question)}</strong>
           <div style="background: #111; padding: 10px; border-radius: 6px; color: #ddd; border: 1px solid #333;">
             ${escapeHtml(answer || 'بدون إجابة')}
           </div>
        </div>
      `).join('<hr style="border:0; border-top:1px solid #333; margin: 15px 0;">');
  }

  // 3. بنعمل المودال (النافذة) ونضيفها للـ HTML
  let modal = q('#viewAnswersModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'viewAnswersModal';
    modal.className = 'modal-overlay'; // ده الكلاس اللي بيخليها تظهر وتغطي الشاشة
    document.body.appendChild(modal);
  }

  // 4. بنحط المحتوى جوه المودال ونفتحه
  modal.innerHTML = `
    <div class="modal-card" style="max-width: 500px; width: 90%; background: #060a11; border: 1px solid #333;">
      <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h3 style="margin: 0; color: white;">ردود ${escapeHtml(app.applicant_name)}</h3>
        <button onclick="q('#viewAnswersModal').classList.remove('show')" style="background: none; border: none; color: white; cursor: pointer; font-size: 1.5rem;">×</button>
      </div>
      <div class="modal-body" style="max-height: 400px; overflow-y: auto;">
        ${answersHtml}
      </div>
    </div>
  `;
  
  // لازم نضيف كلاس show عشان تظهر (تأكد إن الـ CSS بتاعك بيتعامل مع كلاس show)
  modal.classList.add('show');
};

window.deleteApplication = async function(appId) {
  if (!confirm('متأكد من حذف الطلب؟')) return;
  try {
    await window.sb.from('applications').delete().eq('id', appId);
    showToast('تم الحذف', 'success');
    // إعادة تحديث الجدول (تأكد إن ctx معاك أو استدعي الدالة بدون بارامترات لو مسموح)
    const ctx = await getContext();
    await renderApplicationsManagement(ctx);
  } catch (err) {
    showToast('خطأ: ' + err.message, 'error');
  }
};
