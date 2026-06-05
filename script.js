(() => {
  // ==========================================
  // 1. الإعدادات الأساسية
  // ==========================================
  const SUPABASE_URL = window.SUPABASE_URL || "https://hvvfvsugamyexvvqhzkw.supabase.co";
  const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || "sb_publishable_yi8j0Z12YJB9w4eW4IU0Cg_S_tjGs-Q";
  const RECRUITMENT_FALLBACK_LINK = "https://forms.gle/YourActualStudentFormLink";
  const GUEST_ROLE_KEY = "aliens_role";
  const CACHE = { session: null, profile: null, role: null };

  const sb = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  }) : null;

  const q = (s, root = document) => root.querySelector(s);
  const qa = (s, root = document) => Array.from(root.querySelectorAll(s));
  const getActivePath = () => window.location.pathname.split("/").pop() || "index.html";
  function setMessage(el, msg, type) { if(el) { el.textContent = msg || ""; el.className = `auth-msg ${type||""}`; } }

  // ==========================================
  // 2. دالة الرفع السحابي (Storage)
  // ==========================================
  async function uploadImage(file, folder) {
    if (!file || !sb) return null;
    const ext = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${ext}`;
    const { error } = await sb.storage.from('aliens_images').upload(`${folder}/${fileName}`, file);
    if (error) throw error;
    return sb.storage.from('aliens_images').getPublicUrl(`${folder}/${fileName}`).data.publicUrl;
  }

  // ==========================================
  // 3. الصلاحيات والجلسة والنافبار
  // ==========================================
  async function getContext() {
    if (CACHE.session) return CACHE;
    if (!sb) return { session: null, role: null };
    const { data } = await sb.auth.getSession();
    if (!data?.session) return { session: null, role: null };
    const { data: prof } = await sb.from("profiles").select("*").eq("id", data.session.user.id).single();
    CACHE.session = data.session; CACHE.profile = prof; CACHE.role = prof?.role;
    return CACHE;
  }

  function renderNav(ctx) {
    const links = q("#siteNavLinks"), actions = q("#siteNavActions"), path = getActivePath();
    if (!links || !actions) return;
    
    links.innerHTML = `<a href="index.html" class="nav-link ${path==='index.html'?'active':''}">الرئيسية</a>
                       <a href="committees.html" class="nav-link ${path==='committees.html'?'active':''}">اللجان</a>
                       <a href="gallery.html" class="nav-link ${path==='gallery.html'?'active':''}">المعرض</a>
                       <a href="events.html" class="nav-link ${path==='events.html'?'active':''}">الفعاليات</a>`;
                       
    if (ctx.role === 'head' || ctx.role === 'member') links.innerHTML += `<a href="memories.html" class="nav-link ${path==='memories.html'?'active':''}">الذكريات</a>`;
    if (ctx.role === 'head') links.innerHTML += `<a href="admin.html" class="nav-link ${path==='admin.html'?'active':''}">Dashboard</a>`;
    
    if (ctx.session) {
      links.innerHTML += `<span class="user-chip">${ctx.profile?.full_name || "User"} · ${ctx.role==='head'?'Head':'Member'}</span>`;
      actions.innerHTML = `<button class="nav-btn danger" onclick="handleLogout()">Logout</button>`;
    } else {
      actions.innerHTML = `<a href="auth.html" class="nav-btn ghost">Login</a>`;
    }
  }

  window.handleLogout = async () => { localStorage.removeItem(GUEST_ROLE_KEY); await sb?.auth.signOut(); window.location.href = "index.html"; };
  window.selectRole = (r) => { if(r==="guest"){ localStorage.setItem(GUEST_ROLE_KEY, "guest"); q("#roleGateway").style.display="none"; } else { sessionStorage.setItem("aliens_entry_role", r); window.location.href="auth.html"; } };
  window.switchTab = (tab) => { qa(".tab-btn").forEach(b=>b.classList.remove("active")); qa(".auth-form").forEach(f=>f.classList.remove("active-form")); q(`#${tab}TabBtn`)?.classList.add("active"); q(`#${tab}Form`)?.classList.add("active-form"); };

  // ==========================================
  // 4. نظام الدخول والتسجيل (Auth)
  // ==========================================
  function setupAuth() {
    q("#loginForm")?.addEventListener("submit", async (e) => {
      e.preventDefault(); const msg = q("#loginMsg"), id = q("#loginId").value.trim(), pw = q("#loginPassword").value;
      setMessage(msg, "جاري التحقق...", ""); let email = id;
      if (!id.includes("@")) {
        const { data, error } = await sb.rpc("get_email_by_username", { p_username: id.toLowerCase() });
        if (error || !data) return setMessage(msg, "اسم المستخدم غير موجود.", "error"); email = data;
      }
      const { error } = await sb.auth.signInWithPassword({ email, password: pw });
      if (error) return setMessage(msg, "بيانات الدخول غير صحيحة.", "error");
      setMessage(msg, "تم الدخول بنجاح 🛸", "success"); setTimeout(() => location.reload(), 800);
    });

    q("#signupForm")?.addEventListener("submit", async (e) => {
      e.preventDefault(); const msg = q("#signupMsg"), name = q("#signupName").value.trim(), user = q("#signupUsername").value.trim().toLowerCase(), email = q("#signupEmail").value.trim(), pw = q("#signupPassword").value;
      setMessage(msg, "جاري الإنشاء...", "");
      if (user.includes(" ")) return setMessage(msg, "الاسم بدون مسافات.", "error");
      const { error } = await sb.auth.signUp({ email, password: pw, options: { data: { full_name: name, username: user } } });
      if (error) return setMessage(msg, "خطأ: " + error.message, "error");
      setMessage(msg, "تم التسجيل! راجع بريدك للتفعيل.", "success"); q("#signupForm").reset();
    });
  }

  // ==========================================
  // 5. الصفحة الرئيسية 
  // ==========================================
  async function syncHome() {
    const { data } = await sb.from("site_settings").select("*"); const map = new Map(); (data||[]).forEach(r => map.set(r.setting_key, r.setting_value));
    const st = String(map.get("recruitment_status")||"").trim().toLowerCase(), isOpen = ["open","1","true","yes","on"].includes(st);
    const link = map.get("recruitment_link") || RECRUITMENT_FALLBACK_LINK; window.__recruitmentOpen = isOpen; window.__recruitmentLink = link;
    const jb = q("#joinTeamBtn"), hb = q("#heroActionBtn"), msg = q("#recruitmentStatusMsg");
    if(jb) { jb.disabled = !isOpen; jb.textContent = isOpen ? "Join Our Crew 🛸" : "Boarding Closed"; }
    if(hb) { hb.textContent = isOpen ? "Join The Crew" : "Application Closed"; hb.className = `cta-btn ${isOpen?'primary-btn':'secondary-btn'}`; if(isOpen) hb.href=link; else hb.removeAttribute("href"); }
    if(msg) { msg.textContent = isOpen ? "🛸 باب التقديم مفتوح الآن." : "🔒 التقديم مغلق حاليًا."; msg.style.color = isOpen ? "var(--accent)" : "#fca5a5"; }
  }
  window.openApplicationForm = () => { if(window.__recruitmentOpen) window.open(window.__recruitmentLink, "_blank"); };

  // ==========================================
  // 6. صفحة الإيفنتات
  // ==========================================
  async function loadEvents() {
    const grid = q("#eventsGrid"); if(!grid||!sb) return; grid.innerHTML = "";
    const { data } = await sb.from("events").select("*").order("id", { ascending: false });
    if(!data?.length) return grid.innerHTML = '<div class="empty-state">لا توجد فعاليات حاليًا.</div>';
    data.forEach(e => {
      grid.innerHTML += `<article class="event-card"><img class="event-cover" src="${e.image_url}" alt="${e.title}"><div class="event-card-body"><h3>${e.title}</h3><p>${e.description}</p>${e.action_link ? `<div class="event-actions"><a class="cta-btn primary-btn" href="${e.action_link}" target="_blank">Join Now</a></div>` : ''}</div></article>`;
    });
  }

  // ==========================================
  // 7. صفحة الذكريات
  // ==========================================
  async function loadMemories() {
    const grid = q("#memoriesGrid"); if(!grid||!sb) return; grid.innerHTML = "";
    const { data } = await sb.from("memories").select("*").order("id", { ascending: false });
    if(!data?.length) return grid.innerHTML = '<div class="empty-state">لا توجد ذكريات بعد.</div>';
    data.forEach(m => {
      const img = m.image_url ? `<img src="${m.image_url}" style="width:100%; border-radius:12px; margin-top:15px; border:1px solid var(--border);">` : '';
      grid.innerHTML += `<article class="memory-card"><div class="memory-author">${m.author_name}</div><div class="memory-content">${m.memory_text}</div>${img}</article>`;
    });
  }

  // ==========================================
  // 8. صفحة المعرض (السكاشن واللايكات)
  // ==========================================
  async function loadGallery(ctx) {
    const c = q("#dynamicGalleryContainer"); if(!c||!sb) return; c.innerHTML = "";
    const { data: imgs } = await sb.from("gallery_images").select("*").order("created_at", { ascending: true });
    const { data: likes } = await sb.from("gallery_likes").select("*");
    if(!imgs?.length) return c.innerHTML = '<div class="empty-state">المعرض فارغ حالياً.</div>';
    
    const secs = {}; imgs.forEach(i => { if(!secs[i.section_name]) secs[i.section_name]=[]; secs[i.section_name].push(i); });
    const lCount = {}; const uLikes = new Set();
    (likes||[]).forEach(l => { lCount[l.image_name]=(lCount[l.image_name]||0)+1; if(ctx.session && l.user_id===ctx.session.user.id) uLikes.add(l.image_name); });
    
    for(const [s, arr] of Object.entries(secs)) {
      let h = `<h3 class="gallery-subtitle"><i class="fa-solid fa-folder-open"></i> ${s}</h3><div class="gallery-fluid-grid">`;
      arr.forEach(i => { h += `<div class="gallery-fluid-item"><img src="${i.image_url}"><div class="img-caption"><button class="like-btn ${uLikes.has(i.id.toString())?'liked':''}" data-id="${i.id}"><i class="fa-solid fa-heart"></i> <span class="count">${lCount[i.id.toString()]||0}</span></button></div></div>`; });
      c.innerHTML += h + `</div>`;
    }
    qa(".like-btn").forEach(b => b.addEventListener("click", async () => {
      if(!ctx.session) return alert("يجب تسجيل الدخول للإعجاب! 🛸");
      const id = b.dataset.id, lkd = b.classList.toggle("liked"), cnt = b.querySelector(".count");
      cnt.textContent = parseInt(cnt.textContent) + (lkd?1:-1);
      if(lkd) await sb.from("gallery_likes").insert([{ image_name:id, user_id:ctx.session.user.id }]);
      else await sb.from("gallery_likes").delete().match({ image_name:id, user_id:ctx.session.user.id });
    }));
  }

  // ==========================================
  // 9. لوحة الأدمن (الداشبورد)
  // ==========================================
  async function setupAdmin() {
    try {
      q("#adminLoader").style.display = "none"; q("#adminContent").style.display = "block"; q("#adminContent").classList.remove("hidden");
      
      q("#addGalleryImageForm")?.addEventListener("submit", async(e) => {
        e.preventDefault(); const msg=q("#galleryMsg"), btn=q("#gallerySubmitBtn"), f=q("#galleryImgFile").files[0];
        btn.disabled=true; setMessage(msg, "جاري الرفع...", "");
        try { const url = await uploadImage(f, 'gallery'); await sb.from("gallery_images").insert([{ section_name: q("#gallerySectionName").value, image_url: url }]); setMessage(msg, "تمت الإضافة ✅", "success"); q("#addGalleryImageForm").reset(); } catch(err) { setMessage(msg, "خطأ: "+err.message, "error"); } btn.disabled=false;
      });
      
      q("#addEventForm")?.addEventListener("submit", async(e) => {
        e.preventDefault(); const msg=q("#eventMsg"), btn=q("#eventSubmitBtn"), f=q("#eventImgFile").files[0];
        btn.disabled=true; setMessage(msg, "جاري النشر...", "");
        try { const url = await uploadImage(f, 'events'); await sb.from("events").insert([{ title: q("#eventTitle").value, description: q("#eventDesc").value, image_url: url, action_link: q("#eventLink").value }]); setMessage(msg, "تم النشر ✅", "success"); q("#addEventForm").reset(); } catch(err) { setMessage(msg, "خطأ: "+err.message, "error"); } btn.disabled=false;
      });

      const { data: users } = await sb.from("profiles").select("*");
      if(users) {
        let h = ""; users.forEach(u => { h += `<div class="table-row"><div class="main"><div class="title">${u.full_name||u.username}</div></div><div class="actions"><select id="r_${u.id}"><option value="member" ${u.role==='member'?'selected':''}>Member</option><option value="head" ${u.role==='head'?'selected':''}>Head</option></select><button class="cta-btn primary-btn" onclick="sb.from('profiles').update({role: document.querySelector('#r_${u.id}').value}).eq('id', '${u.id}').then(()=>alert('تم التحديث!'))">تحديث</button></div></div>`; });
        q("#profilesManagementList").innerHTML = h;
      }
    } catch (error) { console.error(error); alert("خطأ في تحميل بيانات اللوحة."); }
  }

  // ==========================================
  // 10. تشغيل الأكواد عند التحميل 🚀
  // ==========================================
  window.addEventListener("DOMContentLoaded", async () => {
    // حل المشكلة الأساسية: تشغيل مكتبة الأنيميشن عشان العناصر تظهر
    if (typeof window.AOS !== "undefined") {
      window.AOS.init({ duration: 800, once: true, offset: 40 });
    }

    const ctx = await getContext(); renderNav(ctx);
    const path = getActivePath();
    
    // تشغيل الخلفية
    if (q("#particles-js") && typeof window.particlesJS === "function") window.particlesJS("particles-js", { particles: { number: { value: 60 }, color: { value: "#ffffff" }, size: { value: 2, random: true }, line_linked: { enable: true, color: "#39ff14", opacity: 0.2 }, move: { enable: true, speed: 1.2 } }, interactivity: { events: { onhover: { enable: true, mode: "bubble" } } } });

    // الرئيسية وبوابة الدخول
    if (path === "index.html" || path === "") {
      const gw = q("#roleGateway"); if(gw) { if(ctx.session || localStorage.getItem(GUEST_ROLE_KEY)==="guest") gw.style.display="none"; }
      await syncHome();
    }
    
    // التوجيهات
    if (path === "auth.html") { if (ctx.session) window.location.href = ctx.role==='head' ? "admin.html" : "index.html"; else setupAuth(); }
    if (path === "events.html") await loadEvents();
    if (path === "gallery.html") await loadGallery(ctx);
    
    // صفحة الذكريات
    if (path === "memories.html") {
      if(!ctx.session && q("#memoryForm")) q("#memoryForm").innerHTML = '<p class="auth-msg error">يجب تسجيل الدخول لنشر الذكريات.</p>';
      q("#memoryForm")?.addEventListener("submit", async(e) => {
        e.preventDefault(); const msg=q("#memoryMsg"), btn=q("#submitMemoryBtn"), f=q("#memoryImgFile").files[0];
        btn.disabled=true; setMessage(msg, "جاري النشر...", "");
        try { const url = f ? await uploadImage(f, 'memories') : null; await sb.from("memories").insert([{ author_name: ctx.profile.full_name, memory_text: q("#memoryText").value, image_url: url, user_id: ctx.session.user.id, is_approved: true }]); setMessage(msg, "تم النشر ✅", "success"); q("#memoryForm").reset(); await loadMemories(); } catch(err) { setMessage(msg, "خطأ: "+err.message, "error"); } btn.disabled=false;
      });
      await loadMemories();
    }
    
    // لوحة التحكم
    if (path === "admin.html") { if(ctx.role !== 'head') window.location.href = "index.html"; else await setupAdmin(); }
  });
})();