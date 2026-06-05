(() => {
  // ==========================================
  // 1. الإعدادات الأساسية والتهيئة
  // ==========================================
  const SUPABASE_URL = window.SUPABASE_URL || "https://hvvfvsugamyexvvqhzkw.supabase.co";
  const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || "sb_publishable_yi8j0Z12YJB9w4eW4IU0Cg_S_tjGs-Q";
  const RECRUITMENT_FALLBACK_LINK = "https://forms.gle/YourActualStudentFormLink";
  const GUEST_ROLE_KEY = "aliens_role";
  const CACHE = { session: null, profile: null, role: null, settings: null };

  const sb = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  }) : null;

  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const getActivePath = () => window.location.pathname.split("/").pop() || "index.html";
  
  function setMessage(el, message, type) {
    if (!el) return;
    el.textContent = message || "";
    el.className = `auth-msg ${type || ""}`;
  }

  // ==========================================
  // 2. دالة رفع الملفات السحابية (Storage)
  // ==========================================
  async function uploadImage(file, folderName) {
    if (!file || !sb) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${folderName}/${fileName}`;
    
    const { error } = await sb.storage.from('aliens_images').upload(filePath, file);
    if (error) throw error;
    
    const { data } = sb.storage.from('aliens_images').getPublicUrl(filePath);
    return data.publicUrl;
  }

  // ==========================================
  // 3. إدارة الجلسات والصلاحيات
  // ==========================================
  async function getCurrentContext() {
    if (CACHE.session || CACHE.profile) return { session: CACHE.session, role: CACHE.role, profile: CACHE.profile };
    const { data } = await sb.auth.getSession();
    CACHE.session = data?.session || null;
    if (!CACHE.session) return { session: null, role: null, profile: null };
    const { data: profile } = await sb.from("profiles").select("*").eq("id", CACHE.session.user.id).maybeSingle();
    CACHE.profile = profile; CACHE.role = profile?.role;
    return { session: CACHE.session, role: CACHE.role, profile: CACHE.profile };
  }

  const isHead = (role) => String(role || "").toLowerCase() === "head";
  const isMember = (role) => isHead(role) || String(role || "").toLowerCase() === "member";

  function renderNav(context) {
    const linksRoot = q("#siteNavLinks"), actionsRoot = q("#siteNavActions");
    if (!linksRoot || !actionsRoot) return;
    const path = getActivePath();
    
    linksRoot.innerHTML = "";
    [{h:"index.html", l:"الرئيسية"}, {h:"committees.html", l:"اللجان"}, {h:"gallery.html", l:"المعرض"}, {h:"events.html", l:"الفعاليات"}].forEach(i => {
      linksRoot.innerHTML += `<a href="${i.h}" class="nav-link ${path===i.h?'active':''}">${i.l}</a>`;
    });
    
    if (isMember(context.role)) linksRoot.innerHTML += `<a href="memories.html" class="nav-link ${path==='memories.html'?'active':''}">الذكريات</a>`;
    if (isHead(context.role)) linksRoot.innerHTML += `<a href="admin.html" class="nav-link ${path==='admin.html'?'active':''}">Dashboard</a>`;
    
    if (context.session) {
      linksRoot.innerHTML += `<span class="user-chip">${context.profile?.full_name || "User"} · ${isHead(context.role)?'Head':'Member'}</span>`;
      actionsRoot.innerHTML = `<button class="nav-btn danger" onclick="handleLogout()">Logout</button>`;
    } else {
      actionsRoot.innerHTML = `<a href="auth.html" class="nav-btn ghost">Login</a>`;
    }
  }

  window.handleLogout = async () => {
    localStorage.removeItem(GUEST_ROLE_KEY);
    await sb.auth.signOut();
    window.location.href = "index.html";
  };

  window.selectRole = (role) => {
    if (role === "guest") { localStorage.setItem(GUEST_ROLE_KEY, "guest"); q("#roleGateway").style.display = "none"; }
    else { sessionStorage.setItem("aliens_entry_role", role); window.location.href = "auth.html"; }
  };

  // ==========================================
  // 4. نظام تسجيل الدخول وإنشاء الحساب (Auth)
  // ==========================================
  async function loginHandler(e) {
    e.preventDefault(); const msgEl = q("#loginMsg");
    const loginId = q("#loginId").value.trim(), password = q("#loginPassword").value;
    setMessage(msgEl, "جاري التحقق...", "");
    
    let email = loginId;
    if (!loginId.includes("@")) {
      const { data, error } = await sb.rpc("get_email_by_username", { p_username: loginId.toLowerCase() });
      if (error || !data) return setMessage(msgEl, "اسم المستخدم غير موجود.", "error");
      email = data;
    }
    
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return setMessage(msgEl, "بيانات الدخول غير صحيحة.", "error");
    
    setMessage(msgEl, "تم الدخول بنجاح 🛸", "success");
    const { data: profile } = await sb.from("profiles").select("role").eq("id", data.user.id).single();
    setTimeout(() => { window.location.href = isHead(profile?.role) ? "admin.html" : "index.html"; }, 800);
  }

  async function signupHandler(e) {
    e.preventDefault(); const msgEl = q("#signupMsg");
    const name = q("#signupName").value.trim(), username = q("#signupUsername").value.trim().toLowerCase(), email = q("#signupEmail").value.trim(), password = q("#signupPassword").value;
    
    setMessage(msgEl, "جاري إنشاء الحساب...", "");
    if (username.includes(" ")) return setMessage(msgEl, "اسم المستخدم يجب أن يكون بدون مسافات.", "error");
    
    const { error } = await sb.auth.signUp({ email, password, options: { data: { full_name: name, username } } });
    if (error) return setMessage(msgEl, `خطأ: ${error.message}`, "error");
    setMessage(msgEl, "تم التسجيل! راجع بريدك لتفعيل الحساب.", "success");
    q("#signupForm").reset();
  }

  window.switchTab = (tab) => {
    qa(".tab-btn").forEach(btn => btn.classList.remove("active"));
    qa(".auth-form").forEach(form => form.classList.remove("active-form"));
    q(`#${tab}TabBtn`)?.classList.add("active");
    q(`#${tab}Form`)?.classList.add("active-form");
  };

  // ==========================================
  // 5. الصفحة الرئيسية والإعدادات
  // ==========================================
  async function syncHomeSettings() {
    const { data } = await sb.from("site_settings").select("*");
    const map = new Map(); (data || []).forEach(row => map.set(row.setting_key, row.setting_value));
    
    const statusRaw = String(map.get("recruitment_status") || "").trim().toLowerCase();
    const isOpen = ["open", "1", "true", "yes", "on"].some(v => statusRaw === v || statusRaw.startsWith(v));
    const link = map.get("recruitment_link") || RECRUITMENT_FALLBACK_LINK;
    
    window.__recruitmentOpen = isOpen; window.__recruitmentLink = link;

    const joinBtn = q("#joinTeamBtn"), heroBtn = q("#heroActionBtn"), statusMsg = q("#recruitmentStatusMsg");
    if (joinBtn) { joinBtn.disabled = !isOpen; joinBtn.textContent = isOpen ? "Join Our Crew 🛸" : "Boarding Closed"; }
    if (heroBtn) { heroBtn.textContent = isOpen ? "Join The Crew" : "Application Closed"; heroBtn.className = `cta-btn ${isOpen ? 'primary-btn' : 'secondary-btn'}`; if (isOpen) heroBtn.href = link; else heroBtn.removeAttribute("href"); }
    if (statusMsg) { statusMsg.textContent = isOpen ? "🛸 باب التقديم مفتوح الآن." : "🔒 التقديم مغلق حاليًا."; statusMsg.style.color = isOpen ? "var(--accent)" : "#fca5a5"; }
  }

  window.openApplicationForm = () => { if (window.__recruitmentOpen) window.open(window.__recruitmentLink, "_blank"); };

  // ==========================================
  // 6. صفحة الذكريات (بدون مراجعة + مع صور)
  // ==========================================
  async function loadMemories() {
    const grid = q("#memoriesGrid"); if (!grid || !sb) return; grid.innerHTML = "";
    const { data } = await sb.from("memories").select("*").eq("is_approved", true).order("id", { ascending: false });
    if (!data?.length) return grid.innerHTML = '<div class="empty-state">لا توجد ذكريات بعد.</div>';
    
    data.forEach(mem => {
      const imgHtml = mem.image_url ? `<img src="${mem.image_url}" style="width:100%; border-radius:12px; margin-top:10px; border:1px solid var(--border); max-height:300px; object-fit:cover;">` : '';
      grid.innerHTML += `<article class="memory-card"><div class="memory-author">${mem.author_name}</div><div class="memory-content">${mem.memory_text}</div>${imgHtml}</article>`;
    });
  }

  async function submitMemory(e) {
    e.preventDefault(); const msgEl = q("#memoryMsg"), btn = q("#submitMemoryBtn"), fileInput = q("#memoryImgFile");
    const ctx = await getCurrentContext();
    if (!ctx.session) return window.location.href = "auth.html";
    
    btn.disabled = true; setMessage(msgEl, "جاري النشر...", "");
    try {
      let imageUrl = null;
      if (fileInput.files.length > 0) imageUrl = await uploadImage(fileInput.files[0], 'memories');
      await sb.from("memories").insert([{ author_name: ctx.profile.full_name, memory_text: q("#memoryText").value, image_url: imageUrl, user_id: ctx.session.user.id, is_approved: true }]);
      setMessage(msgEl, "تم النشر بنجاح ✅", "success"); q("#memoryForm").reset(); loadMemories();
    } catch (err) { setMessage(msgEl, "خطأ: " + err.message, "error"); }
    btn.disabled = false;
  }

  // ==========================================
  // 7. المعرض الديناميكي (سكاشن وإعجابات)
  // ==========================================
  async function loadDynamicGallery(ctx) {
    const container = q("#dynamicGalleryContainer"); if (!container || !sb) return; container.innerHTML = "";
    const { data: images } = await sb.from("gallery_images").select("*").order("created_at", { ascending: true });
    const { data: likesData } = await sb.from("gallery_likes").select("*");
    
    if (!images?.length) return container.innerHTML = '<div class="empty-state">المعرض فارغ حالياً.</div>';

    const sections = {}; images.forEach(img => { if (!sections[img.section_name]) sections[img.section_name] = []; sections[img.section_name].push(img); });
    const likesCount = {}; const userLikes = new Set();
    (likesData || []).forEach(l => { likesCount[l.image_name] = (likesCount[l.image_name] || 0) + 1; if (ctx.session && l.user_id === ctx.session.user.id) userLikes.add(l.image_name); });

    for (const [secName, imgs] of Object.entries(sections)) {
      let gridHtml = `<h3 class="gallery-subtitle"><i class="fa-solid fa-folder-open"></i> ${secName}</h3><div class="gallery-fluid-grid">`;
      imgs.forEach(img => {
        const isLiked = userLikes.has(img.id.toString()) ? 'liked' : '';
        const count = likesCount[img.id.toString()] || 0;
        gridHtml += `
          <div class="gallery-fluid-item">
            <img src="${img.image_url}" alt="Gallery">
            <div class="img-caption">
              <button class="like-btn ${isLiked}" data-imgid="${img.id}"><i class="fa-solid fa-heart"></i> <span class="like-count">${count}</span></button>
            </div>
          </div>`;
      });
      container.innerHTML += gridHtml + `</div>`;
    }

    qa(".like-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (!ctx.session) return alert("يجب تسجيل الدخول للإعجاب بالصور 🛸");
        const imgId = btn.dataset.imgid; const isLiked = btn.classList.contains("liked");
        btn.classList.toggle("liked");
        const countSpan = btn.querySelector(".like-count");
        countSpan.textContent = parseInt(countSpan.textContent) + (isLiked ? -1 : 1);
        if (isLiked) await sb.from("gallery_likes").delete().match({ image_name: imgId, user_id: ctx.session.user.id });
        else await sb.from("gallery_likes").insert([{ image_name: imgId, user_id: ctx.session.user.id }]);
      });
    });
  }

  // ==========================================
  // 8. سجل الفعاليات
  // ==========================================
  async function loadEventsToGrid() {
    const grid = q("#eventsGrid"); if (!grid || !sb) return; grid.innerHTML = "";
    const { data } = await sb.from("events").select("*").order("id", { ascending: false });
    if (!data?.length) return grid.innerHTML = '<div class="empty-state">لا توجد فعاليات منشورة حاليًا.</div>';
    
    data.forEach((evt) => {
      let actionHtml = evt.action_link ? `<a class="cta-btn primary-btn" href="${evt.action_link}" target="_blank">Join Now</a>` : '';
      grid.innerHTML += `
        <article class="event-card">
          <img class="event-cover" src="${evt.image_url}" alt="${evt.title}">
          <div class="event-card-body">
            <h3>${evt.title}</h3><p>${evt.description}</p>
            <div class="event-actions">${actionHtml}</div>
          </div>
        </article>`;
    });
  }

  // ==========================================
  // 9. لوحة تحكم الأدمن (Dashboard)
  // ==========================================
  async function setupAdmin() {
    q("#adminLoader").style.display = "none"; q("#adminContent").style.display = "block"; q("#adminContent").classList.remove("hidden");
    
    // الإعدادات
    const { data: settingsData } = await sb.from("site_settings").select("*");
    const sMap = new Map(); (settingsData || []).forEach(r => sMap.set(r.setting_key, r.setting_value));
    const statusRaw = String(sMap.get("recruitment_status") || "").trim().toLowerCase();
    q("#recruitmentStatus").value = ["open", "1", "true", "yes", "on"].some(v => statusRaw === v || statusRaw.startsWith(v)) ? "open" : "close";
    q("#recruitmentLink").value = sMap.get("recruitment_link") || "";
    q("#prHeadPhone").value = sMap.get("pr_head_phone") || "";
    q("#prSubPhone").value = sMap.get("pr_sub_phone") || "";

    q("#settingsForm")?.addEventListener("submit", async (e) => {
      e.preventDefault(); const msgEl = q("#settingsMsg"); setMessage(msgEl, "جاري الحفظ...", "");
      await sb.from("site_settings").upsert([
        { setting_key: "recruitment_status", setting_value: q("#recruitmentStatus").value },
        { setting_key: "recruitment_link", setting_value: q("#recruitmentLink").value },
        { setting_key: "pr_head_phone", setting_value: q("#prHeadPhone").value },
        { setting_key: "pr_sub_phone", setting_value: q("#prSubPhone").value }
      ], { onConflict: "setting_key" });
      setMessage(msgEl, "تم الحفظ بنجاح.", "success");
    });

    // إطلاق إيفنت
    q("#addEventForm")?.addEventListener("submit", async (e) => {
      e.preventDefault(); const msgEl = q("#eventMsg"), btn = q("#eventSubmitBtn"), fileInput = q("#eventImgFile");
      btn.disabled = true; setMessage(msgEl, "جاري الرفع...", "");
      try {
        const imageUrl = await uploadImage(fileInput.files[0], 'events');
        await sb.from("events").insert([{ title: q("#eventTitle").value, description: q("#eventDesc").value, image_url: imageUrl, action_link: q("#eventLink").value }]);
        setMessage(msgEl, "تم النشر ✅", "success"); q("#addEventForm").reset(); loadEventsAdmin();
      } catch (err) { setMessage(msgEl, "خطأ: " + err.message, "error"); }
      btn.disabled = false;
    });

    // إضافة صورة للمعرض
    q("#addGalleryImageForm")?.addEventListener("submit", async (e) => {
      e.preventDefault(); const msgEl = q("#galleryMsg"), btn = q("#gallerySubmitBtn"), fileInput = q("#galleryImgFile");
      btn.disabled = true; setMessage(msgEl, "جاري الرفع...", "");
      try {
        const imageUrl = await uploadImage(fileInput.files[0], 'gallery');
        await sb.from("gallery_images").insert([{ section_name: q("#gallerySectionName").value, image_url: imageUrl }]);
        setMessage(msgEl, "تم الإضافة ✅", "success"); q("#addGalleryImageForm").reset();
      } catch (err) { setMessage(msgEl, "خطأ: " + err.message, "error"); }
      btn.disabled = false;
    });

    // إدارة الإيفنتات والمستخدمين
    async function loadEventsAdmin() {
      const list = q("#eventsManagementList"); if (!list) return; list.innerHTML = "";
      const { data } = await sb.from("events").select("*").order("id", { ascending: false });
      (data || []).forEach(item => {
        list.innerHTML += `<div class="management-item"><div class="meta"><strong>${item.title}</strong></div>
        <div class="controls"><button class="cta-btn danger" onclick="deleteEvent(${item.id})">Delete</button></div></div>`;
      });
    }
    
    window.deleteEvent = async (id) => { if(confirm("حذف؟")) { await sb.from("events").delete().eq("id", id); loadEventsAdmin(); } };

    async function loadProfiles() {
      const list = q("#profilesManagementList"); if (!list) return; list.innerHTML = "";
      const { data } = await sb.from("profiles").select("*").order("created_at", { ascending: false });
      (data || []).forEach(p => {
        const sel = `<select id="role_${p.id}"><option value="member" ${p.role==='member'?'selected':''}>Member</option><option value="head" ${p.role==='head'?'selected':''}>Head</option></select>`;
        list.innerHTML += `<div class="table-row"><div class="main"><div class="title">${p.full_name || p.username}</div></div>
        <div class="actions">${sel}<button class="cta-btn primary-btn" onclick="updateRole('${p.id}')">Update</button></div></div>`;
      });
    }

    window.updateRole = async (id) => { await sb.from("profiles").update({ role: q(`#role_${id}`).value }).eq("id", id); alert("تم التحديث"); };

    await Promise.all([loadEventsAdmin(), loadProfiles()]);
  }

  // ==========================================
  // 10. تشغيل الموقع عند التحميل
  // ==========================================
  window.addEventListener("DOMContentLoaded", async () => {
    const ctx = await getCurrentContext();
    renderNav(ctx);
    
    // Particles & AOS
    if (q("#particles-js") && typeof window.particlesJS === "function") {
      window.particlesJS("particles-js", { particles: { number: { value: 60 }, color: { value: "#ffffff" }, size: { value: 2, random: true }, line_linked: { enable: true, color: "#39ff14", opacity: 0.2 }, move: { enable: true, speed: 1.2 } }, interactivity: { events: { onhover: { enable: true, mode: "bubble" } } } });
    }
    if (typeof window.AOS !== "undefined") window.AOS.init({ duration: 800, once: true });

    // توجيهات الدخول
    const path = getActivePath();
    if (ctx.session && path === "auth.html") window.location.href = isHead(ctx.role) ? "admin.html" : "index.html";
    if (path === "index.html" || path === "") {
      const gateway = q("#roleGateway");
      if (gateway && !ctx.session && localStorage.getItem(GUEST_ROLE_KEY) !== "guest") gateway.style.display = "flex";
      await syncHomeSettings();
    }

    // تفعيل الصفحات
    if (q("#loginForm")) { q("#loginForm").addEventListener("submit", loginHandler); q("#signupForm").addEventListener("submit", signupHandler); }
    if (q("#eventsGrid")) await loadEventsToGrid();
    if (q("#memoriesGrid")) { q("#memoryForm")?.addEventListener("submit", submitMemory); await loadMemories(); }
    if (q("#dynamicGalleryContainer")) await loadDynamicGallery(ctx);
    if (q("#adminContent")) { if (!ctx.session || !isHead(ctx.role)) window.location.href = "index.html"; else await setupAdmin(); }
  });
})();