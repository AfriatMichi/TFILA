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

  // Remove previous WhatsApp button if exists
  const oldBtn = document.getElementById('whatsapp-share-btn');
  if (oldBtn) oldBtn.remove();

  // Create WhatsApp button
  const btn = document.createElement('button');
  btn.className = 'whatsapp-btn';
  btn.id = 'whatsapp-share-btn';
  btn.title = 'שלח את כל הזמנים בוואטסאפ';
  btn.innerHTML = `
    <svg viewBox="0 0 32 32"><path d="M16 3C9.373 3 4 8.373 4 15c0 2.385.832 4.584 2.236 6.37L4 29l7.824-2.05A12.94 12.94 0 0 0 16 27c6.627 0 12-5.373 12-12S22.627 3 16 3zm0 22c-1.97 0-3.85-.51-5.48-1.48l-.39-.23-4.65 1.22 1.24-4.53-.25-.4A9.93 9.93 0 0 1 6 15c0-5.514 4.486-10 10-10s10 4.486 10 10-4.486 10-10 10zm5.29-7.71c-.29-.15-1.71-.84-1.97-.93-.26-.1-.45-.15-.64.15-.19.29-.74.93-.91 1.12-.17.19-.34.21-.63.07-.29-.15-1.22-.45-2.33-1.43-.86-.77-1.44-1.72-1.61-2.01-.17-.29-.02-.45.13-.6.13-.13.29-.34.43-.51.14-.17.19-.29.29-.48.1-.19.05-.36-.02-.51-.07-.15-.64-1.54-.88-2.11-.23-.56-.47-.48-.64-.49-.16-.01-.36-.01-.56-.01-.19 0-.5.07-.76.36-.26.29-1 1-.99 2.43.01 1.43 1.03 2.81 1.18 3.01.15.19 2.03 3.1 4.93 4.23.69.3 1.23.48 1.65.61.69.22 1.32.19 1.82.12.56-.08 1.71-.7 1.95-1.38.24-.68.24-1.26.17-1.38-.07-.12-.26-.19-.55-.34z"/></svg>
  `;
  btn.onclick = function() {
    const text = formatWhatsappText(shul);
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };
  document.querySelector('.modal-content').appendChild(btn);

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

function formatWhatsappText(shul) {
  let text = `📍 ${shul.name}\n\n`;
  if (shul.prayers && shul.prayers.length) {
    text += '📅 זמני יום חול:\n';
    shul.prayers.forEach(p => {
      text += `• ${p.name}: ${p.time}\n`;
    });
    text += '\n';
  }
  if (shul.shabbatPrayers && shul.shabbatPrayers.length) {
    text += '🕍 זמני שבת:\n';
    shul.shabbatPrayers.forEach(p => {
      text += `• ${p.name}: ${p.time}\n`;
    });
  }
  text += '\nנשלח מאתר בתי הכנסת בניצן\nhttps://tfila.zivart.xyz/';
  return text;
}

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
      // הוספת תפילות שחרית מתפילות החול ביום שישי
      if (shul.prayers) {
        for (const prayer of shul.prayers) {
          if (prayer.name.includes("שחרית")) {
            prayersToShow.push(prayer);
          }
        }
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
  let html = '<div class="upcoming-prayers-title">התפילות הקרובות הבאות </div>';
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
