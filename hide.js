import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getFirestore, collection, getDocs, setDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

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

const statusMsg = document.getElementById('status-msg');
const tbody = document.getElementById('shul-tbody');

async function loadSynagogues() {
  tbody.innerHTML = '<tr><td colspan="3">טוען...</td></tr>';
  const prayersSnap = await getDocs(collection(db, "prayers"));
  const shuls = {};
  prayersSnap.forEach(docSnap => {
    const data = docSnap.data();
    if (!shuls[data.synagogue]) {
      shuls[data.synagogue] = { name: data.synagogue, hidden: data.hidden || false, docIds: [] };
    }
    if (typeof data.hidden !== 'undefined') {
      shuls[data.synagogue].hidden = data.hidden;
    }
    shuls[data.synagogue].docIds.push(docSnap.id);
  });
  renderTable(Object.values(shuls));
}

function renderTable(shuls) {
  tbody.innerHTML = '';
  if (shuls.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3">לא נמצאו בתי כנסת</td></tr>';
    return;
  }
  shuls.forEach(shul => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${shul.name}</td>
      <td>${shul.hidden ? 'מוסתר' : 'מוצג'}</td>
      <td><button class="toggle-btn${shul.hidden ? ' hidden' : ''}">${shul.hidden ? 'הצג' : 'הסתר'}</button></td>
    `;
    const btn = tr.querySelector('.toggle-btn');
    btn.onclick = () => toggleShulHidden(shul);
    tbody.appendChild(tr);
  });
}

async function toggleShulHidden(shul) {
  statusMsg.textContent = 'מעדכן...';
  try {
    // עדכן את כל המסמכים של בית הכנסת (יום חול/שבת)
    await Promise.all(shul.docIds.map(docId =>
      updateDoc(doc(db, "prayers", docId), { hidden: !shul.hidden })
    ));
    statusMsg.textContent = 'עודכן בהצלחה';
    loadSynagogues();
  } catch (e) {
    statusMsg.textContent = 'שגיאה בעדכון';
  }
}

loadSynagogues(); 