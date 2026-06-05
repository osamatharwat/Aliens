(() => {
  const SUPABASE_URL = window.SUPABASE_URL || "https://hvvfvsugamyexvvqhzkw.supabase.co";
  const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || "sb_publishable_yi8j0Z12YJB9w4eW4IU0Cg_S_tjGs-Q";
  const RECRUITMENT_FALLBACK_LINK = "https://forms.gle/YourActualStudentFormLink";
  const GUEST_ROLE_KEY = "aliens_role";
  const CACHE = {
    session: null,
    profile: null,
    role: null,
    settings: null,
    events: null,
    memories: null,
    profiles: null
  };

  function hasSupabaseLib() {
    return !!window.supabase && typeof window.supabase.createClient === "function";
  }

  function initSupabase() {
    if (window.supabaseClient) return window.supabaseClient;
    if (!hasSupabaseLib()) return null;
    try {
      const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      window.supabaseClient = client;
      return client;
    } catch (error) {
      return null;
    }
  }

  const sb = initSupabase();
  window.supabaseClient = sb;
  window.supabase = window.supabase || {};

  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const pageName = () => document.body?.dataset?.page || document.body?.className || "page";

  function escapeText(value) { return value == null ? "" : String(value); }
  function formatDate(value) {
    if (!value) return "بدون تاريخ";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "بدون تاريخ";
    return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(date);
  }

  function getActivePath() {
    const path = window.location.pathname.split("/").pop() || "index.html";
    return path === "" ? "index.html" : path;
  }

  function setMessage(el, message, type) {
    if (!el) return;
    el.textContent = message || "";
    el.classList.remove("error", "success");
    if (type) el.classList.add(type);
  }

  function openExternal(url) {
    if (!url) return;
    try {
      const parsed = new URL(url, window.location.origin);
      window.open(parsed.toString(), "_blank", "noopener,noreferrer");
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  async function getSession() {
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return data?.session || null;
  }

  async function getProfile(userId) {
    if (!sb || !userId) return null;
    const { data, error } = await sb.from("profiles").select("*").eq("id", userId).maybeSingle();
    return data || null;
  }

  async function getCurrentContext() {
    if (CACHE.session || CACHE.profile || CACHE.role) {
      return { session: CACHE.session, profile: CACHE.profile, role: CACHE.role || (CACHE.profile?.role || null) };
    }
    const session = await getSession();
    CACHE.session = session;
    if (!session) return { session: null, profile: null, role: null };
    const profile = await getProfile(session.user.id);
    CACHE.profile = profile;
    CACHE.role = profile?.role || null;
    return { session, profile, role: CACHE.role };
  }

  function isHead(role) { return String(role || "").toLowerCase() === "head"; }
  function isMember(role) { const r = String(role || "").toLowerCase(); return r === "member" || r === "head"; }

  function getRecruitmentStatusValue(settingsMap) {
    const raw = String(settingsMap.get("recruitment_status") || "").trim().toLowerCase();
    if (!raw) return "close";
    if (["open", "opened", "opening", "1", "true", "yes", "on"].some((v) => raw === v || raw.startsWith(v))) return "open";
    return "close";
  }

  function getSetting(settingsMap, key, fallback = "") { return settingsMap.has(key) ? settingsMap.get(key) : fallback; }

  async function loadSettings() {
    if (!sb) return new Map();
    if (CACHE.settings) return CACHE.settings;
    const { data } = await sb.from("site_settings").select("setting_key, setting_value");
    const map = new Map();
    (data || []).forEach((row) => map.set(row.setting_key, row.setting_value));
    CACHE.settings = map;
    return map;
  }

  function renderNav(context) {
    const linksRoot = q("#siteNavLinks");
    const actionsRoot = q("#siteNavActions");
    if (!linksRoot && !actionsRoot) return;

    const currentPath = getActivePath();
    const role = context?.role || null;
    const session = context?.session || null;

    const linkDefs = [
      { href: "index.html", label: "الرئيسية", auth: false },
      { href: "committees.html", label: "اللجان", auth: false },
      { href: "gallery.html", label: "المعرض", auth: false },
      { href: "events.html", label: "الفعاليات", auth: false },
      { href: "memories.html", label: "الذكريات", auth: true },
      { href: "admin.html", label: "Dashboard", headOnly: true }
    ];

    const visibleLinks = linkDefs.filter((item) => {
      if (item.headOnly && !isHead(role)) return false;
      if (item.auth && !isMember(role)) return false;
      return true;
    });

    if (linksRoot) {
      linksRoot.innerHTML = "";
      visibleLinks.forEach((item) => {
        const a = document.createElement("a");
        a.href = item.href; a.className = "nav-link"; a.textContent = item.label;
        if (currentPath === item.href) a.classList.add("active");
        linksRoot.appendChild(a);
      });
      if (session) {
        const chip = document.createElement("span");
        chip.className = "user-chip";
        chip.textContent = `${context.profile?.full_name || session.user.email || "User"} · ${isHead(role) ? "Head" : "Member"}`;
        linksRoot.appendChild(chip);
      }
    }

    if (actionsRoot) {
      actionsRoot.innerHTML = "";
      if (session) {
        const logoutBtn = document.createElement("button"); logoutBtn.type = "button"; logoutBtn.className = "nav-btn danger"; logoutBtn.textContent = "Logout";
        logoutBtn.addEventListener("click", handleLogout); actionsRoot.appendChild(logoutBtn);
      } else {
        const loginBtn = document.createElement("a"); loginBtn.href = "auth.html"; loginBtn.className = "nav-btn ghost"; loginBtn.textContent = "Login";
        actionsRoot.appendChild(loginBtn);
      }
    }
  }

  async function handleLogout() {
    localStorage.removeItem(GUEST_ROLE_KEY);
    CACHE.session = null; CACHE.profile = null; CACHE.role = null;
    if (sb) await sb.auth.signOut();
    window.location.href = "index.html";
  }

  function initParticles() {
    if (!q("#particles-js") || typeof window.particlesJS !== "function") return;
    const mobile = window.matchMedia("(max-width: 640px)").matches;
    window.particlesJS("particles-js", {
      particles: {
        number: { value: mobile ? 42 : 88 }, color: { value: "#ffffff" },
        opacity: { value: 0.55, random: true }, size: { value: mobile ? 2.2 : 3, random: true },
        line_linked: { enable: true, distance: mobile ? 110 : 145, color: "#39ff14", opacity: 0.16, width: 1 },
        move: { enable: true, speed: mobile ? 1 : 1.4, direction: "none", random: true }
      },
      interactivity: { events: { onhover: { enable: !mobile, mode: "bubble" }, onclick: { enable: true, mode: "repulse" } } }
    });
  }

  function initAOS() { if (typeof window.AOS !== "undefined") window.AOS.init({ duration: 850, once: true, offset: 40 }); }

  function createBadge(text, cls = "") {
    const span = document.createElement("span"); span.className = `badge ${cls}`.trim(); span.textContent = text;
    return span;
  }

  function createButton(text, cls, onClick) {
    const btn = document.createElement("button"); btn.type = "button"; btn.className = `cta-btn ${cls}`.trim(); btn.textContent = text;
    if (onClick) btn.addEventListener("click", onClick);
    return btn;
  }

  async function syncRecruitmentOnHome() {
    const joinBtn = q("#joinTeamBtn"), heroBtn = q("#heroActionBtn"), statusMsg = q("#recruitmentStatusMsg");
    if (!joinBtn && !heroBtn && !statusMsg) return;

    const settings = await loadSettings();
    const open = getRecruitmentStatusValue(settings) === "open";
    const recruitmentLink = getSetting(settings, "recruitment_link", RECRUITMENT_FALLBACK_LINK);

    window.__aliensRecruitmentState = { open, recruitmentLink };
    if (joinBtn) { joinBtn.disabled = !open; joinBtn.textContent = open ? "Join Our Crew 🛸" : "Boarding Closed"; joinBtn.onclick = open ? () => openExternal(recruitmentLink) : null; }
    if (heroBtn) { heroBtn.textContent = open ? "Join The Crew" : "Application Closed"; heroBtn.classList.toggle("primary-btn", open); heroBtn.classList.toggle("secondary-btn", !open); if (open) heroBtn.setAttribute("href", recruitmentLink); else heroBtn.removeAttribute("href"); }
    if (statusMsg) { statusMsg.textContent = open ? "🛸 باب التقديم مفتوح الآن." : "🔒 التقديم مغلق حاليًا."; statusMsg.style.color = open ? "var(--accent)" : "#fca5a5"; }
  }

  function setupRoleGateway(context) {
    const gateway = q("#roleGateway");
    if (!gateway) return;
    if (context.session || localStorage.getItem(GUEST_ROLE_KEY) === "guest") { gateway.style.display = "none"; return; }
    gateway.style.display = "flex";
  }

  window.selectRole = function selectRole(role) {
    if (role === "guest") { localStorage.setItem(GUEST_ROLE_KEY, "guest"); q("#roleGateway").style.display = "none"; return; }
    sessionStorage.setItem("aliens_entry_role", role); window.location.href = "auth.html";
  };

  async function signupHandler(event) {
    event.preventDefault(); if (!sb) return;
    const msgEl = q("#signupMsg");
    const name = q("#signupName")?.value.trim() || "";
    const username = q("#signupUsername")?.value.trim().toLowerCase() || "";
    const email = q("#signupEmail")?.value.trim() || "";
    const password = q("#signupPassword")?.value || "";

    setMessage(msgEl, "جاري إنشاء الحساب... 🚀");
    if (username.includes(" ")) { setMessage(msgEl, "اسم المستخدم لازم يكون بدون مسافات.", "error"); return; }
    const { error } = await sb.auth.signUp({ email, password, options: { data: { full_name: name, username } } });
    if (error) { setMessage(msgEl, `خطأ: ${error.message}`, "error"); return; }
    setMessage(msgEl, "تم إنشاء الحساب! فعّله من بريدك الإلكتروني.", "success"); q("#signupForm")?.reset();
  }

  async function loginHandler(event) {
    event.preventDefault(); if (!sb) return;
    const msgEl = q("#loginMsg");
    const loginId = q("#loginId")?.value.trim() || "";
    const password = q("#loginPassword")?.value || "";
    let email = loginId;

    setMessage(msgEl, "جاري التحقق...");
    if (!loginId.includes("@")) {
      const { data, error } = await sb.rpc("get_email_by_username", { p_username: loginId.toLowerCase() });
      if (error || !data) { setMessage(msgEl, "اسم المستخدم غير موجود.", "error"); return; }
      email = data;
    }
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) { setMessage(msgEl, "بيانات الدخول غير صحيحة.", "error"); return; }
    setMessage(msgEl, "تم الدخول بنجاح.", "success");
    
    const profile = await getProfile(data.user.id);
    setTimeout(() => { window.location.href = isHead(profile?.role) ? "admin.html" : "index.html"; }, 800);
  }

  function setupAuthPage(context) {
    q("#loginTabBtn")?.addEventListener("click", () => switchTab("login"));
    q("#signupTabBtn")?.addEventListener("click", () => switchTab("signup"));
    q("#loginForm")?.addEventListener("submit", loginHandler);
    q("#signupForm")?.addEventListener("submit", signupHandler);

    if (context.session) { window.location.href = isHead(context.role) ? "admin.html" : "index.html"; return; }
    const preferred = sessionStorage.getItem("aliens_entry_role");
    if (preferred === "admin" || preferred === "member") switchTab("login");
    sessionStorage.removeItem("aliens_entry_role");
  }

  window.switchTab = function switchTab(tab) {
    qa(".tab-btn").forEach(btn => btn.classList.remove("active"));
    qa(".auth-form").forEach(form => form.classList.remove("active-form"));
    q(`#${tab}TabBtn`)?.classList.add("active"); q(`#${tab}Form`)?.classList.add("active-form");
  };

  // الحل الجذري لمشكلة شاشة التحميل (Loader)
  function setLoadingState(enabled) {
    const loader = q("#adminLoader");
    const content = q("#adminContent");
    if (!loader || !content) return;
    if (enabled) {
        loader.style.display = "flex";
        content.style.display = "none";
    } else {
        loader.style.display = "none";
        content.style.display = "block";
        content.classList.remove("hidden");
    }
  }

  function makeTextEl(tag, text, className = "") { const el = document.createElement(tag); if (className) el.className = className; el.textContent = escapeText(text); return el; }
  function createEmptyState(message) { const div = document.createElement("div"); div.className = "empty-state"; div.textContent = message; return div; }

  async function loadEventsToGrid() {
    const grid = q("#eventsGrid"); if (!grid || !sb) return; grid.innerHTML = "";
    const { data, error } = await sb.from("events").select("*").order("id", { ascending: false });
    if (error || !data.length) { grid.appendChild(createEmptyState("لا توجد فعاليات منشورة حاليًا.")); return; }
    data.forEach((eventItem) => {
      const card = document.createElement("article"); card.className = "event-card";
      const img = document.createElement("img"); img.className = "event-cover"; img.src = eventItem.image_url; img.alt = eventItem.title;
      const body = document.createElement("div"); body.className = "event-card-body";
      body.append(makeTextEl("h3", eventItem.title), makeTextEl("p", eventItem.description));
      const actions = document.createElement("div"); actions.className = "event-actions";
      if (eventItem.action_link) {
        const joinBtn = document.createElement("a"); joinBtn.className = "cta-btn primary-btn"; joinBtn.href = eventItem.action_link; joinBtn.target = "_blank"; joinBtn.textContent = "Join Now";
        actions.appendChild(joinBtn);
      }
      body.append(actions); card.append(img, body); grid.appendChild(card);
    });
  }

  async function loadApprovedMemories() {
    const grid = q("#memoriesGrid"); if (!grid || !sb) return; grid.innerHTML = "";
    const { data } = await sb.from("memories").select("*").eq("is_approved", true).order("id", { ascending: false });
    if (!data || !data.length) { grid.appendChild(createEmptyState("لا توجد ذكريات معتمدة بعد.")); return; }
    data.forEach((memory) => {
      const card = document.createElement("article"); card.className = "memory-card";
      card.append(makeTextEl("div", memory.author_name, "memory-author"), makeTextEl("div", memory.memory_text, "memory-content"));
      const meta = document.createElement("div"); meta.className = "memory-meta"; meta.appendChild(createBadge(formatDate(memory.created_at)));
      card.append(meta); grid.appendChild(card);
    });
  }

  async function handleMemorySubmit(event) {
    event.preventDefault(); const msgEl = q("#memoryMsg"); const textarea = q("#memoryText"); const submitBtn = q("#submitMemoryBtn");
    if (!sb) return;
    const context = await getCurrentContext();
    if (!context.session) { setMessage(msgEl, "يجب تسجيل الدخول للإضافة.", "error"); return; }
    if (submitBtn) submitBtn.disabled = true; setMessage(msgEl, "جاري الإرسال للمراجعة...");
    const { error } = await sb.from("memories").insert([{ author_name: context.profile?.full_name || "Member", memory_text: textarea.value, is_approved: false, user_id: context.session.user.id }]);
    if (error) setMessage(msgEl, "حدث خطأ.", "error"); else { setMessage(msgEl, "تم الإرسال للمراجعة.", "success"); textarea.value = ""; }
    if (submitBtn) submitBtn.disabled = false;
  }

  const GALLERY_ITEMS = [
    { key: "job_fair_1.jpg", label: "Job Fair 1" }, { key: "job_fair_2.jpg", label: "Job Fair 2" },
    { key: "orphanage_1.jpg", label: "Orphanage 1" }, { key: "orphanage_2.jpg", label: "Orphanage 2" },
    { key: "welcome_1.jpg", label: "Welcome 1" }, { key: "welcome_2.jpg", label: "Welcome 2" },
    { key: "awareness_1.jpg", label: "Awareness 1" }, { key: "awareness_2.jpg", label: "Awareness 2" }
  ];

  function buildGalleryStatic() {
    const target = q("#galleryStatic"); if (!target) return; target.innerHTML = "";
    const grid = document.createElement("div"); grid.className = "gallery-fluid-grid";
    GALLERY_ITEMS.forEach((item) => {
      const wrap = document.createElement("div"); wrap.className = "gallery-fluid-item";
      const img = document.createElement("img"); img.src = item.key;
      const caption = document.createElement("div"); caption.className = "img-caption";
      caption.innerHTML = `<span>${item.label}</span><button class="like-btn" data-image="${item.label}"><i class="fa-solid fa-heart"></i> <span class="like-count">0</span></button>`;
      wrap.append(img, caption); grid.appendChild(wrap);
    });
    target.appendChild(grid);
  }

  async function loadGalleryLikes(context) {
    if (!sb) return;
    const { data } = await sb.from("gallery_likes").select("*");
    const likesMap = {}; const userLikes = new Set();
    (data || []).forEach(like => {
      likesMap[like.image_name] = (likesMap[like.image_name] || 0) + 1;
      if (context.session && like.user_id === context.session.user.id) userLikes.add(like.image_name);
    });

    document.querySelectorAll(".like-btn").forEach(btn => {
      const imgName = btn.dataset.image;
      btn.querySelector(".like-count").textContent = likesMap[imgName] || 0;
      if (userLikes.has(imgName)) btn.classList.add("liked");

      btn.addEventListener("click", async () => {
        if (!context.session) { alert("يجب تسجيل الدخول للإعجاب بالصور 🛸"); window.location.href = "auth.html"; return; }
        const isLiked = btn.classList.contains("liked");
        btn.classList.toggle("liked");
        const countSpan = btn.querySelector(".like-count");
        let currentCount = parseInt(countSpan.textContent);

        if (isLiked) {
          countSpan.textContent = currentCount - 1;
          await sb.from("gallery_likes").delete().match({ image_name: imgName, user_id: context.session.user.id });
        } else {
          countSpan.textContent = currentCount + 1;
          await sb.from("gallery_likes").insert([{ image_name: imgName, user_id: context.session.user.id }]);
        }
      });
    });
  }

  async function setupGalleryPage(context) {
    buildGalleryStatic();
    await loadGalleryLikes(context);
  }

  async function loadEventsManagement() {
    const list = q("#eventsManagementList"); if (!list || !sb) return; list.innerHTML = "";
    const { data } = await sb.from("events").select("*").order("id", { ascending: false });
    if (!data || !data.length) { list.appendChild(createEmptyState("لا توجد فعاليات.")); return; }
    data.forEach((item) => {
      const row = document.createElement("div"); row.className = "management-item";
      const meta = document.createElement("div"); meta.className = "meta"; meta.append(makeTextEl("strong", item.title));
      const controls = document.createElement("div"); controls.className = "controls";
      controls.appendChild(createButton("Delete", "danger", async () => {
        if (!confirm("حذف الفعالية؟")) return;
        await sb.from("events").delete().eq("id", item.id); loadEventsManagement();
      }));
      row.append(meta, controls); list.appendChild(row);
    });
  }

  async function loadPendingMemories() {
    const list = q("#pendingMemoriesContainer"); if (!list || !sb) return; list.innerHTML = "";
    const { data } = await sb.from("memories").select("*").eq("is_approved", false).order("id", { ascending: false });
    if (!data || !data.length) { list.appendChild(createEmptyState("لا توجد ذكريات للمراجعة.")); return; }
    data.forEach((memory) => {
      const row = document.createElement("div"); row.className = "table-row";
      const main = document.createElement("div"); main.className = "main";
      main.append(makeTextEl("div", memory.author_name, "title"), makeTextEl("div", memory.memory_text, "sub"));
      const actions = document.createElement("div"); actions.className = "actions";
      actions.appendChild(createButton("Approve", "primary-btn", async () => {
        await sb.from("memories").update({ is_approved: true }).eq("id", memory.id); loadPendingMemories();
      }));
      actions.appendChild(createButton("Delete", "danger", async () => {
        await sb.from("memories").delete().eq("id", memory.id); loadPendingMemories();
      }));
      row.append(main, actions); list.appendChild(row);
    });
  }

  async function loadProfilesManagement() {
    const list = q("#profilesManagementList"); if (!list || !sb) return; list.innerHTML = "";
    const { data } = await sb.from("profiles").select("*").order("created_at", { ascending: false });
    if (!data || !data.length) return;
    data.forEach((profile) => {
      const row = document.createElement("div"); row.className = "table-row";
      const main = document.createElement("div"); main.className = "main"; main.append(makeTextEl("div", profile.full_name || profile.username, "title"));
      const roleSelect = document.createElement("select");
      ["member", "head"].forEach((role) => {
        const option = document.createElement("option"); option.value = role; option.textContent = role === "head" ? "Head" : "Member";
        if (profile.role === role) option.selected = true; roleSelect.appendChild(option);
      });
      const actions = document.createElement("div"); actions.className = "actions"; actions.appendChild(roleSelect);
      actions.appendChild(createButton("Update", "primary-btn", async () => {
        await sb.from("profiles").update({ role: roleSelect.value }).eq("id", profile.id);
      }));
      row.append(main, actions); list.appendChild(row);
    });
  }

  async function guardAdmin(context) {
    if (!context.session) { window.location.href = "auth.html"; return false; }
    if (!isHead(context.role)) { window.location.href = "index.html"; return false; }
    return true;
  }

  async function setupAdminPage(context) {
    const allowed = await guardAdmin(context);
    if (!allowed) return;
    setLoadingState(false); // تم حل المشكلة هنا بشكل جذري!

    q("#settingsForm")?.addEventListener("submit", async (e) => {
      e.preventDefault(); const msgEl = q("#settingsMsg"); setMessage(msgEl, "جاري الحفظ...");
      await sb.from("site_settings").upsert([
        { setting_key: "recruitment_status", setting_value: q("#recruitmentStatus").value },
        { setting_key: "recruitment_link", setting_value: q("#recruitmentLink").value },
        { setting_key: "pr_head_phone", setting_value: q("#prHeadPhone").value },
        { setting_key: "pr_sub_phone", setting_value: q("#prSubPhone").value }
      ], { onConflict: "setting_key" });
      setMessage(msgEl, "تم الحفظ بنجاح.", "success");
    });

    q("#addEventForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      await sb.from("events").insert([{ title: q("#eventTitle").value, description: q("#eventDesc").value, image_url: q("#eventImg").value, action_link: q("#eventLink").value }]);
      q("#addEventForm").reset(); loadEventsManagement();
    });

    const settings = await loadSettings();
    q("#recruitmentStatus").value = getRecruitmentStatusValue(settings);
    q("#recruitmentLink").value = getSetting(settings, "recruitment_link", "");
    q("#prHeadPhone").value = getSetting(settings, "pr_head_phone", "");
    q("#prSubPhone").value = getSetting(settings, "pr_sub_phone", "");

    await Promise.all([loadPendingMemories(), loadEventsManagement(), loadProfilesManagement()]);
  }

  window.addEventListener("DOMContentLoaded", async () => {
    const context = await getCurrentContext();
    renderNav(context);
    setupRoleGateway(context);
    initParticles();
    initAOS();

    if (context.session) {
      if (isHead(context.role) && getActivePath() === "auth.html") window.location.href = "admin.html";
      else if (getActivePath() === "auth.html") window.location.href = "index.html";
    }

    if (q("#signupForm") || q("#loginForm")) setupAuthPage(context);
    if (q("#heroActionBtn") || q("#joinTeamBtn")) await syncRecruitmentOnHome();
    if (q("#eventsGrid")) await loadEventsToGrid();
    if (q("#memoriesGrid")) {
      q("#memoryForm")?.addEventListener("submit", handleMemorySubmit);
      await loadApprovedMemories();
    }
    if (q("#galleryStatic")) await setupGalleryPage(context);
    if (q("#adminContent")) {
      setLoadingState(true);
      await setupAdminPage(context);
    }
  });

  window.handleLogout = handleLogout;
  window.openApplicationForm = function() {
    const state = window.__aliensRecruitmentState || { open: false, recruitmentLink: RECRUITMENT_FALLBACK_LINK };
    if (state.open) openExternal(state.recruitmentLink);
  };
})();