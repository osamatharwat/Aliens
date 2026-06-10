/**
 * ============================================================================
 * ALIENS SPACE - ADMIN ENGINE (HIGH PERFORMANCE BUILD)
 * ============================================================================
 */

let _adminFormsInitialized = false;

// ==========================================
// 1. التهيئة الأساسية (Setup & Auth)
// ==========================================
async function setupAdmin(ctx) {
  const allowedRoles = ['head', 'OG', 'ir', 'hr'];
  if (!allowedRoles.includes(ctx.role)) {
    document.body.innerHTML = '<div class="empty-state error" style="margin: 50px auto; max-width: 500px;"><h1>غير مصرح لك بدخول هذه الصفحة</h1></div>';
    return;
  }
  
  window._currentCtx = ctx; 
  setVisible(q('#adminLoader'), false);
  setVisible(q('#adminContent'), true);
  
  // تفعيل الفورمات مرة واحدة فقط لمنع الـ Memory Leaks
  if (!_adminFormsInitialized) {
    attachAdminForms(ctx);
    _adminFormsInitialized = true;
  }

  // التحكم في ظهور الكروت حسب الرتبة
  const isSuperAdmin = ctx.role === 'OG' || ctx.role === 'head';
  q('#card-performance').style.display = 'block';
  q('#card-ir-dashboard').style.display = 'block';

  if (ctx.role === 'ir' || ctx.role === 'hr') {
    qa('.admin-card').forEach(card => {
      if (card.id !== 'card-ir-dashboard' && card.id !== 'card-performance') {
        card.style.display = 'none';
      }
    });
    // تحميل داتا الـ IR في نفس اللحظة (Parallel Fetching)
    await Promise.all([
      renderIRDashboard(ctx),
      renderPerformanceEvaluations(ctx)
    ]);
  } else {
    // تحميل داتا الـ Super Admin
    await Promise.all([
      renderProfilesManagement(ctx),
      renderDynamicQuestionsManagement(ctx),
      renderGalleryManagement(),
      renderGeneralContentManagement(),
      renderApplicationsManagement(ctx),
      renderIRDashboard(ctx),
      renderPerformanceEvaluations(ctx)
    ]);
    
    // إعدادات اللجان لفورم الأسئلة
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
  }

  // تفعيل نظام الأكورديون
  initAccordions(); 
}

// ==========================================
// 2. تفعيل أحداث الفورمات (Run-Once)
// ==========================================
function attachAdminForms(ctx) {
  // دالة مساعدة لتسهيل إرسال الفورمات
  const handleForm = (formId, btnId, callback) => {
    const form = q(formId);
    if (!form) return;
    // مسح أي Listeners قديمة لمنع التكرار (Clone Trick)
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    newForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = q(btnId);
      const originalText = btn.innerHTML;
      setBusy(btn, true, 'جاري الحفظ...');
      try {
        await callback(newForm);
        newForm.reset();
      } catch (err) {
        showToast('خطأ: ' + err.message, 'error');
      } finally {
        btn.innerHTML = originalText;
        setBusy(btn, false);
      }
    });
  };

  // إعدادات المركبة
  handleForm('#settingsForm', '#settingsForm button[type="submit"]', async (form) => {
    const payload = [
      { setting_key: 'recruitment_status', setting_value: q('#recruitmentStatus').value },
      { setting_key: 'recruitment_link', setting_value: q('#recruitmentLink').value },
      { setting_key: 'pr_head_phone', setting_value: q('#prHeadPhone').value.trim() },
      { setting_key: 'pr_sub_phone', setting_value: q('#prSubPhone').value.trim() }
    ];
    const { error } = await window.sb.from('site_settings').upsert(payload, { onConflict: 'setting_key' });
    if (error) throw error;
    showToast('تم حفظ إعدادات المركبة بنجاح 💾', 'success');
  });

  // إضافة مشروع
  handleForm('#addProjectForm', '#projSubmitBtn', async (form) => {
    const file = q('#projImgFile').files[0];
    let imgUrl = null;
    if (file) imgUrl = await window.uploadImage(file, 'projects');
    const { error } = await window.sb.from('member_projects').insert({
      user_id: ctx.session.user.id,
      project_title: q('#projTitle').value.trim(),
      description: q('#projDesc').value.trim(),
      contact_phone: q('#projPhone').value.trim(),
      social_link: q('#projSocial').value.trim(),
      project_link: q('#projLink').value.trim(),
      image_url: imgUrl
    });
    if (error) throw error;
    showToast('تمت إضافة المشروع بنجاح 💡', 'success');
    await renderGeneralContentManagement();
  });

  // نشر فعالية
  handleForm('#addEventForm', '#eventSubmitBtn', async (form) => {
    const file = q('#eventImgFile').files[0];
    let imgUrl = null;
    if (file) imgUrl = await window.uploadImage(file, 'events');
    const { error } = await window.sb.from('events').insert({
      title: q('#eventTitle').value.trim(),
      description: q('#eventDesc').value.trim(),
      action_link: q('#eventLink').value.trim(),
      image_url: imgUrl
    });
    if (error) throw error;
    showToast('تم نشر الفعالية بنجاح 🚀', 'success');
    await renderGeneralContentManagement();
  });

  // فرصة تدريب
  handleForm('#addInternshipForm', '#intSubmitBtn', async (form) => {
    const file = q('#intImgFile').files[0];
    let imgUrl = null;
    if (file) imgUrl = await window.uploadImage(file, 'internships');
    const { error } = await window.sb.from('internships').insert({
      company_name: q('#intCompany').value.trim(),
      title: q('#intTitle').value.trim(),
      description: q('#intDesc').value.trim(),
      apply_link: q('#intLink').value.trim(),
      image_url: imgUrl
    });
    if (error) throw error;
    showToast('تمت إضافة فرصة التدريب 🌟', 'success');
    await renderGeneralContentManagement();
  });

  // مصدر ثقافي
  handleForm('#addCulturalForm', '#cultSubmitBtn', async (form) => {
    const { error } = await window.sb.from('cultural_resources').insert({
      section_name: q('#cultSection').value.trim(),
      title: q('#cultTitle').value.trim(),
      resource_url: q('#cultLink').value.trim(),
      is_premium_only: q('#cultPremium').value === 'true'
    });
    if (error) throw error;
    showToast('تمت إضافة المصدر الثقافي 📚', 'success');
    await renderGeneralContentManagement();
  });

  // سؤال لجنة
  handleForm('#addQuestionForm', '#questionSubmitBtn', async (form) => {
    const committee = q('#questionCommittee').value;
    const text = q('#questionText').value.trim();
    if (!committee || !text) return;
    const { error } = await window.sb.from('dynamic_questions').insert([{ committee_key: committee, question_text: text }]);
    if (error) throw error;
    showToast('تمت إضافة السؤال بنجاح!', 'success');
    await renderDynamicQuestionsManagement(ctx);
  });

  // المعرض
  handleForm('#addGalleryImageForm', '#gallerySubmitBtn', async (form) => {
    const section = q('#gallerySectionName').value.trim();
    const files = q('#galleryImgFile').files;
    if (!section || files.length === 0) throw new Error('بيانات ناقصة');
    const urls = await window.uploadImages(files, 'gallery');
    await window.sb.from('gallery_images').insert(urls.map(url => ({ section_name: section, image_url: url })));
    showToast('تم الرفع للمعرض!', 'success');
    await renderGalleryManagement();
  });
}

// ==========================================
// 3. ذكاء الأكورديون (Accordion UI)
// ==========================================
function initAccordions() {
  document.querySelectorAll('.admin-card').forEach(card => {
    if(card.dataset.accordionInit === "true") return; // منع التكرار
    card.dataset.accordionInit = "true";

    card.style.gridColumn = '1 / -1'; 
    card.style.marginBottom = '5px'; 

    const header = card.querySelector('h3');
    if (!header) return;

    const titleHTML = header.innerHTML;
    header.innerHTML = ''; 
    
    const titleSpan = document.createElement('span');
    titleSpan.innerHTML = titleHTML;
    titleSpan.style.display = 'flex';
    titleSpan.style.alignItems = 'center';
    titleSpan.style.gap = '12px';

    const icon = document.createElement('i');
    icon.className = 'fa-solid fa-chevron-down toggle-icon';
    icon.style.transition = 'transform 0.3s ease';
    icon.style.fontSize = '1.1rem';
    icon.style.color = 'var(--muted)';

    header.appendChild(titleSpan);
    header.appendChild(icon);

    header.style.cursor = 'pointer';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.userSelect = 'none';
    header.style.padding = '5px 0';
    
    const contentElements = Array.from(card.children).filter(child => child !== header);
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'card-content-wrapper';
    contentWrapper.style.display = 'none'; 
    contentWrapper.style.paddingTop = '20px';
    contentWrapper.style.borderTop = '1px solid rgba(255,255,255,0.05)';
    contentWrapper.style.marginTop = '15px';
    
    contentElements.forEach(el => contentWrapper.appendChild(el));
    card.appendChild(contentWrapper);

    header.addEventListener('click', () => {
      const isClosed = contentWrapper.style.display === 'none';
      contentWrapper.style.display = isClosed ? 'block' : 'none';
      icon.style.transform = isClosed ? 'rotate(180deg)' : 'rotate(0deg)';
      header.style.color = isClosed ? 'var(--accent)' : ''; 
      icon.style.color = isClosed ? 'var(--accent)' : 'var(--muted)';
    });
  });
}

// ==========================================
// 4. نظام الريندر للأقسام (Profiles, Apps, IR, etc.)
// ==========================================

async function renderGeneralContentManagement() {
  const container = q('#generalContentManagementList');
  if (!container || !window.sb) return;

  const fetchAndRender = async (tableName, title, displayField) => {
    const { data } = await window.sb.from(tableName).select('*').order('created_at', { ascending: false });
    if(!data || data.length === 0) return '';
    return `
      <div style="margin-bottom: 25px;">
        <h4 style="color:var(--accent); margin: 0 0 10px 0;">${title} (${data.length})</h4>
        ${data.map(item => `
          <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding:10px; border:1px solid #222; margin-bottom:5px; border-radius:6px;">
            <span style="color:white; font-size:0.95rem; line-height:1.5;">${escapeHtml(item[displayField] || 'بدون نص').substring(0, 70)}...</span>
            <button onclick="window.deleteRow('${tableName}', '${item.id}')" style="background:#dc2626; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:0.8rem; flex-shrink:0;">حذف</button>
          </div>
        `).join('')}
      </div>
    `;
  };

  container.innerHTML = '<div style="color:var(--muted);"><i class="fa-solid fa-spinner fa-spin"></i> جاري تحميل بيانات الموقع...</div>';
  
  const htmlChunks = await Promise.all([
    fetchAndRender('events', 'الفعاليات', 'title'),
    fetchAndRender('memories', 'الذكريات المنشورة', 'memory_text'),
    fetchAndRender('memory_comments', 'تعليقات الذكريات', 'comment_text'),
    fetchAndRender('member_projects', 'مشاريع الأعضاء', 'project_title'),
    fetchAndRender('internships', 'فرص التدريب', 'title'),
    fetchAndRender('cultural_resources', 'المجتمع الثقافي', 'title')
  ]);

  container.innerHTML = htmlChunks.join('') || '<div style="color:var(--muted);">لا يوجد محتوى مضاف حتى الآن.</div>';
}

async function renderProfilesManagement(ctx = window._currentCtx) {
  const container = q('#profilesManagementList');
  if (!container || !window.sb) return;

  const canAssignIR = ctx.role === 'OG' || (ctx.role === 'head' && (ctx.profile?.committee || '').toLowerCase() === 'ir');
  const { data: profiles, error: pError } = await window.sb.from('profiles').select('*').order('full_name', { ascending: true });
  if (pError) return container.innerHTML = `<div style="color:#fca5a5; padding:10px;">خطأ: ${pError.message}</div>`;
  
  const irMembers = profiles.filter(p => p.role === 'ir' || p.role === 'hr' || (p.committee && p.committee.toLowerCase() === 'ir'));

  container.innerHTML = `
    <div style="display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap; background:rgba(0,0,0,0.3); padding:15px; border-radius:8px; border:1px solid rgba(255,255,255,0.05);">
      <input type="text" id="searchMember" placeholder="ابحث بالاسم أو اليوزرنيم..." style="flex:1; min-width:150px; padding:10px; background:#111; color:white; border:1px solid #333; border-radius:6px;">
      <select id="filterCommittee" style="padding:10px; background:#111; color:white; border:1px solid #333; border-radius:6px;">
        <option value="all">كل اللجان</option><option value="pr">PR</option><option value="ir">IR</option>
        <option value="marketing">Marketing</option><option value="media">Media</option>
        <option value="magic_hand">Magic Hand</option><option value="event_planning">Event Planning</option>
        <option value="secretary">Secretary</option><option value="charity">Charity</option>
      </select>
    </div>
    <div id="profilesRenderArea"></div>
  `;

  const renderArea = q('#profilesRenderArea');

  const drawProfiles = () => {
    const term = q('#searchMember').value.toLowerCase();
    const comm = q('#filterCommittee').value;

    const filtered = profiles.filter(p => {
      const matchName = (p.full_name || '').toLowerCase().includes(term) || (p.username || '').toLowerCase().includes(term);
      const matchComm = comm === 'all' || (p.committee || '').toLowerCase() === comm;
      return matchName && matchComm;
    });

    const teamMembers = filtered.filter(p => p.committee || (p.role && p.role !== 'member' && p.role !== 'guest'));
    const regularUsers = filtered.filter(p => !p.committee && (!p.role || p.role === 'member' || p.role === 'guest'));

    const buildRows = (users, title) => {
      if(users.length === 0) return `<div style="padding:10px; color:var(--muted);">لا يوجد ${title} متطابق مع البحث.</div>`;
      return `<h4 style="color:var(--accent); margin: 20px 0 10px 0; border-bottom:1px solid #333; padding-bottom:10px;">${title} (${users.length})</h4>
              <div style="display:flex; flex-direction:column; gap:10px;">
      ${users.map(p => `
          <div class="table-row" style="display:flex; flex-direction:column; gap:12px; border-bottom:1px solid #222; padding:15px; background:rgba(255,255,255,0.02); border-radius:8px; margin-bottom:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
              <div>
                <strong style="color:white; font-size:1.1rem;">${escapeHtml(p.full_name)}</strong>
                ${p.username ? `<span style="color:var(--muted); font-size:0.85rem; margin-right:8px;">(@${escapeHtml(p.username)})</span>` : ''}
              </div>
              <button onclick="window.deleteRow('profiles', '${p.id}')" style="background:#dc2626; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;"><i class="fa-solid fa-trash"></i> حذف العضو</button>
            </div>
            
            <div style="display:flex; gap:15px; flex-wrap:wrap; background:rgba(0,0,0,0.4); padding:12px; border-radius:8px; border:1px solid rgba(255,255,255,0.05);">
              <div style="flex:1; min-width:140px;">
                <label style="font-size:0.8rem; color:var(--muted); display:block; margin-bottom:5px;">الصلاحية:</label>
                <select class="profile-update-select" data-field="role" data-id="${p.id}" style="width:100%; padding:8px; background:#111; color:white; border:1px solid #333; border-radius:4px;">
                  <option value="member" ${p.role === 'member' ? 'selected' : ''}>Member</option>
                  <option value="ir" ${p.role === 'ir' ? 'selected' : ''}>IR / HR</option>
                  <option value="head" ${p.role === 'head' ? 'selected' : ''}>Head</option>
                  <option value="OG" ${p.role === 'OG' ? 'selected' : ''}>OG</option>
                </select>
              </div>
              <div style="flex:1; min-width:140px;">
                <label style="font-size:0.8rem; color:var(--muted); display:block; margin-bottom:5px;">اللجنة:</label>
                <select class="profile-update-select" data-field="committee" data-id="${p.id}" style="width:100%; padding:8px; background:#111; color:white; border:1px solid #333; border-radius:4px;">
                  <option value="" ${!p.committee ? 'selected' : ''}>-- بدون لجنة --</option>
                  <option value="pr" ${p.committee?.toLowerCase() === 'pr' ? 'selected' : ''}>PR</option>
                  <option value="ir" ${p.committee?.toLowerCase() === 'ir' ? 'selected' : ''}>IR</option>
                  <option value="marketing" ${p.committee?.toLowerCase() === 'marketing' ? 'selected' : ''}>Marketing</option>
                  <option value="media" ${p.committee?.toLowerCase() === 'media' ? 'selected' : ''}>Media</option>
                  <option value="magic_hand" ${p.committee?.toLowerCase() === 'magic_hand' ? 'selected' : ''}>Magic Hand</option>
                  <option value="event_planning" ${p.committee?.toLowerCase() === 'event_planning' ? 'selected' : ''}>Event Planning</option>
                  <option value="secretary" ${p.committee?.toLowerCase() === 'secretary' ? 'selected' : ''}>Secretary</option>
                  <option value="charity" ${p.committee?.toLowerCase() === 'charity' ? 'selected' : ''}>Charity</option>
                </select>
              </div>
              <div style="flex:1; min-width:140px;" title="${!canAssignIR ? 'صلاحية هيد الـ IR فقط' : ''}">
                <label style="font-size:0.8rem; color:var(--muted); display:block; margin-bottom:5px;">الـ IR المسؤول:</label>
                <select class="profile-update-select" data-field="assigned_ir" data-id="${p.id}" ${!canAssignIR ? 'disabled' : ''} style="width:100%; padding:8px; background:#111; color:white; border:1px solid #333; border-radius:4px; ${!canAssignIR ? 'opacity:0.5; cursor:not-allowed;' : ''}">
                  <option value="">-- غير محدد --</option>
                  ${irMembers.map(ir => `<option value="${ir.id}" ${p.assigned_ir === ir.id ? 'selected' : ''}>${escapeHtml(ir.full_name)}</option>`).join('')}
                </select>
              </div>
            </div>
          </div>
      `).join('')}</div>`;
    };

    renderArea.innerHTML = buildRows(teamMembers, 'أعضاء التيم') + buildRows(regularUsers, 'المستخدمين العاديين');

    // Event Delegation for selects
    qa('.profile-update-select', renderArea).forEach(sel => {
      sel.addEventListener('change', async (e) => {
        const field = e.target.dataset.field, id = e.target.dataset.id;
        let val = e.target.value; if (val === "") val = null;
        const { error } = await window.sb.from('profiles').update({ [field]: val, updated_at: new Date().toISOString() }).eq('id', id);
        if (error) window.showToast(`خطأ: ${error.message}`, 'error');
        else window.showToast('تم التحديث بنجاح!', 'success');
      });
    });
  };

  q('#searchMember').addEventListener('input', drawProfiles);
  q('#filterCommittee').addEventListener('change', drawProfiles);
  drawProfiles();
}

async function renderApplicationsManagement(ctx = window._currentCtx) {
  const list = q('#applicationsManagementList');
  if (!list || !window.sb) return;

  const isSuperAdmin = ctx.role === 'OG' || (ctx.profile?.committee || '').toLowerCase() === 'ir' || ctx.role === 'ir' || ctx.role === 'hr';
  let query = window.sb.from('applications').select('*').order('created_at', { ascending: false });

  if (!isSuperAdmin && ctx.role === 'head' && ctx.profile?.committee) {
    query = query.eq('committee_key', ctx.profile.committee.toLowerCase());
  }

  const [{ data: apps, error }, { data: irMembers }] = await Promise.all([
    query,
    window.sb.from('profiles').select('id, full_name').in('role', ['ir', 'OG'])
  ]);

  if (error) return list.innerHTML = `<div style="color:#fca5a5; padding:10px;">خطأ: ${error.message}</div>`;
  if (!apps || apps.length === 0) return list.innerHTML = '<div style="padding:10px; color:var(--muted);">لا توجد طلبات تقديم حالياً.</div>';

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
            <span style="color:var(--accent); font-weight:bold; margin-right:10px;">(${escapeHtml(app.committee_key || '')})</span>
          </div>
          <div style="display:flex; gap:10px;">
            <button onclick="window.viewAnswers(${app.id})" style="background:var(--accent); color:#000; padding:6px 12px; border:none; border-radius:6px; cursor:pointer; font-weight:bold;"><i class="fa-solid fa-eye"></i> الردود</button>
            ${phone ? `<a href="https://wa.me/${phone}" target="_blank" style="background:#25D366; color:#000; padding:6px 12px; border-radius:6px;"><i class="fa-brands fa-whatsapp"></i></a>` : ''}
            <button onclick="window.deleteRow('applications', ${app.id})" style="background:#dc2626; color:white; padding:6px 12px; border:none; border-radius:6px; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
        <div style="display:flex; gap:15px; flex-wrap:wrap; background:rgba(0,0,0,0.4); padding:12px; border-radius:8px; border:1px solid rgba(255,255,255,0.05);">
          <div style="flex:1; min-width:140px;">
            <label style="font-size:0.8rem; color:var(--muted); display:block; margin-bottom:5px;">مسؤول الـ IR:</label>
            <select class="app-update-select" data-field="ir_assignee_id" data-id="${app.id}" ${!isSuperAdmin ? 'disabled' : ''} style="width:100%; padding:8px; background:#111; color:white; border:1px solid #333; border-radius:4px;">
              <option value="">-- غير محدد --</option>
              ${(irMembers || []).map(m => `<option value="${m.id}" ${app.ir_assignee_id === m.id ? 'selected' : ''}>${escapeHtml(m.full_name)}</option>`).join('')}
            </select>
          </div>
          <div style="flex:1; min-width:140px;">
            <label style="font-size:0.8rem; color:var(--muted); display:block; margin-bottom:5px;">قرار الـ IR:</label>
            <select class="app-update-select" data-field="ir_status" data-id="${app.id}" ${!isSuperAdmin ? 'disabled' : ''} style="width:100%; padding:8px; background:#111; color:white; border:1px solid #333; border-radius:4px;">
              <option value="pending" ${app.ir_status === 'pending' ? 'selected' : ''}>⏳ قيد الانتظار</option><option value="accepted" ${app.ir_status === 'accepted' ? 'selected' : ''}>✅ مقبول</option><option value="rejected" ${app.ir_status === 'rejected' ? 'selected' : ''}>❌ مرفوض</option>
            </select>
          </div>
        </div>
      </div>
    `;
  }).join('');

  qa('.app-update-select', list).forEach(sel => {
    sel.addEventListener('change', async (e) => {
      let val = e.target.value; if (val === "") val = null;
      const { error } = await window.sb.from('applications').update({ [e.target.dataset.field]: val, updated_at: new Date().toISOString() }).eq('id', e.target.dataset.id);
      if (error) window.showToast(`خطأ: ${error.message}`, 'error');
      else window.showToast('تم التحديث بنجاح', 'success');
    });
  });
}

async function renderIRDashboard(ctx = window._currentCtx) {
  const list = q('#irInterviewsList');
  if (!list || !window.sb) return;

  const userId = ctx.profile?.id || ctx.session?.user?.id;
  if (!userId) return list.innerHTML = '<div style="padding:10px; color:#fca5a5;">خطأ: لم يتم التعرف على معرف الحساب.</div>';

  const { data: myApps, error } = await window.sb.from('applications').select('*').eq('ir_assignee_id', userId).order('created_at', { ascending: false });
  if (error) return list.innerHTML = `<div style="color:#fca5a5; padding:10px;">خطأ: ${error.message}</div>`;
  if (!myApps || myApps.length === 0) return list.innerHTML = '<div style="padding:10px; color:var(--muted);">لا يوجد متقدمين موكلين إليك حالياً.</div>';

  if (!window._currentApps) window._currentApps = [];
  myApps.forEach(a => { if (!window._currentApps.find(ca => ca.id === a.id)) window._currentApps.push(a); });

  list.innerHTML = myApps.map(app => {
    return `
      <div class="table-row" style="display:flex; flex-direction:column; gap:12px; border-bottom:1px solid #222; padding:15px; background:rgba(255,255,255,0.02); border-radius:8px; margin-bottom:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div><strong style="color:white; font-size:1.1rem;">${escapeHtml(app.applicant_name)}</strong> <span style="color:var(--accent);">(${escapeHtml(app.committee_key)})</span></div>
          <button onclick="window.viewAnswers(${app.id})" style="background:var(--accent); color:#000; padding:6px 12px; border:none; border-radius:6px; cursor:pointer; font-weight:bold;"><i class="fa-solid fa-eye"></i> إجابات الفورم</button>
        </div>
        <div style="background:rgba(0,0,0,0.4); padding:15px; border-radius:8px; border:1px solid rgba(255,255,255,0.05); display:flex; flex-direction:column; gap:10px;">
          <textarea class="ir-note-input" data-id="${app.id}" rows="2" style="width:100%; padding:10px; background:#111; color:white; border:1px solid #333; border-radius:6px;" placeholder="ملاحظات المقابلة...">${escapeHtml(app.decision_note || '')}</textarea>
          <div style="display:flex; gap:10px; align-items:center;">
            <select class="ir-final-decision" data-id="${app.id}" style="flex:1; padding:8px; background:#111; color:white; border:1px solid #333; border-radius:4px;">
              <option value="pending" ${app.ir_status === 'pending' ? 'selected' : ''}>⏳ قيد الانتظار</option><option value="accepted" ${app.ir_status === 'accepted' ? 'selected' : ''}>✅ مقبول</option><option value="rejected" ${app.ir_status === 'rejected' ? 'selected' : ''}>❌ مرفوض</option>
            </select>
            <button class="save-evaluation-btn" data-id="${app.id}" style="background:var(--accent); color:#000; padding:8px 20px; border:none; border-radius:6px; cursor:pointer; font-weight:bold;">حفظ التقييم</button>
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
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
      const { error } = await window.sb.from('applications').update({ decision_note: noteStr, ir_status: statusStr, updated_at: new Date().toISOString() }).eq('id', id);
      btn.innerHTML = oldText;
      if (error) window.showToast('خطأ: ' + error.message, 'error'); else window.showToast('تم حفظ التقييم!', 'success');
    });
  });
}

async function renderPerformanceEvaluations(ctx = window._currentCtx) {
  const container = q('#performanceManagementList');
  if (!container || !window.sb) return;

  const userId = ctx.profile?.id || ctx.session?.user?.id;
  const isSuperAdmin = ctx.role === 'OG' || ctx.role === 'head';

  let query = window.sb.from('profiles').select('id, full_name, committee, assigned_ir').neq('role', 'OG');
  if (!isSuperAdmin) query = query.eq('assigned_ir', userId);

  const { data: members, error } = await query;
  if (error) return container.innerHTML = `<div style="color:#fca5a5;">خطأ: ${error.message}</div>`;
  if (!members || members.length === 0) return container.innerHTML = '<div style="color:var(--muted); padding:10px;">لا يوجد أعضاء موكلين إليك.</div>';

  container.innerHTML = `
    <div style="display:flex; gap:10px; margin-bottom:15px; flex-wrap:wrap; background:rgba(0,0,0,0.3); padding:15px; border-radius:8px;">
      <input type="text" id="searchEvalMember" placeholder="ابحث باسم العضو..." style="flex:1; padding:10px; background:#111; color:white; border:1px solid #333; border-radius:6px;">
      <input type="month" id="evalMonth" value="${new Date().toISOString().slice(0, 7)}" style="padding:10px; background:#111; color:white; border:1px solid #333; border-radius:6px;">
    </div>
    <div id="evaluationsRenderArea"></div>
  `;

  const drawEvaluations = () => {
    const term = q('#searchEvalMember').value.toLowerCase();
    const filtered = members.filter(m => (m.full_name || '').toLowerCase().includes(term));
    q('#evaluationsRenderArea').innerHTML = filtered.map(m => `
      <div class="table-row" style="display:flex; flex-direction:column; gap:10px; border-bottom:1px solid #222; padding:15px; background:rgba(255,255,255,0.02); border-radius:8px; margin-bottom:10px;">
        <strong style="color:white;">${escapeHtml(m.full_name)} <span style="color:var(--accent);">(${escapeHtml(m.committee || 'بدون')})</span></strong>
        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
          <input type="number" class="eval-score" data-id="${m.id}" min="0" max="100" placeholder="التقييم 0-100" style="width:100px; padding:8px; background:#111; color:white; border:1px solid #333; border-radius:4px;">
          <input type="text" class="eval-notes" data-id="${m.id}" placeholder="ملاحظات..." style="flex:1; min-width:150px; padding:8px; background:#111; color:white; border:1px solid #333; border-radius:4px;">
          <button class="save-eval-btn" data-id="${m.id}" style="background:var(--accent); color:#000; padding:8px 15px; border:none; border-radius:6px; cursor:pointer; font-weight:bold;">حفظ</button>
        </div>
      </div>
    `).join('');

    qa('.save-eval-btn', container).forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id, score = q(`.eval-score[data-id="${id}"]`, container).value, notes = q(`.eval-notes[data-id="${id}"]`, container).value, month = q('#evalMonth', container).value;
        if (!score || !month) return window.showToast('أدخل التقييم والشهر', 'warning');
        btn.innerHTML = '...';
        const { error } = await window.sb.from('performance_evaluations').upsert([{ member_id: id, evaluator_id: userId, evaluation_month: month, score: parseFloat(score), notes: notes }], { onConflict: 'member_id, evaluation_month' });
        btn.innerHTML = 'حفظ';
        if (error) window.showToast('خطأ: ' + error.message, 'error'); else window.showToast('تم الحفظ', 'success');
      });
    });
  };

  q('#searchEvalMember').addEventListener('input', drawEvaluations);
  drawEvaluations();
}

async function renderGalleryManagement() {
  const container = q('#galleryManagementList');
  if (!container) return;
  const { data, error } = await window.sb.from('gallery_images').select('*').order('created_at', { ascending: false });
  if (error) return;
  const sections = (data || []).reduce((acc, item) => { acc[item.section_name] = acc[item.section_name] || []; acc[item.section_name].push(item); return acc; }, {});
  container.innerHTML = Object.keys(sections).map(section => `
    <div style="background:rgba(255,255,255,0.03); padding:15px; margin-bottom:10px; border:1px solid #333;">
      <h4>${escapeHtml(section)}</h4>
      <div style="display:flex; gap:10px; flex-wrap:wrap; margin: 10px 0;">
        ${sections[section].map(img => `
          <div style="position:relative; width:80px; height:80px;">
            <img src="${img.image_url}" style="width:100%; height:100%; object-fit:cover;">
            <button onclick="window.deleteRow('gallery_images', '${img.id}')" style="position:absolute; top:0; right:0; background:red; border:none; color:white; cursor:pointer;">X</button>
          </div>
        `).join('')}
      </div>
      <button onclick="window.addNewImagesToSection('${escapeHtml(section)}')" class="cta-btn secondary-btn" style="padding: 5px 10px; font-size: 0.8rem;">إضافة صور للقسم</button>
    </div>
  `).join('');
}

async function renderDynamicQuestionsManagement(ctx = window._currentCtx) {
  const list = q('#questionsManagementList');
  if (!list || !window.sb) return;
  const { data: questions } = await window.sb.from('dynamic_questions').select('*').order('committee_key', { ascending: true });
  if (!questions) return;
  list.innerHTML = questions.map(qObj => `
    <div class="table-row" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:5px; background:rgba(255,255,255,0.02); padding:10px; border:1px solid #333;">
      <div><strong style="color:var(--accent);">${escapeHtml(qObj.committee_key)}</strong> | ${escapeHtml(qObj.question_text)}</div>
      <button onclick="window.deleteRow('dynamic_questions', '${qObj.id}')" style="background:#dc2626; color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:4px;">حذف</button>
    </div>
  `).join('');
}

// ==========================================
// 5. الأوامر العامة (Global Window Actions)
// ==========================================
window.deleteRow = async (table, id) => {
  if (confirm('هل أنت متأكد من الحذف؟')) {
    await window.sb.from(table).delete().eq('id', id);
    window.showToast('تم الحذف بنجاح', 'success');
    if(table === 'profiles') await renderProfilesManagement();
    else if(table === 'applications') await renderApplicationsManagement();
    else if(table === 'gallery_images') await renderGalleryManagement();
    else if(table === 'dynamic_questions') await renderDynamicQuestionsManagement();
    else await renderGeneralContentManagement();
  }
};

window.addNewImagesToSection = async (sectionName) => {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*'; input.multiple = true;
  input.onchange = async (e) => {
    window.showToast('جاري رفع الصور...', 'info');
    const urls = await window.uploadImages(e.target.files, 'gallery');
    await window.sb.from('gallery_images').insert(urls.map(url => ({ section_name: sectionName, image_url: url })));
    window.showToast('تم رفع الصور بنجاح', 'success');
    await renderGalleryManagement();
  };
  input.click();
};

window.viewAnswers = function(appId) {
  const app = window._currentApps?.find(a => a.id === appId);
  if (!app) return;
  let answersHtml = '<p>لا توجد ردود.</p>';
  if (app.dynamic_answers && typeof app.dynamic_answers === 'object') {
    answersHtml = Object.entries(app.dynamic_answers).map(([q, a]) => `
        <div style="margin-bottom: 15px;">
           <strong style="color: var(--accent); display: block; margin-bottom: 5px;">${escapeHtml(q)}</strong>
           <div style="background: #111; padding: 10px; border-radius: 6px; color: #ddd; border: 1px solid #333;">${escapeHtml(a || 'بدون إجابة')}</div>
        </div>
      `).join('<hr style="border-top:1px solid #333; margin: 15px 0;">');
  }
  let modal = q('#viewAnswersModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'viewAnswersModal';
    modal.className = 'modal-overlay'; 
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="modal-card" style="max-width: 500px; width: 90%; background: #060a11; border: 1px solid #333;">
      <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h3 style="margin: 0; color: white;">ردود ${escapeHtml(app.applicant_name)}</h3>
        <button onclick="document.getElementById('viewAnswersModal').classList.remove('show')" style="background: none; border: none; color: white; cursor: pointer; font-size: 1.5rem;">×</button>
      </div>
      <div class="modal-body" style="max-height: 400px; overflow-y: auto;">${answersHtml}</div>
    </div>
  `;
  modal.classList.add('show');
};