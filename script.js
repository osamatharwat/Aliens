
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
    comments: null,
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
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
      window.supabaseClient = client;
      return client;
    } catch (error) {
      console.error("Supabase init failed:", error);
      return null;
    }
  }

  const sb = initSupabase();
  window.supabaseClient = sb;
  window.supabase = window.supabase || {};

  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const pageName = () => document.body?.dataset?.page || document.body?.className || "page";

  function escapeText(value) {
    return value == null ? "" : String(value);
  }

  function formatDate(value) {
    if (!value) return "بدون تاريخ";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "بدون تاريخ";
    return new Intl.DateTimeFormat("ar-EG", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
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
      if (!["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol)) return;
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
    if (error) {
      console.warn("Profile lookup error:", error.message);
      return null;
    }
    return data || null;
  }

  async function getCurrentContext() {
    if (CACHE.session || CACHE.profile || CACHE.role) {
      return {
        session: CACHE.session,
        profile: CACHE.profile,
        role: CACHE.role || (CACHE.profile?.role || null)
      };
    }
    const session = await getSession();
    CACHE.session = session;
    if (!session) {
      CACHE.profile = null;
      CACHE.role = null;
      return { session: null, profile: null, role: null };
    }
    const profile = await getProfile(session.user.id);
    CACHE.profile = profile;
    CACHE.role = profile?.role || null;
    return { session, profile, role: CACHE.role };
  }

  function isHead(role) {
    return String(role || "").toLowerCase() === "head";
  }

  function isMember(role) {
    const r = String(role || "").toLowerCase();
    return r === "member" || r === "head";
  }

  function getRecruitmentStatusValue(settingsMap) {
    const raw = String(settingsMap.get("recruitment_status") || "").trim().toLowerCase();
    if (!raw) return "close";
    if (["open", "opened", "opening", "1", "true", "yes", "on"].some((v) => raw === v || raw.startsWith(v))) return "open";
    return "close";
  }

  function getSetting(settingsMap, key, fallback = "") {
    return settingsMap.has(key) ? settingsMap.get(key) : fallback;
  }

  async function loadSettings() {
    if (!sb) return new Map();
    if (CACHE.settings) return CACHE.settings;
    const { data, error } = await sb.from("site_settings").select("setting_key, setting_value");
    if (error) {
      console.warn("Settings load error:", error.message);
      CACHE.settings = new Map();
      return CACHE.settings;
    }
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
        a.href = item.href;
        a.className = "nav-link";
        a.textContent = item.label;
        if (currentPath === item.href) a.classList.add("active");
        linksRoot.appendChild(a);
      });
      if (session) {
        const chip = document.createElement("span");
        chip.className = "user-chip";
        const roleLabel = isHead(role) ? "Head" : "Member";
        chip.textContent = `${context.profile?.full_name || session.user.email || "User"} · ${roleLabel}`;
        linksRoot.appendChild(chip);
      }
    }

    if (actionsRoot) {
      actionsRoot.innerHTML = "";
      if (session) {
        const logoutBtn = document.createElement("button");
        logoutBtn.type = "button";
        logoutBtn.className = "nav-btn danger";
        logoutBtn.textContent = "Logout";
        logoutBtn.addEventListener("click", handleLogout);
        actionsRoot.appendChild(logoutBtn);
      } else {
        const loginBtn = document.createElement("a");
        loginBtn.href = "auth.html";
        loginBtn.className = "nav-btn ghost";
        loginBtn.textContent = "Login";
        actionsRoot.appendChild(loginBtn);
      }
    }

    const loginNav = q("[data-nav-login]");
    const logoutNav = q("[data-nav-logout]");
    const dashboardNav = q("[data-nav-dashboard]");
    const memoriesNav = q("[data-nav-memories]");
    const joinNav = q("[data-nav-join]");

    if (loginNav) loginNav.classList.toggle("hidden", !!session);
    if (logoutNav) logoutNav.classList.toggle("hidden", !session);
    if (dashboardNav) dashboardNav.classList.toggle("hidden", !isHead(role));
    if (memoriesNav) memoriesNav.classList.toggle("hidden", !isMember(role));
    if (joinNav) joinNav.classList.toggle("hidden", false);
  }

  async function handleLogout() {
    localStorage.removeItem(GUEST_ROLE_KEY);
    CACHE.session = null;
    CACHE.profile = null;
    CACHE.role = null;
    if (sb) await sb.auth.signOut();
    window.location.href = "index.html";
  }

  function initParticles() {
    const container = document.getElementById("particles-js");
    if (!container || typeof window.particlesJS !== "function") return;
    const mobile = window.matchMedia("(max-width: 640px)").matches;
    window.particlesJS("particles-js", {
      particles: {
        number: { value: mobile ? 42 : 88, density: { enable: true, value_area: 800 } },
        color: { value: "#ffffff" },
        shape: { type: "circle" },
        opacity: { value: 0.55, random: true },
        size: { value: mobile ? 2.2 : 3, random: true },
        line_linked: { enable: true, distance: mobile ? 110 : 145, color: "#39ff14", opacity: 0.16, width: 1 },
        move: { enable: true, speed: mobile ? 1 : 1.4, direction: "none", random: true, straight: false, out_mode: "out", bounce: false }
      },
      interactivity: {
        detect_on: "canvas",
        events: {
          onhover: { enable: !mobile, mode: "bubble" },
          onclick: { enable: true, mode: "repulse" },
          resize: true
        },
        modes: {
          bubble: { distance: 170, size: 5, duration: 2, opacity: 0.8 },
          repulse: { distance: 220, duration: 0.4 }
        }
      },
      retina_detect: true
    });
  }

  function initAOS() {
    if (typeof window.AOS === "undefined") return;
    window.AOS.init({ duration: 850, once: true, offset: 40 });
  }

  function htmlToFragment(nodes) {
    const frag = document.createDocumentFragment();
    nodes.forEach((node) => frag.appendChild(node));
    return frag;
  }

  function createBadge(text, cls = "") {
    const span = document.createElement("span");
    span.className = `badge ${cls}`.trim();
    span.textContent = text;
    return span;
  }

  function createButton(text, cls, onClick) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `cta-btn ${cls}`.trim();
    btn.textContent = text;
    if (onClick) btn.addEventListener("click", onClick);
    return btn;
  }

  async function syncRecruitmentOnHome() {
    const joinBtn = q("#joinTeamBtn");
    const heroBtn = q("#heroActionBtn");
    const statusMsg = q("#recruitmentStatusMsg");
    const headPhoneWrap = q("#headWhatsAppBtn");
    const subPhoneWrap = q("#subWhatsAppBtn");
    if (!joinBtn && !heroBtn && !statusMsg && !headPhoneWrap && !subPhoneWrap) return;

    const settings = await loadSettings();
    const status = getRecruitmentStatusValue(settings);
    const recruitmentLink = getSetting(settings, "recruitment_link", RECRUITMENT_FALLBACK_LINK);
    const headPhone = getSetting(settings, "pr_head_phone", "");
    const subPhone = getSetting(settings, "pr_sub_phone", "");

    const open = status === "open";
    window.__aliensRecruitmentState = { open, recruitmentLink };
    if (joinBtn) {
      joinBtn.disabled = !open;
      joinBtn.textContent = open ? "Join Our Crew 🛸" : "Boarding Closed";
      joinBtn.onclick = open ? () => openExternal(recruitmentLink) : null;
    }
    if (heroBtn) {
      heroBtn.textContent = open ? "Join The Crew" : "Application Closed";
      heroBtn.classList.toggle("primary-btn", open);
      heroBtn.classList.toggle("secondary-btn", !open);
      if (open) {
        heroBtn.setAttribute("href", recruitmentLink.startsWith("#") ? recruitmentLink : recruitmentLink);
      } else {
        heroBtn.removeAttribute("href");
      }
    }
    if (statusMsg) {
      statusMsg.textContent = open
        ? "🛸 باب التقديم مفتوح الآن. سجّل وانضم إلى الطاقم."
        : "🔒 التقديم مغلق حاليًا. راقبنا لفتح الدفعة التالية.";
      statusMsg.style.color = open ? "var(--accent)" : "#fca5a5";
    }
    if (headPhoneWrap) {
      if (headPhone) {
        headPhoneWrap.href = `https://wa.me/${headPhone.replace(/\D/g, "")}`;
        headPhoneWrap.classList.remove("hidden");
      } else {
        headPhoneWrap.classList.add("hidden");
      }
    }
    if (subPhoneWrap) {
      if (subPhone) {
        subPhoneWrap.href = `https://wa.me/${subPhone.replace(/\D/g, "")}`;
        subPhoneWrap.classList.remove("hidden");
      } else {
        subPhoneWrap.classList.add("hidden");
      }
    }
  }

  function setupRoleGateway(context) {
    const gateway = q("#roleGateway");
    if (!gateway) return;
    if (context.session || localStorage.getItem(GUEST_ROLE_KEY) === "guest") {
      gateway.style.display = "none";
      return;
    }
    gateway.style.display = "flex";
  }

  window.selectRole = function selectRole(role) {
    if (role === "guest") {
      localStorage.setItem(GUEST_ROLE_KEY, "guest");
      const gateway = q("#roleGateway");
      if (gateway) gateway.style.display = "none";
      return;
    }
    sessionStorage.setItem("aliens_entry_role", role);
    window.location.href = "auth.html";
  };

  async function signupHandler(event) {
    event.preventDefault();
    if (!sb) return;
    const msgEl = q("#signupMsg");
    const name = q("#signupName")?.value.trim() || "";
    const username = q("#signupUsername")?.value.trim().toLowerCase() || "";
    const email = q("#signupEmail")?.value.trim() || "";
    const password = q("#signupPassword")?.value || "";

    setMessage(msgEl, "جاري إنشاء الحساب... 🚀");
    if (username.includes(" ")) {
      setMessage(msgEl, "اسم المستخدم لازم يكون بدون مسافات.", "error");
      return;
    }

    const { error } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          username
        }
      }
    });

    if (error) {
      setMessage(msgEl, `حدث خطأ: ${error.message}`, "error");
      return;
    }

    setMessage(msgEl, "تم إرسال رابط التفعيل إلى بريدك. فعّل الحساب ثم ادخل من جديد.", "success");
    q("#signupForm")?.reset();
  }

  async function loginHandler(event) {
    event.preventDefault();
    if (!sb) return;
    const msgEl = q("#loginMsg");
    const loginId = q("#loginId")?.value.trim() || "";
    const password = q("#loginPassword")?.value || "";
    let email = loginId;

    setMessage(msgEl, "جاري التحقق من الحساب...");

    if (!loginId.includes("@")) {
      const { data, error } = await sb.rpc("get_email_by_username", { p_username: loginId.toLowerCase() });
      if (error || !data) {
        setMessage(msgEl, "اسم المستخدم غير موجود.", "error");
        return;
      }
      email = data;
    }

    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      const message = error.message.includes("Email not confirmed")
        ? "لازم تفعّل الحساب من الإيميل أولًا."
        : "بيانات الدخول غير صحيحة.";
      setMessage(msgEl, message, "error");
      return;
    }

    CACHE.session = data.session;
    CACHE.profile = await getProfile(data.user.id);
    CACHE.role = CACHE.profile?.role || null;

    setMessage(msgEl, "تم تسجيل الدخول بنجاح.", "success");
    setTimeout(() => {
      window.location.href = isHead(CACHE.role) ? "admin.html" : "index.html";
    }, 800);
  }

  function setupAuthPage(context) {
    const loginForm = q("#loginForm");
    const signupForm = q("#signupForm");
    const loginTab = q("#loginTabBtn");
    const signupTab = q("#signupTabBtn");

    if (loginTab) loginTab.addEventListener("click", () => switchTab("login"));
    if (signupTab) signupTab.addEventListener("click", () => switchTab("signup"));
    if (loginForm) loginForm.addEventListener("submit", loginHandler);
    if (signupForm) signupForm.addEventListener("submit", signupHandler);

    if (context.session) {
      window.location.href = isHead(context.role) ? "admin.html" : "index.html";
      return;
    }
    const preferred = sessionStorage.getItem("aliens_entry_role");
    if (preferred === "admin") switchTab("login");
    if (preferred === "member") switchTab("login");
    sessionStorage.removeItem("aliens_entry_role");
  }

  window.switchTab = function switchTab(tab) {
    const buttons = qa(".tab-btn");
    const forms = qa(".auth-form");
    buttons.forEach((btn) => btn.classList.remove("active"));
    forms.forEach((form) => form.classList.remove("active-form"));
    if (tab === "signup") {
      q("#signupTabBtn")?.classList.add("active");
      q("#signupForm")?.classList.add("active-form");
    } else {
      q("#loginTabBtn")?.classList.add("active");
      q("#loginForm")?.classList.add("active-form");
    }
  };

  function setLoadingState(enabled) {
    const loader = q("#adminLoader");
    const content = q("#adminContent");
    if (!loader || !content) return;
    loader.classList.toggle("hidden", enabled);
    content.classList.toggle("hidden", !enabled);
  }

  function sanitizeValue(value) {
    return value == null ? "" : String(value);
  }

  function makeTextEl(tag, text, className = "") {
    const el = document.createElement(tag);
    if (className) el.className = className;
    el.textContent = sanitizeValue(text);
    return el;
  }

  function createEmptyState(message) {
    const div = document.createElement("div");
    div.className = "empty-state";
    div.textContent = message;
    return div;
  }

  async function loadEventsToGrid() {
    const grid = q("#eventsGrid");
    if (!grid || !sb) return;
    grid.innerHTML = "";
    const { data, error } = await sb.from("events").select("*").order("id", { ascending: false });
    if (error) {
      grid.appendChild(createEmptyState("تعذر تحميل الفعاليات الآن."));
      return;
    }
    const items = data || [];
    CACHE.events = items;
    if (!items.length) {
      grid.appendChild(createEmptyState("لا توجد فعاليات منشورة حاليًا."));
      return;
    }
    items.forEach((eventItem) => {
      const card = document.createElement("article");
      card.className = "event-card";
      const img = document.createElement("img");
      img.className = "event-cover";
      img.src = sanitizeValue(eventItem.image_url || "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=1200&q=80");
      img.alt = sanitizeValue(eventItem.title || "Event");

      const body = document.createElement("div");
      body.className = "event-card-body";

      const title = makeTextEl("h3", eventItem.title || "فعالية");
      const desc = makeTextEl("p", eventItem.description || "");
      const meta = document.createElement("div");
      meta.className = "event-meta";
      meta.appendChild(createBadge(formatDate(eventItem.created_at), ""));
      if (eventItem.action_link) meta.appendChild(createBadge("اضغط للانضمام", "success"));

      const actions = document.createElement("div");
      actions.className = "event-actions";
      if (eventItem.action_link) {
        const joinBtn = document.createElement("a");
        joinBtn.className = "cta-btn primary-btn";
        joinBtn.href = eventItem.action_link;
        joinBtn.target = "_blank";
        joinBtn.rel = "noopener noreferrer";
        joinBtn.textContent = "Join Now";
        actions.appendChild(joinBtn);
      }
      const copyBtn = createButton("نسخ الرابط", "secondary-btn", async () => {
        if (!eventItem.action_link) return;
        try {
          await navigator.clipboard.writeText(eventItem.action_link);
        } catch {}
      });
      if (eventItem.action_link) actions.appendChild(copyBtn);

      body.append(title, desc, meta, actions);
      card.append(img, body);
      grid.appendChild(card);
    });
  }

  async function loadApprovedMemories() {
    const grid = q("#memoriesGrid");
    if (!grid || !sb) return;
    grid.innerHTML = "";
    const { data, error } = await sb.from("memories").select("*").eq("is_approved", true).order("id", { ascending: false });
    if (error) {
      grid.appendChild(createEmptyState("تعذر تحميل الذكريات الآن."));
      return;
    }
    const items = data || [];
    CACHE.memories = items;
    if (!items.length) {
      grid.appendChild(createEmptyState("لا توجد ذكريات معتمدة بعد."));
      return;
    }
    items.forEach((memory) => {
      const card = document.createElement("article");
      card.className = "memory-card";
      const author = makeTextEl("div", memory.author_name || "عضو", "memory-author");
      const content = makeTextEl("div", memory.memory_text || "", "memory-content");
      const meta = document.createElement("div");
      meta.className = "memory-meta";
      meta.appendChild(createBadge(formatDate(memory.created_at), ""));
      if (memory.user_id) meta.appendChild(createBadge("عضو مسجل", "success"));
      card.append(author, content, meta);
      grid.appendChild(card);
    });
  }

  async function handleMemorySubmit(event) {
    event.preventDefault();
    const msgEl = q("#memoryMsg");
    const textarea = q("#memoryText");
    const submitBtn = q("#submitMemoryBtn");
    if (!sb) return;

    const context = await getCurrentContext();
    if (!context.session) {
      setMessage(msgEl, "لازم تسجل دخول الأول عشان تضيف ذكرى.", "error");
      window.location.href = "auth.html";
      return;
    }

    const text = textarea?.value.trim() || "";
    if (!text) {
      setMessage(msgEl, "اكتب محتوى الذكرى أولًا.", "error");
      return;
    }

    if (submitBtn) submitBtn.disabled = true;
    setMessage(msgEl, "جاري إرسال الذكرى للمراجعة...");

    const authorName = context.profile?.full_name || context.session.user.user_metadata?.full_name || context.session.user.email || "Member";
    const { error } = await sb.from("memories").insert([{
      author_name: authorName,
      memory_text: text,
      is_approved: false,
      user_id: context.session.user.id
    }]);

    if (error) {
      setMessage(msgEl, `حدث خطأ: ${error.message}`, "error");
    } else {
      setMessage(msgEl, "تم إرسال الذكرى للمراجعة بنجاح.", "success");
      if (textarea) textarea.value = "";
    }
    if (submitBtn) submitBtn.disabled = false;
  }

  async function setupMemoriesPage(context) {
    const form = q("#memoryForm");
    const textarea = q("#memoryText");
    const submitBtn = q("#submitMemoryBtn");
    const note = q("#memoryAccessNote");
    if (form) form.addEventListener("submit", handleMemorySubmit);

    if (!context.session) {
      if (textarea) textarea.disabled = true;
      if (submitBtn) submitBtn.disabled = true;
      if (note) note.textContent = "لازم تسجل دخول عشان تبعت ذكرى جديدة.";
    } else if (note) {
      note.textContent = "الذكريات الجديدة بتدخل للمراجعة قبل النشر.";
    }
    await loadApprovedMemories();
  }

  const GALLERY_ITEMS = [
    { key: "job_fair_1.jpg", label: "Job Fair 1" },
    { key: "job_fair_2.jpg", label: "Job Fair 2" },
    { key: "orphanage_1.jpg", label: "Orphanage 1" },
    { key: "orphanage_2.jpg", label: "Orphanage 2" },
    { key: "welcome_1.jpg", label: "Welcome 1" },
    { key: "welcome_2.jpg", label: "Welcome 2" },
    { key: "awareness_1.jpg", label: "Awareness 1" },
    { key: "awareness_2.jpg", label: "Awareness 2" },
    { key: "awareness_3.jpg", label: "Awareness 3" },
    { key: "awareness_4.jpg", label: "Awareness 4" },
    { key: "awareness_5.jpg", label: "Awareness 5" },
    { key: "awareness_6.jpg", label: "Awareness 6" },
    { key: "awareness_7.jpg", label: "Awareness 7" }
  ];

  function buildGalleryStatic() {
    const target = q("#galleryStatic");
    if (!target) return;
    target.innerHTML = "";
    const groups = [
      {
        title: "الملتقى التوظيفي (Job Fair)",
        icon: "fa-briefcase",
        items: [GALLERY_ITEMS[0], GALLERY_ITEMS[1]]
      },
      {
        title: "زيارات دار الأيتام",
        icon: "fa-heart",
        items: [GALLERY_ITEMS[2], GALLERY_ITEMS[3]]
      },
      {
        title: "حفل الاستقبال (Welcome Day)",
        icon: "fa-bullhorn",
        items: [GALLERY_ITEMS[4], GALLERY_ITEMS[5]]
      },
      {
        title: "حملات التوعية",
        icon: "fa-kit-medical",
        items: GALLERY_ITEMS.slice(6)
      }
    ];

    groups.forEach((group) => {
      const subtitle = document.createElement("h3");
      subtitle.className = "gallery-subtitle";
      subtitle.innerHTML = `<i class="fa-solid ${group.icon}"></i> ${group.title}`;

      const grid = document.createElement("div");
      grid.className = "gallery-fluid-grid";

      group.items.forEach((item) => {
        const wrap = document.createElement("div");
        wrap.className = "gallery-fluid-item";
        const img = document.createElement("img");
        img.src = item.key;
        img.alt = item.label;
        const caption = document.createElement("div");
        caption.className = "img-caption";
        caption.textContent = item.label;
        wrap.append(img, caption);
        grid.appendChild(wrap);
      });
      target.append(subtitle, grid);
    });
  }

  async function loadGalleryComments() {
    const grid = q("#galleryCommentsGrid");
    const filter = q("#galleryCommentFilter");
    const imageSelect = q("#galleryImageName");
    if (!grid || !sb) return;
    grid.innerHTML = "";

    if (imageSelect) {
      imageSelect.innerHTML = "";
      GALLERY_ITEMS.forEach((item) => {
        const option = document.createElement("option");
        option.value = item.label;
        option.textContent = item.label;
        imageSelect.appendChild(option);
      });
    }

    const selectedImage = filter?.value || "";
    let query = sb.from("gallery_comments").select("*").order("id", { ascending: false });
    if (selectedImage) query = query.eq("image_name", selectedImage);
    const { data, error } = await query;
    if (error) {
      grid.appendChild(createEmptyState("تعذر تحميل التعليقات الآن."));
      return;
    }
    const items = data || [];
    CACHE.comments = items;
    if (!items.length) {
      grid.appendChild(createEmptyState("لا توجد تعليقات على الصور حتى الآن."));
      return;
    }
    items.forEach((comment) => {
      const card = document.createElement("article");
      card.className = "comment-card";
      const image = makeTextEl("div", comment.image_name || "صورة", "comment-image");
      const text = makeTextEl("p", comment.comment_text || "");
      const meta = document.createElement("div");
      meta.className = "comment-meta";
      meta.appendChild(createBadge(comment.user_name || "Guest", "success"));
      meta.appendChild(createBadge(formatDate(comment.created_at), ""));
      card.append(image, text, meta);
      grid.appendChild(card);
    });
  }

  async function handleGalleryCommentSubmit(event) {
    event.preventDefault();
    const msgEl = q("#galleryCommentMsg");
    const textEl = q("#galleryCommentText");
    const imageEl = q("#galleryImageName");
    const submitBtn = q("#submitGalleryCommentBtn");
    if (!sb) return;

    const context = await getCurrentContext();
    if (!context.session) {
      setMessage(msgEl, "لازم تسجل دخول الأول.", "error");
      window.location.href = "auth.html";
      return;
    }

    const commentText = textEl?.value.trim() || "";
    const imageName = imageEl?.value || "";
    if (!commentText || !imageName) {
      setMessage(msgEl, "اكتب تعليقك واختار الصورة.", "error");
      return;
    }

    if (submitBtn) submitBtn.disabled = true;
    setMessage(msgEl, "جاري حفظ التعليق...");

    const userName = context.profile?.full_name || context.session.user.user_metadata?.full_name || context.session.user.email || "Member";
    const { error } = await sb.from("gallery_comments").insert([{
      image_name: imageName,
      user_name: userName,
      user_id: context.session.user.id,
      comment_text: commentText
    }]);

    if (error) {
      setMessage(msgEl, `حدث خطأ: ${error.message}`, "error");
    } else {
      setMessage(msgEl, "تم نشر التعليق.", "success");
      if (textEl) textEl.value = "";
      await loadGalleryComments();
    }
    if (submitBtn) submitBtn.disabled = false;
  }

  async function setupGalleryPage(context) {
    buildGalleryStatic();
    const form = q("#galleryCommentForm");
    const filter = q("#galleryCommentFilter");
    if (form) form.addEventListener("submit", handleGalleryCommentSubmit);
    if (filter) filter.addEventListener("change", loadGalleryComments);
    const commentNote = q("#galleryAccessNote");
    const commentText = q("#galleryCommentText");
    const imageSelect = q("#galleryImageName");
    const submitBtn = q("#submitGalleryCommentBtn");
    if (!context.session) {
      if (commentText) commentText.disabled = true;
      if (imageSelect) imageSelect.disabled = true;
      if (submitBtn) submitBtn.disabled = true;
      if (commentNote) commentNote.textContent = "سجّل دخولك عشان تضيف تعليق.";
    }
    await loadGalleryComments();
  }

  async function loadEventsManagement() {
    const list = q("#eventsManagementList");
    if (!list || !sb) return;
    list.innerHTML = "";
    const { data, error } = await sb.from("events").select("*").order("id", { ascending: false });
    if (error) {
      list.appendChild(createEmptyState("تعذر تحميل الفعاليات."));
      return;
    }
    const items = data || [];
    if (!items.length) {
      list.appendChild(createEmptyState("لا توجد فعاليات بعد."));
      return;
    }
    items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "management-item";
      const meta = document.createElement("div");
      meta.className = "meta";
      const title = makeTextEl("strong", item.title || "فعالية");
      const desc = makeTextEl("span", item.description || "");
      meta.append(title, desc);

      const controls = document.createElement("div");
      controls.className = "controls";
      const link = item.action_link || "";
      if (link) {
        const copy = createButton("Copy Link", "secondary-btn", async () => {
          try { await navigator.clipboard.writeText(link); } catch {}
        });
        controls.appendChild(copy);
      }
      const del = createButton("Delete", "danger", async () => {
        if (!confirm("حذف الفعالية؟")) return;
        const { error } = await sb.from("events").delete().eq("id", item.id);
        if (!error) await loadEventsManagement();
      });
      controls.appendChild(del);
      row.append(meta, controls);
      list.appendChild(row);
    });
  }

  async function loadPendingMemories() {
    const list = q("#pendingMemoriesContainer");
    if (!list || !sb) return;
    list.innerHTML = "";
    const { data, error } = await sb.from("memories").select("*").eq("is_approved", false).order("id", { ascending: false });
    if (error) {
      list.appendChild(createEmptyState("تعذر تحميل الذكريات قيد المراجعة."));
      return;
    }
    const items = data || [];
    if (!items.length) {
      list.appendChild(createEmptyState("لا توجد ذكريات قيد المراجعة."));
      return;
    }
    items.forEach((memory) => {
      const row = document.createElement("div");
      row.className = "table-row";
      const main = document.createElement("div");
      main.className = "main";
      main.appendChild(makeTextEl("div", memory.author_name || "عضو", "title"));
      main.appendChild(makeTextEl("div", memory.memory_text || "", "sub"));
      main.appendChild(makeTextEl("div", formatDate(memory.created_at), "sub"));

      const actions = document.createElement("div");
      actions.className = "actions";
      actions.appendChild(createButton("Approve", "primary-btn", async () => {
        const { error } = await sb.from("memories").update({ is_approved: true }).eq("id", memory.id);
        if (!error) await loadPendingMemories();
      }));
      actions.appendChild(createButton("Delete", "danger", async () => {
        if (!confirm("حذف الذكرى؟")) return;
        const { error } = await sb.from("memories").delete().eq("id", memory.id);
        if (!error) await loadPendingMemories();
      }));
      row.append(main, actions);
      list.appendChild(row);
    });
  }

  async function loadGalleryCommentsAdmin() {
    const list = q("#commentsManagementList");
    if (!list || !sb) return;
    list.innerHTML = "";
    const { data, error } = await sb.from("gallery_comments").select("*").order("id", { ascending: false });
    if (error) {
      list.appendChild(createEmptyState("تعذر تحميل تعليقات المعرض."));
      return;
    }
    const items = data || [];
    if (!items.length) {
      list.appendChild(createEmptyState("لا توجد تعليقات بعد."));
      return;
    }
    items.forEach((comment) => {
      const row = document.createElement("div");
      row.className = "table-row";
      const main = document.createElement("div");
      main.className = "main";
      main.appendChild(makeTextEl("div", `${comment.user_name || "Member"} · ${comment.image_name || "Image"}`, "title"));
      main.appendChild(makeTextEl("div", comment.comment_text || "", "sub"));
      main.appendChild(makeTextEl("div", formatDate(comment.created_at), "sub"));

      const actions = document.createElement("div");
      actions.className = "actions";
      actions.appendChild(createButton("Delete", "danger", async () => {
        if (!confirm("حذف التعليق؟")) return;
        const { error } = await sb.from("gallery_comments").delete().eq("id", comment.id);
        if (!error) await loadGalleryCommentsAdmin();
      }));
      row.append(main, actions);
      list.appendChild(row);
    });
  }

  async function loadProfilesManagement() {
    const list = q("#profilesManagementList");
    if (!list || !sb) return;
    list.innerHTML = "";
    const { data, error } = await sb.from("profiles").select("*").order("created_at", { ascending: false });
    if (error) {
      list.appendChild(createEmptyState("تعذر تحميل المستخدمين."));
      return;
    }
    const items = data || [];
    if (!items.length) {
      list.appendChild(createEmptyState("لا توجد ملفات مستخدمين بعد."));
      return;
    }
    items.forEach((profile) => {
      const row = document.createElement("div");
      row.className = "table-row";
      const main = document.createElement("div");
      main.className = "main";
      main.appendChild(makeTextEl("div", profile.full_name || profile.username || profile.id, "title"));
      main.appendChild(makeTextEl("div", `@${profile.username || "no-username"}`, "sub"));
      main.appendChild(makeTextEl("div", formatDate(profile.created_at), "sub"));

      const roleSelect = document.createElement("select");
      ["member", "head"].forEach((role) => {
        const option = document.createElement("option");
        option.value = role;
        option.textContent = role === "head" ? "Head" : "Member";
        if ((profile.role || "member") === role) option.selected = true;
        roleSelect.appendChild(option);
      });

      const actions = document.createElement("div");
      actions.className = "actions";
      actions.appendChild(roleSelect);
      actions.appendChild(createButton("Update", "primary-btn", async () => {
        const { error } = await sb.from("profiles").update({ role: roleSelect.value }).eq("id", profile.id);
        if (!error) await loadProfilesManagement();
      }));
      row.append(main, actions);
      list.appendChild(row);
    });
  }

  async function loadAdminSettings() {
    const settings = await loadSettings();
    const setVal = (id, value) => {
      const el = q(id);
      if (el) el.value = value || "";
    };
    setVal("#recruitmentStatus", getRecruitmentStatusValue(settings));
    setVal("#recruitmentLink", getSetting(settings, "recruitment_link", ""));
    setVal("#prHeadPhone", getSetting(settings, "pr_head_phone", ""));
    setVal("#prSubPhone", getSetting(settings, "pr_sub_phone", ""));
  }

  async function saveSettings(event) {
    event.preventDefault();
    if (!sb) return;
    const msgEl = q("#settingsMsg");
    setMessage(msgEl, "جاري الحفظ...");
    const values = [
      ["recruitment_status", q("#recruitmentStatus")?.value || "close"],
      ["recruitment_link", q("#recruitmentLink")?.value || ""],
      ["pr_head_phone", q("#prHeadPhone")?.value || ""],
      ["pr_sub_phone", q("#prSubPhone")?.value || ""]
    ];
    const payload = values.map(([setting_key, setting_value]) => ({
      setting_key,
      setting_value
    }));
    const { error } = await sb.from("site_settings").upsert(payload, { onConflict: "setting_key" });
    if (error) {
      setMessage(msgEl, `حدث خطأ: ${error.message}`, "error");
    } else {
      CACHE.settings = null;
      setMessage(msgEl, "تم حفظ الإعدادات بنجاح.", "success");
      await syncRecruitmentOnHome();
    }
  }

  async function addEvent(event) {
    event.preventDefault();
    if (!sb) return;
    const msgEl = q("#eventMsg");
    setMessage(msgEl, "جاري نشر الفعالية...");
    const payload = {
      title: q("#eventTitle")?.value.trim() || "",
      description: q("#eventDesc")?.value.trim() || "",
      image_url: q("#eventImg")?.value.trim() || "",
      action_link: q("#eventLink")?.value.trim() || ""
    };
    const { error } = await sb.from("events").insert([payload]);
    if (error) {
      setMessage(msgEl, `حدث خطأ: ${error.message}`, "error");
      return;
    }
    setMessage(msgEl, "تم نشر الفعالية بنجاح.", "success");
    q("#addEventForm")?.reset();
    await loadEventsManagement();
    await loadEventsToGrid();
  }

  async function guardAdmin(context) {
    if (!context.session) {
      window.location.href = "auth.html";
      return false;
    }
    if (!isHead(context.role)) {
      window.location.href = "index.html";
      return false;
    }
    return true;
  }

  async function setupAdminPage(context) {
    const allowed = await guardAdmin(context);
    if (!allowed) return;
    setLoadingState(false);
    const settingsForm = q("#settingsForm");
    if (settingsForm) settingsForm.addEventListener("submit", saveSettings);
    const addEventForm = q("#addEventForm");
    if (addEventForm) addEventForm.addEventListener("submit", addEvent);
    await loadAdminSettings();
    await Promise.all([
      loadPendingMemories(),
      loadEventsManagement(),
      loadGalleryCommentsAdmin(),
      loadProfilesManagement()
    ]);
  }

  async function initLoggedInRedirect(context) {
    if (context.session) {
      if (isHead(context.role) && getActivePath() === "auth.html") {
        window.location.href = "admin.html";
      } else if (getActivePath() === "auth.html") {
        window.location.href = "index.html";
      }
    }
  }

  window.addEventListener("DOMContentLoaded", async () => {
    const context = await getCurrentContext();
    renderNav(context);
    setupRoleGateway(context);
    initParticles();
    initAOS();
    await initLoggedInRedirect(context);

    const bodyPage = pageName();
    if (document.getElementById("signupForm") || document.getElementById("loginForm")) {
      setupAuthPage(context);
    }
    if (document.getElementById("heroActionBtn") || document.getElementById("joinTeamBtn")) {
      await syncRecruitmentOnHome();
    }
    if (document.getElementById("eventsGrid")) {
      await loadEventsToGrid();
    }
    if (document.getElementById("memoriesGrid")) {
      await setupMemoriesPage(context);
    }
    if (document.getElementById("galleryStatic")) {
      await setupGalleryPage(context);
    }
    if (document.getElementById("adminContent")) {
      setLoadingState(true);
      await setupAdminPage(context);
    }
  });

  window.handleLogout = handleLogout;
  window.openApplicationForm = function openApplicationForm() {
    const state = window.__aliensRecruitmentState || { open: false, recruitmentLink: RECRUITMENT_FALLBACK_LINK };
    if (!state.open) return;
    openExternal(state.recruitmentLink || RECRUITMENT_FALLBACK_LINK);
  };
})();
