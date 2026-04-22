import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, doc, getDoc, collection, addDoc, 
    onSnapshot, query, orderBy, limit, serverTimestamp 
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

const POST_COOLDOWN = 10 * 60 * 1000; // 10 mins

async function init() {
    if (!activeUser) { window.location.href = "index.html"; return; }
    
    // UI Setup
    document.getElementById('displayUserID').innerText = activeUser;
    document.getElementById('gcashPrefix').value = activeUser;

    // 1. REAL-TIME BALANCE
    onSnapshot(doc(db, "users", activeUser), (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            const bal = (data.earnings || 0).toFixed(2);
            document.getElementById('mainBalance').innerText = bal;
            document.getElementById('withdrawAmount').value = bal;
            if (data.Referral_status === "Redeem") {
                const rs = document.getElementById('redeemSection');
                if(rs) rs.classList.add('hidden');
            }
        }
    });

    startLiveFeed();
    updatePostButton();
}

// 2. MODAL TOGGLES
const wModal = document.getElementById('withdrawModal');
const iModal = document.getElementById('inviteModal');

document.getElementById('openWithdraw').onclick = () => wModal.style.display = 'flex';
document.getElementById('closeWithdraw').onclick = () => wModal.style.display = 'none';

document.getElementById('openInvite').onclick = () => iModal.style.display = 'flex';
document.getElementById('closeModal').onclick = () => iModal.style.display = 'none';

// 3. GCASH LOGIC & CHANGE NUMBER (X Icon)
const changeNumBtn = document.getElementById('changeNumber');
const gcashPrefix = document.getElementById('gcashPrefix');
const gcashConfirm = document.getElementById('gcashConfirm');
const btnClaim = document.getElementById('btnClaimGcash');

changeNumBtn.onclick = function() {
    if (gcashPrefix.readOnly) {
        gcashPrefix.readOnly = false;
        gcashPrefix.classList.remove('locked');
        gcashPrefix.focus();
        this.classList.replace('fa-circle-xmark', 'fa-circle-check');
        this.style.color = 'var(--success)';
    } else {
        gcashPrefix.readOnly = true;
        gcashPrefix.classList.add('locked');
        this.classList.replace('fa-circle-check', 'fa-circle-xmark');
        this.style.color = 'var(--warning)';
    }
    validateClaim(); // Re-validate on lock/unlock
};

gcashConfirm.oninput = validateClaim;

function validateClaim() {
    if (gcashConfirm.value === gcashPrefix.value && gcashPrefix.value.trim() !== '') {
        btnClaim.disabled = false;
    } else {
        btnClaim.disabled = true;
    }
}

// 4. LIVE FEED LOGIC (Bottom to Top via CSS flex-direction: column-reverse)
function addFeedItem(text, type, senderID = "") {
    const logs = document.getElementById('chatLogs');
    const div = document.createElement('div');
    const isMe = senderID === activeUser;
    
    // Classes: 'msg', then 'winner-msg', 'my-msg', or 'user-msg'
    let specificClass = 'user-msg';
    if (type === 'winner') specificClass = 'winner-msg';
    else if (isMe) specificClass = 'my-msg';

    div.className = `msg ${specificClass}`;
    div.innerHTML = text;
    
    logs.prepend(div); 
    if (logs.childNodes.length > 20) logs.removeChild(logs.lastChild);
}

function spawnWinner() {
    const randID = "09" + Math.floor(Math.random()*90+10) + "****" + Math.floor(1000+Math.random()*9000);
    addFeedItem(`<i class="fa-solid fa-gift"></i> User ${randID} claimed ₱100.00 GCash!`, 'winner');
}

function startLiveFeed() {
    const q = query(collection(db, "chatlogs"), orderBy("timestamp", "desc"), limit(10));
    onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const data = change.doc.data();
                addFeedItem(data.text, 'user', data.sender);
            }
        });
    });

    spawnWinner();
    setInterval(spawnWinner, 60000); // 1 min bot
}

// 5. POST REFERRAL LOGIC
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
        const postText = `User[${last5}]: Join using my code <b>${code}</b> 🌿`;

        await addDoc(collection(db, "chatlogs"), {
            text: postText,
            sender: activeUser,
            timestamp: serverTimestamp()
        });

        localStorage.setItem('last_post_time', Date.now().toString());
        updatePostButton();
    } catch (err) {
        console.error("Post Error:", err);
    }
};

window.onload = init;
