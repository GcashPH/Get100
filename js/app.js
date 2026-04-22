import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, doc, getDoc, updateDoc, collection, 
    onSnapshot, query, orderBy, limit 
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

// --- DASHBOARD & BALANCE SYNC ---
async function syncDashboard() {
    if (!activeUser) return;
    
    // Kunin ang data base sa userID (Active User)
    const userRef = doc(db, "users", activeUser);
    onSnapshot(userRef, (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            const balance = data.earnings || 0;
            document.getElementById('mainBalance').innerText = balance.toFixed(2);
            
            // Prefill sa Withdrawal Modal
            const amountInput = document.getElementById('withdrawAmount');
            if(amountInput) amountInput.value = balance.toFixed(2);
        }
    });
}

// Initialize Dashboard
async function initDashboard() {
    if (!activeUser) { window.location.href = "index.html"; return; }
    document.getElementById('displayUserID').innerText = activeUser;

    // Real-time Sync for User Data
    onSnapshot(doc(db, "users", activeUser), (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            document.getElementById('mainBalance').innerText = (data.earnings || 0).toFixed(2);
            if (data.Referral_status === "Redeem") {
                document.getElementById('redeemSection').classList.add('hidden');
            }
        }
    });

    // Load Promo Configs from Firestore
    const contentSnap = await getDoc(doc(db, "app_data", "global_configs"));
    if (contentSnap.exists()) {
        const config = contentSnap.data();
        document.getElementById('promoPhoto').src = config.share_photo || "https://via.placeholder.com/150";
        document.getElementById('shortLink').innerText = config.short_link || "https://bit.ly/get100";
        document.getElementById('shortLink').href = config.short_link || "#";
    }
}

// Modal Toggle Logic
const modal = document.getElementById('inviteModal');
document.getElementById('openInvite').onclick = () => modal.style.display = 'flex';
document.getElementById('closeModal').onclick = () => {
    modal.style.display = 'none';
    document.getElementById('modalPage1').classList.remove('hidden');
    document.getElementById('modalPage2').classList.add('hidden');
};

// View Own Referral Code
document.getElementById('viewMyCode').onclick = async () => {
    const snap = await getDoc(doc(db, "users", activeUser));
    alert("Your Referral Code: " + (snap.data().referralCode || "Generating..."));
};

// Next Page: Share Section
document.getElementById('goSharePage').onclick = async () => {
    const snap = await getDoc(doc(db, "users", activeUser));
    const code = snap.data().referralCode;
    document.getElementById('captionText').innerText = `Get ₱100 instantly! Register here and use my code. #Get100 #Referral_${code}`;
    document.getElementById('modalPage1').classList.add('hidden');
    document.getElementById('modalPage2').classList.remove('hidden');
};

// Back to Profile
document.getElementById('backToP1').onclick = () => {
    document.getElementById('modalPage2').classList.add('hidden');
    document.getElementById('modalPage1').classList.remove('hidden');
};

// Verify Referral Code
document.getElementById('btnVerify').onclick = async () => {
    const codeInput = document.getElementById('inputFriendCode').value.trim().toUpperCase();
    const userRef = doc(db, "users", activeUser);
    const snap = await getDoc(userRef);
    const myData = snap.data();

    if (codeInput === myData.referralCode) {
        alert("Bawal gamitin ang sariling code!");
        return;
    }

    if (codeInput.length === 6) {
        await updateDoc(userRef, {
            Referral_status: "Redeem",
            earnings: (myData.earnings || 0) + 100
        });
        alert("Verification Success! +₱100 Added.");
    }
};

// Copy Caption
document.getElementById('btnCopyCaption').onclick = () => {
    const text = document.getElementById('captionText').innerText;
    navigator.clipboard.writeText(text);
    alert("Caption Copied!");
};

// Winner Simulation
function spawnWinner() {
    const id = "09" + Math.floor(Math.random()*90+10) + "****" + Math.floor(1000+Math.random()*9000);
    const div = document.createElement('div');
    div.className = "msg winner";
    div.innerHTML = `<img src="images/gc_icon.png" class="gc-icon"> User ${id} received ₱100.00 GCash!`;
    const logs = document.getElementById('chatLogs');
    if(logs) {
        logs.appendChild(div);
        logs.scrollTop = logs.scrollHeight;
    }
}

// Start App
window.onload = () => {
    initDashboard();
    setInterval(spawnWinner, 45000);
    setTimeout(spawnWinner, 2000);
};

// --- WITHDRAWAL MATCHING LOGIC ---
document.getElementById('gcashConfirm').oninput = function() {
    const original = document.getElementById('gcashPrefix').value;
    const confirm = this.value;
    const claimBtn = document.getElementById('btnClaimGcash');
    
    if (original === confirm && confirm.length > 0) {
        claimBtn.style.opacity = "1";
        claimBtn.disabled = false;
    } else {
        claimBtn.style.opacity = "0.5";
        claimBtn.disabled = true;
    }
};

// --- CHAT POST & 10-MIN TIMER LOGIC ---
const POST_COOLDOWN = 10 * 60 * 1000; // 10 Minutes in ms

function updatePostButton() {
    const lastPost = localStorage.getItem('last_post_time');
    const btn = document.getElementById('btnPostRef');
    const timerDisplay = document.getElementById('cooldownTimer');
    
    if (lastPost) {
        const remaining = parseInt(lastPost) + POST_COOLDOWN - Date.now();
        if (remaining > 0) {
            btn.disabled = true;
            timerDisplay.classList.remove('hidden');
            startCountdown(remaining);
            return;
        }
    }
    btn.disabled = false;
    timerDisplay.classList.add('hidden');
}

// --- SEQUENTIAL FEED LOGIC ---
let feedInterval;
async function startLiveFeed() {
    const logsContainer = document.getElementById('chatLogs');
    
    // 1. Initial Load ng Chatlogs (Latest 5)
    const q = query(collection(db, "chatlogs"), orderBy("timestamp", "desc"), limit(5));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach(doc => addFeedItem(doc.data().text, 'user'));

    // 2. Sequence Logic
    setInterval(() => {
        // Tuwing 1 minute, mag-spawn ng Winner
        spawnWinner();
        
        // Tuwing 3 minutes, kumuha ng bagong chat mula sa DB
        setTimeout(() => {
            fetchLatestChat();
        }, 180000); // 3 mins
    }, 60000); // Main loop is 1 min
}

async function fetchLatestChat() {
    const q = query(collection(db, "chatlogs"), orderBy("timestamp", "desc"), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
        addFeedItem(snap.docs[0].data().text, 'user');
    }
}

function addFeedItem(text, type) {
    const logs = document.getElementById('chatLogs');
    const div = document.createElement('div');
    div.className = `msg ${type === 'winner' ? 'winner' : ''}`;
    div.innerHTML = text;
    
    logs.prepend(div); // Newest at the top
    if (logs.childNodes.length > 10) logs.removeChild(logs.lastChild);
}
// Update the Post function
document.getElementById('btnPostRef').onclick = async () => {
    const userSnap = await getDoc(doc(db, "users", activeUser));
    const code = userSnap.data().referralCode;
    const last5 = activeUser.slice(-5);

    await addDoc(collection(db, "chatlogs"), {
        text: `User[${last5}]: Use code <b>${code}</b> #Get100`,
        sender: activeUser, // Used for POV color detection
        timestamp: serverTimestamp()
    });

    localStorage.setItem('last_post_time', Date.now().toString());
    updatePostButton();
};

// --- POV CHAT LOGIC ---
// Sa loob ng iyong onSnapshot(chatQuery) listener, baguhin ang loop:
snap.forEach(d => {
    const msgData = d.data();
    const div = document.createElement('div');
    // Check if sender is current user to apply POV color
    const isMe = msgData.sender === activeUser;
    div.className = `msg ${isMe ? 'my-chat' : ''}`;
    div.innerHTML = msgData.text;
    document.getElementById('chatLogs').appendChild(div);
});

// Initial load check
updatePostButton();
