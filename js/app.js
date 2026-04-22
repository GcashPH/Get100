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

// --- NEW LOGIC: COPY & SHARE FLOW ---

// Modals
const shareModal = document.getElementById('shareModal');
const iModalRef = document.getElementById('inviteModal'); // Existing

// Global variable for user code
let myActiveReferralCode = "GET100"; 

// Update `init()` function to fetch user's referral code and set the text
// Ipagpalagay natin na nasa loob ito ng iyong onSnapshot(doc(db, "users", activeUser))
// Idagdag mo ito sa loob ng snapshot handler mo:
/*
    myActiveReferralCode = data.referralCode || "NEW123";
    document.getElementById('displayMyCode').innerText = myActiveReferralCode;
    // Auto-generate caption
    document.getElementById('promoCaption').value = `Earn 100 GCash Credits my Inviting Friends, Walang babayaran FREE! gamitin ang aking Referral Code: ${myActiveReferralCode}`;
*/

// Toggle Share Modal
document.getElementById('openShareModal').onclick = () => {
    iModalRef.style.display = 'none'; // Hide Invite Modal
    shareModal.style.display = 'flex'; // Show Share Modal
};
document.getElementById('closeShareModal').onclick = () => {
    shareModal.style.display = 'none';
};

// --- COPY FUNCTIONALITIES ---
function copyToClipboard(textToCopy, iconElement) {
    navigator.clipboard.writeText(textToCopy).then(() => {
        // Change icon to checkmark temporary for visual feedback
        const originalClass = iconElement.className;
        iconElement.className = "fa-solid fa-check text-success";
        iconElement.style.color = "#00b894";
        setTimeout(() => {
            iconElement.className = originalClass;
            iconElement.style.color = ""; // reset
        }, 1500);
    });
}

// 1. Copy Own Referral Code
document.getElementById('copyMyCode').onclick = function() {
    copyToClipboard(document.getElementById('displayMyCode').innerText, this);
};

// 2. Copy Caption
document.getElementById('btnCopyCaption').onclick = function() {
    const caption = document.getElementById('promoCaption').value;
    const icon = this.querySelector('i');
    copyToClipboard(caption, icon);
};

// 3. Copy URL
document.getElementById('btnCopyUrl').onclick = function() {
    const url = document.getElementById('shareUrl').value;
    copyToClipboard(url, this);
};

// --- BUTTON FUNCTIONALITIES ---

// Download Image Logic
document.getElementById('btnDownloadImg').onclick = function() {
    const imgSrc = document.getElementById('promoImage').src;
    const a = document.createElement('a');
    a.href = imgSrc;
    a.download = "Promo_Image.jpg"; // Set download filename
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};

// Post to Facebook Intent
document.getElementById('btnPostToFB').onclick = function() {
    // Opens Facebook share dialog (You can replace the URL with your actual site URL later)
    const shareUrl = encodeURIComponent("https://yourwebsite.com");
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`, '_blank');
};

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
