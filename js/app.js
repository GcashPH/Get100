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
let myActiveReferralCode = "LOADING..."; 

async function init() {
    // 1. BASIC CHECK: Kung walang user sa local storage o hindi 11 digits
    if (!activeUser || activeUser.length !== 11) { 
        window.location.href = "index.html"; 
        return; 
    }
    
    try {
        const userRef = doc(db, "users", activeUser);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            // SUCCESS: Recognized UserID. Ipakita ang dashboard.
            // Siguraduhin na ang body ay hindi naka-hide sa CSS
            document.body.style.display = "block"; 
            
            // I-setup ang UI elements
            const displayIdEl = document.getElementById('displayUserID');
            const gPrefixEl = document.getElementById('gcashPrefix');
            
            if(displayIdEl) displayIdEl.innerText = activeUser;
            if(gPrefixEl) gPrefixEl.value = activeUser;
            
        } else {
            // UserID ay wala sa database
            localStorage.clear();
            window.location.href = "index.html";
            return;
        }
    } catch (err) {
        console.error("Auth Error:", err);
        // Huwag i-redirect agad para makita ang error sa console kung bakit nag-white screen
        return;
    }

    // 2. REAL-TIME BALANCE & REFERRAL CODE FETCHING
    onSnapshot(doc(db, "users", activeUser), (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            
            // Balance Update
            const bal = (data.earnings || 0).toFixed(2);
            const mainBalEl = document.getElementById('mainBalance');
            const withdrawInput = document.getElementById('withdrawAmount');
            
            if(mainBalEl) mainBalEl.innerText = bal;
            if(withdrawInput) withdrawInput.value = bal;
            
            // Referral Code
            myActiveReferralCode = data.referralCode || "NONE"; 
            const displayRefEl = document.getElementById('displayreferralCode');
            if(displayRefEl) displayRefEl.innerText = myActiveReferralCode;
            
            // Promo Caption
            const captionEl = document.getElementById('promoCaption');
            if(captionEl) {
                captionEl.value = `Earn 100 GCash Credits by Inviting Friends, Walang babayaran FREE! gamitin ang aking Referral Code: ${myActiveReferralCode}`;
            }

            // Hide redeem section
            if (data.Referral_status === "Redeem") {
                const rs = document.getElementById('redeemSection');
                if(rs) rs.classList.add('hidden');
            }
        }
    });

    startLiveFeed();
    updatePostButton();
}

// --- UI HELPERS (Modals, GCash Logic, Feed) ---

// Modal Toggles
const wModal = document.getElementById('withdrawModal');
const iModal = document.getElementById('inviteModal');
const shareModal = document.getElementById('shareModal');

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
if(document.getElementById('closeShareModal')) {
    document.getElementById('closeShareModal').onclick = () => {
        shareModal.style.display = 'none';
    };
}

// GCash Validation
const changeNumBtn = document.getElementById('changeNumber');
const gcashPrefix = document.getElementById('gcashPrefix');
const gcashConfirm = document.getElementById('gcashConfirm');
const btnClaim = document.getElementById('btnClaimGcash');

if(changeNumBtn) {
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
        validateClaim(); 
    };
}

if(gcashConfirm) gcashConfirm.oninput = validateClaim;

function validateClaim() {
    if (btnClaim && gcashConfirm && gcashPrefix) {
        btnClaim.disabled = !(gcashConfirm.value === gcashPrefix.value && gcashPrefix.value.trim() !== '');
    }
}

// Live Feed Logic
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

// Post Referral Logic
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

if(document.getElementById('btnPostRef')) {
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
}

// Clipboard Helper
function copyToClipboard(textToCopy, iconElement) {
    if(!textToCopy) return;
    navigator.clipboard.writeText(textToCopy).then(() => {
        const originalClass = iconElement.className;
        iconElement.className = "fa-solid fa-check text-success";
        iconElement.style.color = "#00b894";
        setTimeout(() => {
            iconElement.className = originalClass;
            iconElement.style.color = ""; 
        }, 1500);
    });
}

// Listen for Init
window.onload = init;
