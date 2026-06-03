// 🛸 1. ضع رابط فورم التقديم الخاص بكم هنا بين الأقواس
const googleFormUrl = "https://forms.gle/YourActualGoogleFormLink"; 

// 🔒 2. التحكم الأمني: اجعلها true لفتح التقديم، أو false لقفل التقديم نهائياً عن جميع الزوار
const isRecruitmentOpen = false ; 

function updateRecruitmentState() {
    const joinBtn = document.getElementById('joinTeamBtn');
    const heroBtn = document.getElementById('heroActionBtn');
    const statusMsg = document.getElementById('recruitmentStatusMsg');

    if (isRecruitmentOpen) {
        // حالة التقديم: مفتوح
        joinBtn.disabled = false;
        joinBtn.innerHTML = "Join Our Crew 🛸";
        heroBtn.innerHTML = "Join The Crew";
        heroBtn.href = "#join";
        
        statusMsg.innerText = "🛸 باب التقديم مفتوح الآن! أرسل استمارتك فوراً قبل إغلاق البوابة.";
        statusMsg.style.color = "#39ff14"; // نيون أخضر
    } else {
        // حالة التقديم: مغلق
        joinBtn.disabled = true;
        joinBtn.innerHTML = "Boarding Closed";
        heroBtn.innerHTML = "Application Closed";
        heroBtn.removeAttribute('href');
        
        statusMsg.innerText = "🔒 استمارة التقديم مغلقة حالياً. تابعونا عبر منصاتنا الرسمية لمعرفة موعد الرحلة القادمة!";
        statusMsg.style.color = "#ef4444"; // أحمر تنبيهي
    }
}

function openApplicationForm() {
    if (isRecruitmentOpen) {
        window.open(googleFormUrl, '_blank');
    }
}

// تشغيل التهيئة الذاتية فور فتح الموقع
window.onload = function() {
    updateRecruitmentState();
};
