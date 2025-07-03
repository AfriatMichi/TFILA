import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getFirestore, collection, getDocs, setDoc, doc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

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
const auth = getAuth(app);
const GABBAI_UID = 'ifLRL99dWkY9TWKK434YbUijo8J2';
const ADMIN_UID = "TXVzrFp1XATThDohNTJuhaF8Gpq1";

// === BEGIN: User to Synagogue Mapping ===
const USER_SHUL_MAP = {
  "8dXkthaPyqMe0IPoGd79KRUATlx2": "בית כנסת מקדש מעט",
  "RgBK2SasA5PkQzcCiU4prLlUcuq2": "בית כנסת מרכזי",
  "pDcahFE9xIVmdtLUDB4paTQ62Jg1": "בית כנסת נווה רחמים",
  "ATNGUgYA7FXTel4A6wEJ3YfR1053": "בית כנסת ניסנית",
  "zjl2Q0EqwESmq1b5xfwmjy1M0YI2": "בית כנסת כלל ישראל",
  "gjVVlyz37fdM8vyvs767Yej1olx1": "בית כנסת נווה שלום",
  "nVtB2g34QyOSsX77OL4TsRJ8gqN2": "בית הכנסת הכורכרי",
  "NRr2yeX1SKdLa8WJBq8usgjhUlZ2": "בית הכנסת היכלא דרבנו יורם"
};
// === END: User to Synagogue Mapping ===

onAuthStateChanged(auth, (user) => {
  if (user && (USER_SHUL_MAP[user.uid] || user.uid === ADMIN_UID)) {
    document.getElementById('loading-msg').style.display = 'none';
    document.getElementById('admin-content').style.display = 'block';
    initializeAppLogic(user.uid);
  } else {
    window.location.replace('login.html');
  }
});

function initializeAppLogic(userUid) {
  let synagogues = [];
  let currentShul = null;
  let userShulName = USER_SHUL_MAP[userUid];
  const isAdmin = userUid === ADMIN_UID;

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
    if (isAdmin) {
      // הצג את תיבת הבחירה הרגילה
      const select = document.getElementById('shul-select');
      select.innerHTML = '';
      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = 'בחר בית כנסת';
      select.appendChild(defaultOption);
      synagogues.forEach((shul, idx) => {
        const option = document.createElement('option');
        option.value = idx;
        option.textContent = shul.name;
        select.appendChild(option);
      });
      select.value = '';
      select.onchange = () => {
        if (select.value !== '') {
          currentShul = synagogues[select.value];
          renderPrayerLists();
          setShulNameDisplay(currentShul.name);
        } else {
          currentShul = null;
          document.getElementById('weekday-list').innerHTML = '';
          document.getElementById('shabbat-list').innerHTML = '';
          setShulNameDisplay('');
        }
      };
      // הצג את תיבת הבחירה
      select.style.display = '';
      document.querySelector('label[for="shul-select"]').style.display = '';
      currentShul = null;
      renderPrayerLists();
      setShulNameDisplay('');
      return;
    }
    // מצא את בית הכנסת של המשתמש
    const userShul = synagogues.find(s => s.name === userShulName);
    if (!userShul) {
      document.getElementById('admin-content').style.display = 'none';
      window.location.replace('login.html');
      return;
    }
    currentShul = userShul;
    // הסתר את תיבת הבחירה
    document.getElementById('shul-select').style.display = 'none';
    document.querySelector('label[for="shul-select"]').style.display = 'none';
    renderPrayerLists();
    setShulNameDisplay(currentShul.name);
  }

  function renderPrayerLists() {
    if (!currentShul) {
      // אם אין בית כנסת נבחר, נקה את הרשימות
      document.getElementById('weekday-list').innerHTML = '';
      document.getElementById('shabbat-list').innerHTML = '';
      return;
    }
    renderPrayerList('weekday-list', currentShul.prayers || []);
    renderPrayerList('shabbat-list', currentShul.shabbatPrayers || []);
  }

  function renderPrayerList(elementId, prayers) {
    const list = document.getElementById(elementId);
    list.innerHTML = '';
    (prayers || []).forEach((prayer, idx) => {
      const row = document.createElement('div');
      row.className = 'prayer-row';
      row.setAttribute('draggable', 'true');
      row.dataset.index = idx;
      row.innerHTML = `
        <span class="drag-handle">☰</span>
        <input class="admin-input" type="text" placeholder="שם תפילה" value="${prayer.name}">
        <input class="admin-input" type="time" value="${prayer.time}">
        <button class="remove-btn">✖</button>
      `;
      row.querySelector('.remove-btn').onclick = () => {
        prayers.splice(idx, 1);
        renderPrayerLists();
      };
      row.querySelectorAll('input')[0].oninput = e => { prayer.name = e.target.value; };
      row.querySelectorAll('input')[1].oninput = e => { prayer.time = e.target.value; };
      list.appendChild(row);
    });
  }

  function setupDragAndDropListeners() {
    const lists = [
      { el: document.getElementById('weekday-list'), key: 'prayers' },
      { el: document.getElementById('shabbat-list'), key: 'shabbatPrayers' }
    ];

    lists.forEach(listConfig => {
      const listElement = listConfig.el;
      const prayerArrayKey = listConfig.key;
      let dragStartIndex;

      listElement.addEventListener('dragstart', e => {
        if (e.target.classList.contains('prayer-row')) {
          dragStartIndex = parseInt(e.target.dataset.index, 10);
          setTimeout(() => e.target.classList.add('dragging'), 0);
        }
      });

      listElement.addEventListener('dragend', e => {
        if (e.target.classList.contains('prayer-row')) {
          e.target.classList.remove('dragging');
        }
      });

      listElement.addEventListener('dragover', e => e.preventDefault());

      listElement.addEventListener('drop', e => {
        e.preventDefault();
        const dropTarget = e.target.closest('.prayer-row');
        if (!dropTarget) return;

        const dragEndIndex = parseInt(dropTarget.dataset.index, 10);
        if (dragStartIndex === undefined) return;

        const prayerArray = currentShul[prayerArrayKey];
        const [removedItem] = prayerArray.splice(dragStartIndex, 1);
        prayerArray.splice(dragEndIndex, 0, removedItem);

        renderPrayerLists();
      });
    });
  }

  document.getElementById('add-weekday').onclick = () => {
    if (!currentShul) {
      alert('אנא בחר בית כנסת תחילה');
      return;
    }
    currentShul.prayers = currentShul.prayers || [];
    currentShul.prayers.push({ name: '', time: '' });
    renderPrayerLists();
  };
  document.getElementById('add-shabbat').onclick = () => {
    if (!currentShul) {
      alert('אנא בחר בית כנסת תחילה');
      return;
    }
    currentShul.shabbatPrayers = currentShul.shabbatPrayers || [];
    currentShul.shabbatPrayers.push({ name: '', time: '' });
    renderPrayerLists();
  };

  document.getElementById('save-btn').onclick = async () => {
    if (!currentShul) {
      alert('אנא בחר בית כנסת תחילה');
      return;
    }
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

  (async function() {
    await loadSynagoguesFromDB();
    renderShulSelect();
    setupDragAndDropListeners();
  })();
}

// Helper to safely set the synagogue name display
function setShulNameDisplay(name) {
  const el = document.getElementById('shul-name-display');
  if (el) {
    el.textContent = name || '';
  } else {
    setTimeout(() => setShulNameDisplay(name), 50);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      await auth.signOut();
      window.location.replace('login.html');
    };
  }
}); 