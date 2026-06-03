// 🛸 1. روابط الاستمارات الفضائية الخاصة بالتيم (املأها بروابط جوجل فورمز الفعلية)
const googleFormUrl = "https://forms.gle/YourActualStudentFormLink"; 
const partnershipFormUrl = "https://forms.gle/YourActualPartnerFormLink";

// 🔒 2. التحكم الأمني المباشر (اجعلها true لفتح التقديم، أو false لقفل تقديم الطلاب فوراً)
const isRecruitmentOpen = false; 

// تهيئة نظام التفاعل والتحكم في بوابات القبول للطلاب
function updateRecruitmentState() {
    const joinBtn = document.getElementById('joinTeamBtn');
    const heroBtn = document.getElementById('heroActionBtn');
    const statusMsg = document.getElementById('recruitmentStatusMsg');

    if (isRecruitmentOpen) {
        joinBtn.disabled = false;
        joinBtn.innerHTML = "Join Our Crew 🛸";
        heroBtn.innerHTML = "Join The Crew";
        heroBtn.href = "#join";
        statusMsg.innerText = "🛸 باب التقديم مفتوح للطلاب الآن! انضم إلينا فوراً.";
        statusMsg.style.color = "#39ff14";
    } else {
        joinBtn.disabled = true;
        joinBtn.innerHTML = "Boarding Closed";
        heroBtn.innerHTML = "Application Closed";
        heroBtn.removeAttribute('href');
        statusMsg.innerText = "🔒 استمارة التقديم مغلقة حالياً. تابعونا للموعد القادم!";
        statusMsg.style.color = "#ef4444";
    }
}

// فتح استمارة الطلاب في نافذة جديدة
function openApplicationForm() {
    if (isRecruitmentOpen) {
        window.open(googleFormUrl, '_blank');
    }
}

// فتح استمارة الرعاة والشراكات المخصصة للشركات
function openPartnershipForm() {
    window.open(partnershipFormUrl, '_blank');
}

// 🌌 3. إعدادات مكتبة النجوم التفاعلية والمتحركة Particles.js
particlesJS("particles-js", {
  "particles": {
    "number": { "value": 100, "density": { "enable": true, "value_area": 800 } },
    "color": { "value": "#ffffff" },
    "shape": { "type": "circle" },
    "opacity": { "value": 0.5, "random": true, "anim": { "enable": true, "speed": 1, "opacity_min": 0.1, "sync": false } },
    "size": { "value": 3, "random": true, "anim": { "enable": false } },
    "line_linked": { "enable": true, "distance": 130, "color": "#39ff14", "opacity": 0.15, "width": 1 },
    "move": { "enable": true, "speed": 1.5, "direction": "none", "random": true, "straight": false, "out_mode": "out", "bounce": false }
  },
  "interactivity": {
    "detect_on": "canvas",
    "events": {
      "onhover": { "enable": true, "mode": "bubble" }, // يجعل النجوم تتفاعل عند مرور الماوس
      "onclick": { "enable": true, "mode": "repulse" }, // تبعد النجوم عن الماوس عند الضغط
      "resize": true
    },
    "modes": {
      "bubble": { "distance": 150, "size": 5, "duration": 2, "opacity": 0.8, "speed": 3 },
      "repulse": { "distance": 200, "duration": 0.4 }
    }
  },
  "retina_detect": true
});

// ⏳ 4. تشغيل وتفعيل جميع التحسينات فور فتح الويبسايت
window.onload = function() {
    updateRecruitmentState();
    
    // تشغيل مكتبة الأنيميشن عند السكرول AOS بالتوقيت الافتراضي
    AOS.init({
        duration: 900,
        once: true // الأنيميشن يعمل مرة واحدة فقط أثناء النزول لراحة العين
    });
};
