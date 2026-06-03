const googleFormUrl = "https://forms.gle/YourActualStudentFormLink"; 
const isRecruitmentOpen = false; 

function updateRecruitmentState() {
    const joinBtn = document.getElementById('joinTeamBtn');
    const heroBtn = document.getElementById('heroActionBtn');
    const statusMsg = document.getElementById('recruitmentStatusMsg');

    // التأكد من وجود الزرار في الصفحة الحالية لتفادي الأخطاء البرمجية
    if (joinBtn && heroBtn && statusMsg) {
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
}

function openApplicationForm() {
    if (isRecruitmentOpen) {
        window.open(googleFormUrl, '_blank');
    }
}

// إعدادات النجوم الفضائية (مجهزة بخطوط توصيل نيون خضراء)
particlesJS("particles-js", {
  "particles": {
    "number": { "value": 90, "density": { "enable": true, "value_area": 800 } },
    "color": { "value": "#ffffff" },
    "shape": { "type": "circle" },
    "opacity": { "value": 0.6, "random": true, "anim": { "enable": true, "speed": 1, "opacity_min": 0.1, "sync": false } },
    "size": { "value": 3, "random": true, "anim": { "enable": false } },
    "line_linked": { "enable": true, "distance": 140, "color": "#39ff14", "opacity": 0.2, "width": 1 },
    "move": { "enable": true, "speed": 1.5, "direction": "none", "random": true, "straight": false, "out_mode": "out", "bounce": false }
  },
  "interactivity": {
    "detect_on": "canvas",
    "events": {
      "onhover": { "enable": true, "mode": "bubble" },
      "onclick": { "enable": true, "mode": "repulse" },
      "resize": true
    },
    "modes": {
      "bubble": { "distance": 180, "size": 6, "duration": 2, "opacity": 0.9, "speed": 3 },
      "repulse": { "distance": 250, "duration": 0.4 }
    }
  },
  "retina_detect": true
});

window.onload = function() {
    updateRecruitmentState();
    AOS.init({ duration: 800, once: true });
};