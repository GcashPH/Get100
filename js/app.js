import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, doc, getDoc, collection, addDoc, 
    onSnapshot, query, orderBy, limit, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- 1. CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyAK5I_7WeKouFM08SeOZcDHrXsgckYoULg",
  authDomain: "get100-8333e.firebaseapp.com",
  databaseURL: "https://get100-8333e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "get100-8333e",
  storageBucket: "get100-8333e.firebasestorage.app",
  messagingSenderId: "242341429618",
  appId: "1:242341429618:web:c596b279f746dc22851deb",
  measurementId: "G-Y8TW2M3494"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const activeUser = localStorage.getItem('active_user');
const POST_COOLDOWN = 10 * 60 * 1000; 
let myActiveReferralCode = "LOADING..."; 

// Dapat eksaktong match ito sa index.js para hindi ma-kickout ang user
const getDeviceSignature = () => {
    return btoa(navigator.userAgent + screen.width + screen.height).slice(0, 24);
};

// --- 2. THE GATEKEEPER (init function) ---
async function init() {
    // A. Check kung may session
    if (!activeUser || activeUser.length !== 11) {
        window.location.href = "index.html";
        return;
    }
    
    const currentSig = getDeviceSignature();

    try {
        const userRef = doc(db, "users", activeUser);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const userData = userSnap.data();
            const authorizedSigs = userData.signatures || [];

            // B. Security Check: Kung recognized ang device
            if (!authorizedSigs.includes(currentSig)) {
                console.error("Unauthorized device signature.");
                alert("Security: Device not recognized. Please login again.");
                localStorage.clear();
                window.location.href = "index.html";
                return;
            }
            
            // C. SUCCESS: I-setup ang UI bago ipakita ang body
            renderUserBasics(userData);
            setupDashboard(); // ITO ANG TATAWAG SA PAGPAPAKITA NG BODY
            
            // D. Start Real-time Listeners
            listenToUserData(userRef);
            startLiveFeed();
            updatePostButton();

        } else {
            // User ID not in Database
            localStorage.clear();
            window.location.href = "index.html";
        }
    } catch (err) {
        console.error("Critical Auth Error:", err);
        // Huwag agad i-kickout kung baka connection issue lang, pero i-log ito
    }
}

// --- 3. UI RENDERING FUNCTIONS ---

function renderUserBasics(data) {
    const displayID = document.getElementById('displayUserID');
    const gPrefix = document.getElementById('gcashPrefix');
    
    if(displayID) displayID.innerText = activeUser;
    if(gPrefix) gPrefix.value = activeUser;
}

function setupDashboard() {
    // Eto ang papatay sa "White Screen"
    document.body.style.display = "block"; 
    console.log("Dashboard fully authorized and visible.");
}

// Real-time updates para sa Balance at Referral Code
function listenToUserData(userRef) {
    onSnapshot(userRef, (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        
        // Update Balance
        const bal = (data.earnings || 0).toFixed(2);
        const mainBalEl = document.getElementById('mainBalance');
        const withdrawInput = document.getElementById('withdrawAmount');
        
        if(mainBalEl) mainBalEl.innerText = bal;
        if(withdrawInput) withdrawInput.value = bal;
        
        // Update Referral Logic
        myActiveReferralCode = data.referralCode || "NONE";
        const displayRefEl = document.getElementById('displayreferralCode');
        if(displayRefEl) displayRefEl.innerText = myActiveReferralCode;
        
        const captionEl = document.getElementById('promoCaption');
        if(captionEl) {
            captionEl.value = `Earn 100 GCash Credits by Inviting Friends FREE! Use my Referral Code: ${myActiveReferralCode}`;
        }

        if (data.Referral_status === "Redeem") {
            const rs = document.getElementById('redeemSection');
            if(rs) rs.classList.add('hidden');
        }
    });
}

// --- 4. LIVE FEED & CHAT LOGIC ---
function addFeedItem(text, type, senderID = "") {
    const logs = document.getElementById('chatLogs');
    if(!logs) return;
    const div = document.createElement('div');
    const isMe = senderID === activeUser;
    
    let specificClass = 'user-msg';
    if (type === 'winner') specificClass = 'winner-msg';
    else if (isMe) specificClass = 'my-msg';

    div.className = `msg ${specificClass}`;
    div.innerHTML = text;
    
    logs.prepend(div); 
    if (logs.childNodes.length > 20) logs.removeChild(logs.lastChild);
}

function spawnWinner() {
    const randID = "09" + Math.floor(Math.random()*90+10) + "***" + Math.floor(1000+Math.random()*9000);
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
    setInterval(spawnWinner, 60000); 
}

// --- 5. MODAL & GCASH LOGIC ---
function setupEventListeners() {
    const wModal = document.getElementById('withdrawModal');
    const iModal = document.getElementById('inviteModal');
    const shareModal = document.getElementById('shareModal');

    // Modals
    if(document.getElementById('openWithdraw')) document.getElementById('openWithdraw').onclick = () => wModal.style.display = 'flex';
    if(document.getElementById('closeWithdraw')) document.getElementById('closeWithdraw').onclick = () => wModal.style.display = 'none';
    if(document.getElementById('openInvite')) document.getElementById('openInvite').onclick = () => iModal.style.display = 'flex';
    if(document.getElementById('closeModal')) document.getElementById('closeModal').onclick = () => iModal.style.display = 'none';

    if(document.getElementById('openShareModal')) {
        document.getElementById('openShareModal').onclick = () => {
            iModal.style.display = 'none'; 
            shareModal.style.display = 'flex'; 
        };
    }
    if(document.getElementById('closeShareModal')) document.getElementById('closeShareModal').onclick = () => shareModal.style.display = 'none';

    // GCash Number Edit
    const changeNumBtn = document.getElementById('changeNumber');
    const gPrefix = document.getElementById('gcashPrefix');
    const gConfirm = document.getElementById('gcashConfirm');

    if(changeNumBtn) {
        changeNumBtn.onclick = function() {
            if (gPrefix.readOnly) {
                gPrefix.readOnly = false;
                gPrefix.classList.remove('locked');
                gPrefix.focus();
                this.classList.replace('fa-circle-xmark', 'fa-circle-check');
                this.style.color = '#00b894';
            } else {
                gPrefix.readOnly = true;
                gPrefix.classList.add('locked');
                this.classList.replace('fa-circle-check', 'fa-circle-xmark');
                this.style.color = '#ff7675';
            }
            validateClaim(); 
        };
    }
    if(gConfirm) gConfirm.oninput = validateClaim;
}

function validateClaim() {
    const gPrefix = document.getElementById('gcashPrefix');
    const gConfirm = document.getElementById('gcashConfirm');
    const btnClaim = document.getElementById('btnClaimGcash');
    if (gConfirm.value === gPrefix.value && gPrefix.value.trim() !== '') {
        btnClaim.disabled = false;
    } else {
        btnClaim.disabled = true;
    }
}

// --- 6. POSTING & CLIPBOARD LOGIC ---
function updatePostButton() {
    const lastPost = localStorage.getItem('last_post_time');
    const btn = document.getElementById('btnPostRef');
    const timerBox = document.getElementById('cooldownTimer');
    
    if(!btn) return;
    if (lastPost) {
        const remaining = parseInt(lastPost) + POST_COOLDOWN - Date.now();
        if (remaining > 0) {
            btn.disabled = true;
            if(timerBox) timerBox.classList.remove('hidden');
            runCountdown(remaining);
            return;
        }
    }
    btn.disabled = false;
    if(timerBox) timerBox.classList.add('hidden');
}

function runCountdown(ms) {
    const span = document.getElementById('timer');
    const int = setInterval(() => {
        const lastPost = localStorage.getItem('last_post_time');
        const nowRemaining = parseInt(lastPost) + POST_COOLDOWN - Date.now();
        if (nowRemaining <= 0) {
            clearInterval(int);
            updatePostButton();
        } else {
            const m = Math.floor(nowRemaining / 60000);
            const s = Math.floor((nowRemaining % 60000) / 1000);
            if(span) span.innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
        }
    }, 1000);
}

// Global Event for Posting
document.addEventListener('click', async (e) => {
    if(e.target && e.target.id === 'btnPostRef') {
        try {
            const last5 = activeUser.slice(-5);
            const postText = `User[${last5}]: Join using my code <b>${myActiveReferralCode}</b> 🌿`;

            await addDoc(collection(db, "chatlogs"), {
                text: postText,
                sender: activeUser,
                timestamp: serverTimestamp()
            });

            localStorage.setItem('last_post_time', Date.now().toString());
            updatePostButton();
        } catch (err) { console.error(err); }
    }
});

// Clipboard Helper
window.copyToClipboard = (textToCopy, element) => {
    if(!textToCopy) return;
    navigator.clipboard.writeText(textToCopy).then(() => {
        const icon = element.querySelector('i') || element;
        const originalClass = icon.className;
        icon.className = "fa-solid fa-check";
        setTimeout(() => icon.className = originalClass, 1500);
    });
};

window.onload = init;
