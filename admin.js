import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getFirestore, collection, getDocs, setDoc, doc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

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
let currentShul = null;

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

function renderShulSelect() {
  const select = document.getElementById('shul-select');
  select.innerHTML = '';
  synagogues.forEach((shul, idx) => {
    const option = document.createElement('option');
    option.value = idx;
    option.textContent = shul.name;
    select.appendChild(option);
  });
  select.onchange = () => {
    currentShul = synagogues[select.value];
    renderPrayerLists();
  };
  // ברירת מחדל: הראשון
  select.value = 0;
  currentShul = synagogues[0];
  renderPrayerLists();
}

function renderPrayerLists() {
  renderPrayerList('weekday-list', currentShul.prayers || [], false);
  renderPrayerList('shabbat-list', currentShul.shabbatPrayers || [], true);
}

function renderPrayerList(elementId, prayers, isShabbat) {
  const list = document.getElementById(elementId);
  list.innerHTML = '';
  prayers.forEach((prayer, idx) => {
    const row = document.createElement('div');
    row.className = 'prayer-row';
    row.innerHTML = `
      <input class="admin-input" type="text" placeholder="שם תפילה" value="${prayer.name}">
      <input class="admin-input" type="time" value="${prayer.time}">
      <button class="move-btn" title="העבר למעלה">▲</button>
      <button class="move-btn" title="העבר למטה">▼</button>
      <button class="remove-btn" title="מחק">✖</button>
    `;
    // מחיקה
    row.querySelector('.remove-btn').onclick = () => {
      prayers.splice(idx, 1);
      renderPrayerLists();
    };
    // עריכה
    row.querySelectorAll('input')[0].oninput = e => { prayer.name = e.target.value; };
    row.querySelectorAll('input')[1].oninput = e => { prayer.time = e.target.value; };
    // העברה למעלה
    row.querySelectorAll('.move-btn')[0].onclick = () => {
      if (idx > 0) {
        [prayers[idx - 1], prayers[idx]] = [prayers[idx], prayers[idx - 1]];
        renderPrayerLists();
      }
    };
    // העברה למטה
    row.querySelectorAll('.move-btn')[1].onclick = () => {
      if (idx < prayers.length - 1) {
        [prayers[idx + 1], prayers[idx]] = [prayers[idx], prayers[idx + 1]];
        renderPrayerLists();
      }
    };
    list.appendChild(row);
  });
}

document.getElementById('add-weekday').onclick = () => {
  currentShul.prayers = currentShul.prayers || [];
  currentShul.prayers.push({ name: '', time: '' });
  renderPrayerLists();
};
document.getElementById('add-shabbat').onclick = () => {
  currentShul.shabbatPrayers = currentShul.shabbatPrayers || [];
  currentShul.shabbatPrayers.push({ name: '', time: '' });
  renderPrayerLists();
};

document.getElementById('save-btn').onclick = async () => {
  const status = document.getElementById('status-msg');
  status.textContent = 'שומר...';
  try {
    // שמור יום חול
    await setDoc(doc(collection(db, "prayers"), `${currentShul.name}-weekday`), {
      synagogue: currentShul.name,
      type: "weekday",
      prayers: currentShul.prayers || []
    });
    // שמור שבת
    await setDoc(doc(collection(db, "prayers"), `${currentShul.name}-shabbat`), {
      synagogue: currentShul.name,
      type: "shabbat",
      prayers: currentShul.shabbatPrayers || []
    });
    status.textContent = 'הזמנים נשמרו בהצלחה!';
  } catch (e) {
    status.textContent = 'שגיאה בשמירה: ' + e.message;
  }
};

// טען הכל בהתחלה
(async function() {
  await loadSynagoguesFromDB();
  renderShulSelect();
})(); 