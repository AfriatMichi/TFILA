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

// פונקציות נגישות
function initializeAccessibility() {
  // ניגודיות גבוהה
  document.getElementById('high-contrast-btn').addEventListener('click', () => {
    document.body.classList.toggle('high-contrast');
    const btn = document.getElementById('high-contrast-btn');
    btn.classList.toggle('active');
    showNotification(btn.classList.contains('active') ? 'ניגודיות גבוהה מופעלת' : 'ניגודיות גבוהה כבויה');
  });

  // גודל טקסט
  document.getElementById('font-size-btn').addEventListener('click', () => {
    document.body.classList.toggle('large-text');
    const btn = document.getElementById('font-size-btn');
    btn.classList.toggle('active');
    showNotification(btn.classList.contains('active') ? 'טקסט מוגדל מופעל' : 'גודל טקסט רגיל');
  });

  // ניווט מקלדת
  document.getElementById('keyboard-nav-btn').addEventListener('click', () => {
    document.body.classList.toggle('keyboard-nav');
    const btn = document.getElementById('keyboard-nav-btn');
    btn.classList.toggle('active');
    showNotification(btn.classList.contains('active') ? 'ניווט מקלדת מופעל' : 'ניווט מקלדת כבוי');
  });

  // ניווט מקלדת
  document.addEventListener('keydown', (e) => {
    if (document.body.classList.contains('keyboard-nav')) {
      const synagogues = document.querySelectorAll('.synagogue');
      const currentIndex = Array.from(synagogues).findIndex(el => el === document.activeElement);
      
      switch(e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          const nextIndex = (currentIndex + 1) % synagogues.length;
          synagogues[nextIndex].focus();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          const prevIndex = currentIndex <= 0 ? synagogues.length - 1 : currentIndex - 1;
          synagogues[prevIndex].focus();
          break;
        case 'Enter':
        case ' ':
          if (document.activeElement.classList.contains('synagogue')) {
            e.preventDefault();
            document.activeElement.click();
          }
          break;
      }
    }
  });
}

function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'accessibility-notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
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
  });
  synagogues = Object.values(temp);
}

async function main() {
  await loadSynagoguesFromDB();
  renderSynagogueGrid();
  renderUpcomingPrayers();
  initializeAccessibility();
}

// --- Synagogue Grid and Modal Logic ---
function renderSynagogueGrid() {
  const grid = document.getElementById('synagogue-grid');
  grid.innerHTML = '';
  synagogues.forEach((shul, idx) => {
    const div = document.createElement('div');
    div.className = 'synagogue';
    div.tabIndex = 0;
    div.setAttribute('role', 'button');
    div.setAttribute('aria-label', `בית כנסת ${shul.name}, לחץ לפתיחת זמני תפילות`);
    div.innerHTML = `<div class='synagogue-icon'>${shul.icon}</div><div>${shul.name}</div>`;
    div.addEventListener('click', () => openModal(idx));
    div.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
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
}

document.getElementById('close-modal').onclick = function() {
  document.getElementById('modal').classList.add('hidden');
};

document.getElementById('modal').onclick = function(e) {
  if (e.target === this) {
    document.getElementById('modal').classList.add('hidden');
  }
};

// --- Upcoming Prayers Logic ---
function getUpcomingPrayers() {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  let allPrayers = [];
  synagogues.forEach(shul => {
    (shul.prayers || []).forEach(prayer => {
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
  let html = '<div class="upcoming-prayers-title">התפילות הקרובות הבאות</div>';
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