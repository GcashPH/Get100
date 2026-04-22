import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, doc, getDoc, updateDoc, collection, addDoc, 
    onSnapshot, query, orderBy, limit, serverTimestamp, getDocs 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAK5I_7WeKouFM08SeOZcDHrXsgckYoULg",
    authDomain: "get100-8333e.firebaseapp.com",
    projectId: "get100-8333e",
    storageBucket: "get100-8333e.firebasestorage.app",
    messagingSenderId: "242341429618",
    appId: "1:242341429618:web:c596b279f746dc22851deb"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const activeUser = localStorage.getItem('active_user');

// --- 1. INITIALIZATION & SYNC ---
async function init() {
    if (!activeUser) { window.location.href = "index.html"; return; }
    document.getElementById('displayUserID').innerText = activeUser;
    document.getElementById('gcashPrefix').value = activeUser;

    // Real-time Balance Sync
    onSnapshot(doc(db, "users", activeUser), (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            const bal = (data.earnings || 0).toFixed(2);
            document.getElementById('mainBalance').innerText = bal;
            document.getElementById('withdrawAmount').value = bal;
            if (data.Referral_status === "Redeem") document.getElementById('redeemSection').classList.add('hidden');
        }
    });

    startLiveFeed();
    updatePostButton();
}

// --- 2. WITHDRAWAL LOGIC ---
const wModal = document.getElementById('withdrawModal');
document.getElementById('openWithdraw').onclick = () => wModal.style.display = 'flex';
document.getElementById('closeWithdraw').onclick = () => wModal.style.display = 'none';

document.getElementById('gcashConfirm').oninput = function() {
    const btn = document.getElementById('btnClaimGcash');
    if (this.value === activeUser) {
        btn.disabled = false; btn.style.opacity = "1";
    } else {
        btn.disabled = true; btn.style.opacity = "0.5";
    }
};

// --- 3. LIVE FEED SEQUENCE (Winner 1m | Chat 3m) ---
function addFeedItem(text, type, senderID = "") {
    const logs = document.getElementById('chatLogs');
    const div = document.createElement('div');
    const isMe = senderID === activeUser;
    div.className = `msg ${type === 'winner' ? 'winner' : ''} ${isMe ? 'my-chat' : ''}`;
    div.innerHTML = text;
    logs.prepend(div);
    if (logs.childNodes.length > 10) logs.removeChild(logs.lastChild);
}

function spawnWinner() {
    const randID = "09" + Math.floor(Math.random()*90+10) + "****" + Math.floor(1000+Math.random()*9000);
    addFeedItem(`<img src="images/gc_icon.png" class="gc-icon"> User ${randID} received ₱100.00 GCash!`, 'winner');
}

async function fetchLatestChat() {
    const q = query(collection(db, "chatlogs"), orderBy("timestamp", "desc"), limit(1));
    const snap = await getDocs(q);
    snap.forEach(d => addFeedItem(d.data().text, 'user', d.data().sender));
}

function startLiveFeed() {
    spawnWinner(); // Initial
    setInterval(spawnWinner, 60000); // Every 1 min
    setInterval(fetchLatestChat, 180000); // Every 3 mins
}

// --- 4. CHAT POST & COOLDOWN ---
const POST_COOLDOWN = 10 * 60 * 1000; 

function updatePostButton() {
    const lastPost = localStorage.getItem('last_post_time');
    const btn = document.getElementById('btnPostRef');
    const timerBox = document.getElementById('cooldownTimer');
    
    if (lastPost) {
        const remaining = parseInt(lastPost) + POST_COOLDOWN - Date.now();
        if (remaining > 0) {
            btn.disabled = true;
            timerBox.classList.remove('hidden');
            runCountdown(remaining);
            return;
        }
    }
    btn.disabled = false;
    timerBox.classList.add('hidden');
}

function runCountdown(ms) {
    const span = document.getElementById('timer');
    const int = setInterval(() => {
        ms -= 1000;
        if (ms <= 0) { clearInterval(int); updatePostButton(); }
        else {
            const m = Math.floor(ms/60000);
            const s = Math.floor((ms%60000)/1000);
            span.innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
        }
    }, 1000);
}

document.getElementById('btnPostRef').onclick = async () => {
    const snap = await getDoc(doc(db, "users", activeUser));
    const code = snap.data().referralCode;
    const last5 = activeUser.slice(-5);
    const text = `User[${last5}]: Use code <b>${code}</b> #Get100`;

    await addDoc(collection(db, "chatlogs"), { text, sender: activeUser, timestamp: serverTimestamp() });
    localStorage.setItem('last_post_time', Date.now().toString());
    updatePostButton();
    addFeedItem(text, 'user', activeUser);
};

// --- 5. MODAL TOGGLES ---
const iModal = document.getElementById('inviteModal');
document.getElementById('openInvite').onclick = () => iModal.style.display = 'flex';
document.getElementById('closeModal').onclick = () => iModal.style.display = 'none';

window.onload = init;
