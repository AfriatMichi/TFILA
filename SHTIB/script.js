import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, doc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// השתמש בקונפיג הקיים בפרויקט
const firebaseConfig = {
  apiKey: "AIzaSyA_4RAbPHGRut7kLK5TorqBkGbUIg1qfiI",
  authDomain: "tfila-772ad.firebaseapp.com",
  projectId: "tfila-772ad",
  storageBucket: "tfila-772ad.firebasestorage.app",
  messagingSenderId: "1041334561919",
  appId: "1:1041334561919:web:c5222a28a5de705439a34a"
};

// מניעת אתחול כפול
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

    // יצירת מניין חדש
    document.getElementById('prayerForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const organizerName = document.getElementById('organizerName').value;
        const prayerType = document.getElementById('prayerType').value;
        const prayerTime = document.getElementById('prayerTime').value;
        const location = document.getElementById('location').value;
        const notes = document.getElementById('notes').value;
        const participants = [organizerName];
        const createdAt = new Date().toISOString();

        await addDoc(collection(db, 'Shtib'), {
            organizerName, prayerType, prayerTime, location, notes, participants, createdAt
        });
        document.getElementById('prayerForm').reset();
        alert('התפילה נוצרה בהצלחה! אנשים יכולים עכשיו להצטרף.');
    });

// שליפת מניינים ועדכון בזמן אמת
function renderMinyanList() {
    const container = document.getElementById('minyanList');
    container.innerHTML = '<div class="empty-state">טוען...</div>';
    const q = query(collection(db, 'Shtib'), orderBy('createdAt', 'desc'));
    onSnapshot(q, async (snapshot) => {
        if (snapshot.empty) {
            container.innerHTML = '<div class="empty-state">אין תפילות פעילות כרגע.<br>צור תפילה חדשה כדי להתחיל!</div>';
            return;
        }
        container.innerHTML = '';
        const now = new Date();
        const deletePromises = [];

        snapshot.forEach(docSnap => {
            const minyan = docSnap.data();
            minyan.id = docSnap.id;

            // המשך לרנדר מניינים שעדיין פעילים
            const isComplete = minyan.participants && minyan.participants.length >= 10;
            const participantsCount = minyan.participants ? minyan.participants.length : 0;
            const minyanElement = document.createElement('div');
            minyanElement.className = 'minyan-item';
            minyanElement.innerHTML = `
                <div class="minyan-header">
                    <div class="minyan-title">${minyan.prayerType}</div>
                    <div class="participants-count ${isComplete ? 'complete' : ''}">
                        ${participantsCount}/10
                    </div>
                </div>
                <div class="minyan-details">
                    <div class="detail-item">
                        <div class="detail-label">שעה</div>
                        <div class="detail-value time-display">${minyan.prayerTime}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">מיקום</div>
                        <div class="detail-value">${minyan.location}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">מארגן</div>
                        <div class="detail-value">${minyan.organizerName}</div>
                    </div>
                </div>
                ${minyan.notes ? `<div class="detail-item" style="margin-top: 10px;"><div class="detail-label">הערות</div><div class="detail-value">${minyan.notes}</div></div>` : ''}
                <div class="participants-list">
                    <strong>משתתפים:</strong><br>
                    ${(minyan.participants || []).map(name => `<span class="participant-item">${name}</span>`).join('')}
                </div>
                ${isComplete ? 
                    '<div class="complete-notice">🎉 המניין הושלם! התפילה יכולה להתקיים 🎉</div>' : 
                    `<button class="join-btn" onclick="window.joinMinyan('${minyan.id}')">הצטרף לתפילה</button>`
                }
            `;
            container.appendChild(minyanElement);
        });

        // בצע מחיקות של מניינים שפג תוקפם
        await Promise.all(deletePromises).catch(error => {
            console.error('שגיאה במחיקת מניינים שפג תוקפם:', error);
        });
    }, (error) => {
        console.error('שגיאה בקריאת מניינים:', error);
        container.innerHTML = '<div class="empty-state">שגיאה בטעינת התפילות: ' + error.message + '</div>';
    });
}

// הצטרפות למניין
window.joinMinyan = async function(minyanId) {
    const name = prompt('הזן את שמך כדי להצטרף לתפילה:');
    if (!name || name.trim() === '') return;
    const minyanRef = doc(db, 'Shtib', minyanId);
    const minyanSnap = await getDocs(query(collection(db, 'Shtib')));
    let minyanData = null;
    minyanSnap.forEach(docSnap => {
        if (docSnap.id === minyanId) minyanData = docSnap.data();
    });
    if (!minyanData) return;
    if (minyanData.participants && minyanData.participants.includes(name.trim())) {
        alert('השם כבר רשום לתפילה זו');
        return;
    }
    if (minyanData.participants && minyanData.participants.length >= 10) {
        alert('התפילה כבר מלאה');
        return;
    }
    const updatedParticipants = (minyanData.participants || []).concat([name.trim()]);
    await updateDoc(minyanRef, { participants: updatedParticipants });
    if (updatedParticipants.length === 10) {
        alert('🎉 מזל טוב! המנין הושלם והתפילה יכולה להתקיים! 🎉');
    } else {
        alert(`נרשמת בהצלחה! נדרשים עוד ${10 - updatedParticipants.length} אנשים.`);
    }
}



// טעינה ראשונית ועדכון בזמן אמת
renderMinyanList(); 