import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA_4RAbPHGRut7kLK5TorqBkGbUIg1qfiI",
  authDomain: "tfila-772ad.firebaseapp.com",
  projectId: "tfila-772ad",
  storageBucket: "tfila-772ad.firebasestorage.app",
  messagingSenderId: "1041334561919",
  appId: "1:1041334561919:web:c5222a28a5de705439a34a"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let synagogues = [];
let deferredPrompt;
const addBtn = document.getElementById('add-to-home');
if (addBtn) addBtn.style.display = 'none';

// שליטה על הצגת הודעת האזהרה בראש הדף
const SHOW_ALERT_BAR = false; // שנה ל-false כדי להסתיר את ההודעה
if (!SHOW_ALERT_BAR) {
  const alertBar = document.getElementById('alert-bar');
  if (alertBar) alertBar.style.display = 'none';
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (addBtn) addBtn.style.display = 'flex';
});

if (addBtn) {
  addBtn.addEventListener('click', () => {
    addBtn.style.display = 'none';
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => {
        deferredPrompt = null;
      });
    }
  });
}

async function loadSynagoguesFromDB() {
  const prayersSnap = await getDocs(collection(db, "prayers"));
  const temp = {};
  prayersSnap.forEach(docSnap => {
    const data = docSnap.data();
    if (!temp[data.synagogue]) {
      temp[data.synagogue] = { name: data.synagogue, icon: "\uD83C\uDFE0" };
    }
    if (data.type === "weekday") {
      temp[data.synagogue].prayers = data.prayers;
    } else if (data.type === "shabbat") {
      temp[data.synagogue].shabbatPrayers = data.prayers;
    }
    // שמור את ערך hidden אם קיים
    if (typeof data.hidden !== 'undefined') {
      temp[data.synagogue].hidden = data.hidden;
    }
  });
  // סנן בתי כנסת מוסתרים
  synagogues = Object.values(temp).filter(shul => !shul.hidden);
}

async function main() {
  await loadSynagoguesFromDB();
  renderSynagogueGrid();
  renderUpcomingPrayers();
}

// --- Synagogue Grid and Modal Logic ---
function renderSynagogueGrid() {
  const grid = document.getElementById('synagogue-grid');
  grid.innerHTML = '';
  synagogues.forEach((shul, idx) => {
    const div = document.createElement('div');
    div.className = 'synagogue';
    div.innerHTML = `<div class='synagogue-icon'>${shul.icon}</div><div>${shul.name}</div>`;
    
    // משתנים לזיהוי swipe
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let isScrolling = false;
    
    // מניעת קליקים לא רצויים
    let clickTimeout = null;
    
    // אירועי מגע למובייל
    div.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
      isScrolling = false;
      
      // בטל קליקים קודמים
      if (clickTimeout) {
        clearTimeout(clickTimeout);
        clickTimeout = null;
      }
    }, { passive: true });
    
    div.addEventListener('touchmove', (e) => {
      const deltaX = Math.abs(e.touches[0].clientX - touchStartX);
      const deltaY = Math.abs(e.touches[0].clientY - touchStartY);
      
      // אם יש תזוזה משמעותית, זה scroll
      if (deltaX > 5 || deltaY > 5) {
        isScrolling = true;
      }
    }, { passive: true });
    
    div.addEventListener('touchend', (e) => {
      const touchEndTime = Date.now();
      const touchDuration = touchEndTime - touchStartTime;
      
      // רק אם זה לא scroll והמגע היה קצר
      if (!isScrolling && touchDuration < 300) {
        clickTimeout = setTimeout(() => {
          openModal(idx);
        }, 50);
      }
    }, { passive: true });
    
    // אירוע קליק למחשב
    div.addEventListener('click', (e) => {
      // רק אם זה לא מכשיר מגע
      if (!('ontouchstart' in window)) {
        openModal(idx);
      }
    });
    
    grid.appendChild(div);
  });
}

function openModal(idx) {
  const shul = synagogues[idx];
  document.getElementById('modal-title').textContent = shul.name;
  const timesDiv = document.getElementById('prayer-times');
  // Add tab buttons
  timesDiv.innerHTML = `
    <div class="tabs">
      <button id="tab-weekday" class="tab-btn active">זמני יום חול</button>
      <button id="tab-shabbat" class="tab-btn">זמני שבת</button>
    </div>
    <div id="tab-content"></div>
  `;
  function renderTab(tab) {
    const contentDiv = document.getElementById('tab-content');
    if (tab === 'weekday') {
      contentDiv.innerHTML = (shul.prayers || []).map(p => `<div><b>${p.name}:</b> ${p.time}</div>`).join('');
      document.getElementById('tab-weekday').classList.add('active');
      document.getElementById('tab-shabbat').classList.remove('active');
    } else {
      contentDiv.innerHTML = (shul.shabbatPrayers || []).map(p => `<div><b>${p.name}:</b> ${p.time}</div>`).join('');
      document.getElementById('tab-weekday').classList.remove('active');
      document.getElementById('tab-shabbat').classList.add('active');
    }
  }
  setTimeout(() => {
    document.getElementById('tab-weekday').onclick = () => renderTab('weekday');
    document.getElementById('tab-shabbat').onclick = () => renderTab('shabbat');
  }, 0);
  renderTab('weekday');
  document.getElementById('modal').classList.remove('hidden');
  
  // מניעת scroll על הגוף כשהמודל פתוח
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
  // החזרת scroll לגוף
  document.body.style.overflow = '';
}

document.getElementById('close-modal').onclick = closeModal;

document.getElementById('modal').onclick = function(e) {
  if (e.target === this) {
    closeModal();
  }
};

// --- Upcoming Prayers Logic ---
function getUpcomingPrayers() {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  let allPrayers = [];
  const isFriday = now.getDay() === 5;

  synagogues.forEach(shul => {
    let prayersToShow = [];
    if (isFriday && shul.shabbatPrayers) {
      // עד (ולא כולל) שחרית שבת
      for (const prayer of shul.shabbatPrayers) {
        if (prayer.name.includes("שחרית")) break;
        prayersToShow.push(prayer);
      }
    } else {
      prayersToShow = shul.prayers || [];
    }
    prayersToShow.forEach(prayer => {
      const [h, m] = prayer.time.split(":").map(Number);
      const prayerMinutes = h * 60 + m;
      if (prayerMinutes >= nowMinutes) {
        allPrayers.push({
          shul: shul.name,
          type: prayer.name,
          time: prayer.time
        });
      }
    });
  });
  allPrayers.sort((a, b) => a.time.localeCompare(b.time));
  return allPrayers.slice(0, 4);
}

function renderUpcomingPrayers() {
  const container = document.getElementById('upcoming-prayers');
  const prayers = getUpcomingPrayers();
  let html = '<div class="upcoming-prayers-title">התפילות הקרובות הבאות א-ה</div>';
  if (prayers.length === 0) {
    html += '<div>אין תפילות קרובות להיום.</div>';
  } else {
    prayers.forEach(p => {
      html += `<div class="upcoming-prayer-item"><span class="upcoming-prayer-shul">${p.shul}</span> <span class="upcoming-prayer-type">${p.type}</span> <span class="upcoming-prayer-time">${p.time}</span></div>`;
    });
  }
  container.innerHTML = html;
}

main();

// Update on load and every minute
renderUpcomingPrayers();
setInterval(renderUpcomingPrayers, 60000);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js');
  });
} 
