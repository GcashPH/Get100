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

const POST_COOLDOWN = 10 * 60 * 1000; // 10 Minutes

// --- 1. INITIALIZATION ---
async function init() {
    if (!activeUser) { window.location.href = "index.html"; return; }
    
    // UI Setup
    document.getElementById('displayUserID').innerText = activeUser;
    document.getElementById('gcashPrefix').value = activeUser;

    // Real-time Balance & Profile Sync
    onSnapshot(doc(db, "users", activeUser), (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            const bal = (data.earnings || 0).toFixed(2);
            document.getElementById('mainBalance').innerText = bal;
            document.getElementById('withdrawAmount').value = bal;
            if (data.Referral_status === "Redeem") {
                const redeemSec = document.getElementById('redeemSection');
                if(redeemSec) redeemSec.classList.add('hidden');
            }
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
    // Match logic: Button lights up if confirmation matches activeUser (phone number)
    if (this.value === activeUser) {
        btn.disabled = false; 
        btn.style.opacity = "1";
    } else {
        btn.disabled = true; 
        btn.style.opacity = "0.5";
    }
};

// --- 3. LIVE FEED (REAL-TIME CHATLOGS + SIMULATED WINNERS) ---
function addFeedItem(text, type, senderID = "") {
    const logs = document.getElementById('chatLogs');
    const div = document.createElement('div');
    const isMe = senderID === activeUser;
    
    // type: 'winner' or 'user'
    div.className = `msg ${type === 'winner' ? 'winner' : ''} ${isMe ? 'my-chat' : ''}`;
    div.innerHTML = text;
    
    logs.prepend(div); // Newest on top
    
    // Limit to 12 items para hindi laggy ang UI
    if (logs.childNodes.length > 12) logs.removeChild(logs.lastChild);
}

function spawnWinner() {
    const randID = "09" + Math.floor(Math.random()*90+10) + "****" + Math.floor(1000+Math.random()*9000);
    const winMsg = `<i class="fa-solid fa-gift"></i> User ${randID} received ₱100.00 GCash!`;
    addFeedItem(winMsg, 'winner');
}

function startLiveFeed() {
    // A. Listen to Database Chatlogs (Real-time)
    const q = query(collection(db, "chatlogs"), orderBy("timestamp", "desc"), limit(5));
    onSnapshot(q, (snapshot) => {
        // Tuwing may bago sa DB, lalabas agad dito
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const data = change.doc.data();
                // Iwasan ang duplicate kung kaka-post lang ng user manually
                addFeedItem(data.text, 'user', data.sender);
            }
        });
    });

    // B. Simulation Sequence
    spawnWinner(); // Initial load winner
    setInterval(spawnWinner, 60000); // 1 minute interval for winners
}

// --- 4. POST REFERRAL LOGIC & PERSISTENT TIMER ---
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
        const nowRemaining = parseInt(localStorage.getItem('last_post_time')) + POST_COOLDOWN - Date.now();
        
        if (nowRemaining <= 0) {
            clearInterval(int);
            updatePostButton();
        } else {
            const m = Math.floor(nowRemaining / 60000);
            const s = Math.floor((nowRemaining % 60000) / 1000);
            span.innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
        }
    }, 1000);
}

document.getElementById('btnPostRef').onclick = async () => {
    try {
        const userSnap = await getDoc(doc(db, "users", activeUser));
        if (!userSnap.exists()) return;

        const code = userSnap.data().referralCode || "GET100";
        const last5 = activeUser.slice(-5);
        const postText = `<b>User[${last5}]</b>: Mag-register na gamit ang code ko: <b>${code}</b> 🌿`;

        // Save to Firebase
        await addDoc(collection(db, "chatlogs"), {
            text: postText,
            sender: activeUser,
            timestamp: serverTimestamp()
        });

        // Set Cooldown
        localStorage.setItem('last_post_time', Date.now().toString());
        updatePostButton();
        
    } catch (err) {
        console.error("Post Error:", err);
    }
};

// --- 5. MODAL TOGGLES ---
const iModal = document.getElementById('inviteModal');
document.getElementById('openInvite').onclick = () => { iModal.style.display = 'flex'; };
document.getElementById('closeModal').onclick = () => { iModal.style.display = 'none'; };

// Handle closing modals by clicking outside
window.onclick = (event) => {
    if (event.target == wModal) wModal.style.display = "none";
    if (event.target == iModal) iModal.style.display = "none";
};

window.onload = init;
