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
  // 4. نظام الدخول والتسجيل المحسن 🔐
  // ==========================================
 // دالة الدخول الذكية
  window.loginAction = async (e) => {
    e.preventDefault();
    const email = document.querySelector("#loginId").value;
    const pass = document.querySelector("#loginPassword").value;
    const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
    if (error) return alert("خطأ: " + error.message);
    
    // التحقق من الرتبة بعد الدخول
    const { data: prof } = await sb.from("profiles").select("role").eq("id", data.user.id).single();
    window.location.href = prof?.role === 'head' ? "admin.html" : "index.html";
  };

  // دالة تحميل الذكريات (تظهر للكل بعد التعديل في SQL)
  async function loadMemories() {
    const grid = document.querySelector("#memoriesGrid");
    if (!grid) return;
    const { data } = await sb.from("memories").select("*").order("id", { ascending: false });
    grid.innerHTML = (data || []).map(m => `
      <div class="memory-card">
        <h3>${m.author_name}</h3>
        <p>${m.memory_text}</p>
        ${m.image_url ? `<img src="${m.image_url}" style="width:100%; border-radius:10px;">` : ''}
      </div>
    `).join('');
  }

  window.addEventListener("DOMContentLoaded", () => {
    loadMemories();
    document.querySelector("#loginForm")?.addEventListener("submit", window.loginAction);
  });
})();

    if (signupForm) {
      signupForm.addEventListener("submit", async (e) => {
        e.preventDefault(); 
        const msg = q("#signupMsg");
        const name = q("#signupName").value.trim();
        const user = q("#signupUsername").value.trim().toLowerCase();
        const email = q("#signupEmail").value.trim();
        const pw = q("#signupPassword").value;

        setMessage(msg, "جاري الإنشاء...", "");
        if (user.includes(" ")) return setMessage(msg, "الاسم بدون مسافات.", "error");
        
        const { error } = await sb.auth.signUp({ email, password: pw, options: { data: { full_name: name, username: user } } });
        
        if (error) return setMessage(msg, "خطأ: " + error.message, "error");
        setMessage(msg, "تم التسجيل! راجع بريدك للتفعيل.", "success"); 
        q("#signupForm").reset();
      });
    }
  }

  // ==========================================
  // 5. الصفحة الرئيسية والإعدادات
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
  // 6. صفحة الإيفنتات (بألبوم صور)
  // ==========================================
  async function loadEvents() {
    const grid = q("#eventsGrid"); if(!grid||!sb) return; grid.innerHTML = "";
    const { data } = await sb.from("events").select("*").order("id", { ascending: false });
    if(!data?.length) return grid.innerHTML = '<div class="empty-state">لا توجد فعاليات حاليًا.</div>';
    data.forEach(evt => {
      let actionHtml = evt.action_link ? `<a class="cta-btn primary-btn" href="${evt.action_link}" target="_blank">Join Now</a>` : '';
      const urls = (evt.image_url || "").split(',').filter(u => u); let imgHtml = '';
      if (urls.length > 1) { 
        imgHtml = `<div class="slider-container"><div class="image-slider">` + urls.map(u => `<img class="slider-img" src="${u}" alt="Event">`).join('') + `</div><div class="swipe-hint"><i class="fa-solid fa-angles-left"></i> اسحب للصور</div></div>`;
      } else if (urls.length === 1) { 
        imgHtml = `<img class="event-cover" src="${urls[0]}" alt="Event">`;
      }
      grid.innerHTML += `<article class="event-card">${imgHtml}<div class="event-card-body"><h3>${evt.title}</h3><p>${evt.description}</p><div class="event-actions">${actionHtml}</div></div></article>`;
    });
  }

  // ==========================================
  // 7. صفحة الذكريات (بألبوم صور)
  // ==========================================
  async function loadMemories() {
    const grid = q("#memoriesGrid"); if(!grid||!sb) return; grid.innerHTML = "";
    const { data } = await sb.from("memories").select("*").order("id", { ascending: false });
    if(!data?.length) return grid.innerHTML = '<div class="empty-state">لا توجد ذكريات بعد.</div>';
    data.forEach(mem => {
      const urls = (mem.image_url || "").split(',').filter(u => u); let imgHtml = '';
      if (urls.length > 1) { 
        imgHtml = `<div class="slider-container"><div class="image-slider mt-10">` + urls.map(u => `<img class="slider-img" src="${u}">`).join('') + `</div><div class="swipe-hint"><i class="fa-solid fa-angles-left"></i> اسحب للصور</div></div>`;
      } else if (urls.length === 1) { 
        imgHtml = `<img src="${urls[0]}" style="width:100%; border-radius:12px; margin-top:10px; border:1px solid var(--border); max-height:300px; object-fit:cover;">`;
      }
      grid.innerHTML += `<article class="memory-card"><div class="memory-author">${mem.author_name}</div><div class="memory-content">${mem.memory_text}</div>${imgHtml}</article>`;
    });
  }

  // ==========================================
  // 8. المعرض الديناميكي
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
  // 9. لوحة الأدمن الخارقة (تفتح فوراً)
  // ==========================================
  async function setupAdmin() {
    // 1. إخفاء شاشة التحميل فوراً
    const loader = q("#adminLoader"); const content = q("#adminContent");
    if (loader) loader.style.display = "none";
    if (content) { content.style.display = "block"; content.classList.remove("hidden"); }

    // 2. تحميل البيانات في الخلفية بدون تعطيل
    async function loadAdminData() {
      try {
        const { data: sData } = await sb.from("site_settings").select("*"); const sMap = new Map(); (sData || []).forEach(r => sMap.set(r.setting_key, r.setting_value));
        q("#recruitmentStatus").value = ["open", "1", "true", "yes", "on"].some(v => String(sMap.get("recruitment_status")||"").trim().toLowerCase() === v) ? "open" : "close";
        q("#recruitmentLink").value = sMap.get("recruitment_link") || ""; q("#prHeadPhone").value = sMap.get("pr_head_phone") || ""; q("#prSubPhone").value = sMap.get("pr_sub_phone") || "";

        const { data: users } = await sb.from("profiles").select("*");
        if(users && q("#profilesManagementList")) {
          let h = ""; users.forEach(u => { h += `<div class="table-row"><div class="main"><div class="title">${u.full_name||u.username}</div></div><div class="actions"><select id="r_${u.id}"><option value="member" ${u.role==='member'?'selected':''}>Member</option><option value="head" ${u.role==='head'?'selected':''}>Head</option></select><button class="cta-btn primary-btn" onclick="sb.from('profiles').update({role: document.querySelector('#r_${u.id}').value}).eq('id', '${u.id}').then(()=>alert('تم التحديث!'))">تحديث</button></div></div>`; });
          q("#profilesManagementList").innerHTML = h;
        }

        const list = q("#eventsManagementList"); 
        if (list) {
            list.innerHTML = "";
            const { data } = await sb.from("events").select("*").order("id", { ascending: false });
            (data || []).forEach(item => { list.innerHTML += `<div class="management-item"><div class="meta"><strong>${item.title}</strong></div><div class="controls"><button class="cta-btn danger" onclick="deleteEvent(${item.id})">Delete</button></div></div>`; });
        }
      } catch (err) { console.error("Error loading admin data", err); }
    }
    
    window.deleteEvent = async (id) => { if(confirm("حذف الإيفنت نهائياً؟")) { await sb.from("events").delete().eq("id", id); loadAdminData(); } };
    loadAdminData();

    // 3. رفع أكثر من صورة للمعرض
    q("#addGalleryImageForm")?.addEventListener("submit", async(e) => {
      e.preventDefault(); const msg=q("#galleryMsg"), btn=q("#gallerySubmitBtn"), files=q("#galleryImgFile").files;
      btn.disabled=true; setMessage(msg, `جاري رفع ${files.length} صورة... ⏳`, "");
      try { 
        for(let f of Array.from(files)) {
          const url = await uploadImage(f, 'gallery'); 
          await sb.from("gallery_images").insert([{ section_name: q("#gallerySectionName").value, image_url: url }]); 
        }
        setMessage(msg, "تمت الإضافة بنجاح ✅", "success"); q("#addGalleryImageForm").reset(); 
      } catch(err) { setMessage(msg, "خطأ: "+err.message, "error"); } btn.disabled=false;
    });
    
    // 4. رفع إيفنت بأكثر من صورة
    q("#addEventForm")?.addEventListener("submit", async(e) => {
      e.preventDefault(); const msg=q("#eventMsg"), btn=q("#eventSubmitBtn"), files=q("#eventImgFile").files;
      btn.disabled=true; setMessage(msg, "جاري النشر...", "");
      try { 
        let urls = []; for(let f of Array.from(files)) urls.push(await uploadImage(f, 'events'));
        await sb.from("events").insert([{ title: q("#eventTitle").value, description: q("#eventDesc").value, image_url: urls.join(','), action_link: q("#eventLink").value }]); 
        setMessage(msg, "تم النشر ✅", "success"); q("#addEventForm").reset(); loadAdminData();
      } catch(err) { setMessage(msg, "خطأ: "+err.message, "error"); } btn.disabled=false;
    });

    // 5. حفظ الإعدادات
    q("#settingsForm")?.addEventListener("submit", async(e) => {
      e.preventDefault(); const msg=q("#settingsMsg"); setMessage(msg, "جاري الحفظ...", "");
      await sb.from("site_settings").upsert([{ setting_key: "recruitment_status", setting_value: q("#recruitmentStatus").value }, { setting_key: "recruitment_link", setting_value: q("#recruitmentLink").value }, { setting_key: "pr_head_phone", setting_value: q("#prHeadPhone").value }, { setting_key: "pr_sub_phone", setting_value: q("#prSubPhone").value }], { onConflict: "setting_key" });
      setMessage(msg, "تم الحفظ بنجاح ✅", "success");
    });
  }

  // ==========================================
  // 10. التشغيل التلقائي عند فتح الموقع
  // ==========================================
  window.addEventListener("DOMContentLoaded", async () => {
    // 1. تشغيل الحركات
    if (typeof window.AOS !== "undefined") window.AOS.init({ duration: 800, once: true, offset: 40 });
    if (q("#particles-js") && typeof window.particlesJS === "function") window.particlesJS("particles-js", { particles: { number: { value: 60 }, color: { value: "#ffffff" }, size: { value: 2, random: true }, line_linked: { enable: true, color: "#39ff14", opacity: 0.2 }, move: { enable: true, speed: 1.2 } }, interactivity: { events: { onhover: { enable: true, mode: "bubble" } } } });

    // 2. التحقق من المستخدم وتوزيع المهام
    const ctx = await getContext(); renderNav(ctx);
    const path = getActivePath();

    if (path === "index.html" || path === "") {
      const gw = q("#roleGateway"); if(gw) { if(ctx.session || localStorage.getItem(GUEST_ROLE_KEY)==="guest") gw.style.display="none"; }
      await syncHome();
    }
    
    if (path === "auth.html") { if (ctx.session) window.location.href = ctx.role==='head' ? "admin.html" : "index.html"; else setupAuth(); }
    if (path === "events.html") await loadEvents();
    if (path === "gallery.html") await loadGallery(ctx);
    
    if (path === "memories.html") {
      if(!ctx.session && q("#memoryForm")) q("#memoryForm").innerHTML = '<p class="auth-msg error">يجب تسجيل الدخول لنشر الذكريات.</p>';
      q("#memoryForm")?.addEventListener("submit", async(e) => {
        e.preventDefault(); const msg=q("#memoryMsg"), btn=q("#submitMemoryBtn"), files=q("#memoryImgFile").files;
        btn.disabled=true; setMessage(msg, "جاري رفع الصور والنشر...", "");
        try { 
          let urls = []; if (files.length > 0) { for(let f of Array.from(files)) urls.push(await uploadImage(f, 'memories')); }
          await sb.from("memories").insert([{ author_name: ctx.profile.full_name, memory_text: q("#memoryText").value, image_url: urls.length > 0 ? urls.join(',') : null, user_id: ctx.session.user.id, is_approved: true }]); 
          setMessage(msg, "تم النشر ✅", "success"); q("#memoryForm").reset(); await loadMemories(); 
        } catch(err) { setMessage(msg, "خطأ: "+err.message, "error"); } btn.disabled=false;
      });
      await loadMemories();
    }
    
    if (path === "admin.html") { 
      if(ctx.role !== 'head') window.location.href = "index.html"; 
      else await setupAdmin(); 
    }
  });
})();
