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

const POST_COOLDOWN = 10 * 60 * 1000; 
let myActiveReferralCode = "LOADING..."; 

async function init() {
    if (!activeUser || activeUser.length !== 11) { 
        window.location.href = "index.html"; 
        return; 
    }
    
    try {
        const userRef = doc(db, "users", activeUser);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            document.body.classList.add('auth-success');
            
            const displayIdEl = document.getElementById('displayUserID');
            const gPrefixEl = document.getElementById('gcashPrefix');
            if(displayIdEl) displayIdEl.innerText = activeUser;
            if(gPrefixEl) gPrefixEl.value = activeUser;

            setupRealtimeListeners();
            startLiveFeed();
            updatePostButton();
            
        } else {
            localStorage.clear();
            window.location.href = "index.html";
            return;
        }
    } catch (err) {
        console.error("Auth Error:", err);
        document.body.classList.add('auth-success');
    }
}

function setupRealtimeListeners() {
    onSnapshot(doc(db, "users", activeUser), (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            const bal = (data.earnings || 0).toFixed(2);
            
            const mainBalEl = document.getElementById('mainBalance');
            const withdrawInput = document.getElementById('withdrawAmount');
            if(mainBalEl) mainBalEl.innerText = bal;
            if(withdrawInput) withdrawInput.value = `₱${bal}`;
            
            myActiveReferralCode = data.referralCode || "NONE"; 
            const displayRefEl = document.getElementById('displayreferralCode');
            if(displayRefEl) displayRefEl.innerText = myActiveReferralCode;
            
            const captionEl = document.getElementById('promoCaption');
            if(captionEl) {
                captionEl.value = `Earn 100 GCash Credits by Inviting Friends! FREE! Code: ${myActiveReferralCode}`;
            }
        }
    });
}

// --- MODAL & UI TOGGLES ---
const wModal = document.getElementById('withdrawModal');
const iModal = document.getElementById('inviteModal');
const shareModal = document.getElementById('shareModal');

document.getElementById('openWithdraw').onclick = () => wModal.style.display = 'flex';
document.getElementById('closeWithdraw').onclick = () => wModal.style.display = 'none';
document.getElementById('openInvite').onclick = () => iModal.style.display = 'flex';
document.getElementById('closeModal').onclick = () => iModal.style.display = 'none';

document.getElementById('openShareModal').onclick = () => {
    iModal.style.display = 'none'; 
    shareModal.style.display = 'flex'; 
};
document.getElementById('closeShareModal').onclick = () => shareModal.style.display = 'none';

// GCash Edit Number Logic
const changeNumBtn = document.getElementById('changeNumber');
const gcashPrefix = document.getElementById('gcashPrefix');
const gcashConfirm = document.getElementById('gcashConfirm');
const btnClaim = document.getElementById('btnClaimGcash');

changeNumBtn.onclick = function() {
    if (gcashPrefix.readOnly) {
        gcashPrefix.readOnly = false;
        gcashPrefix.classList.remove('locked');
        this.classList.replace('fa-circle-xmark', 'fa-circle-check');
        this.style.color = 'var(--success)';
        gcashPrefix.focus();
    } else {
        gcashPrefix.readOnly = true;
        gcashPrefix.classList.add('locked');
        this.classList.replace('fa-circle-check', 'fa-circle-xmark');
        this.style.color = 'var(--warning)';
    }
    validateClaim(); 
};

if(gcashConfirm) gcashConfirm.oninput = validateClaim;

function validateClaim() {
    if (btnClaim && gcashConfirm && gcashPrefix) {
        btnClaim.disabled = !(gcashConfirm.value === gcashPrefix.value && gcashPrefix.value.length === 11);
    }
}

// REMASTERED: Live Feed System with Custom Image
function addFeedItem(text, type, senderID = "") {
    const logs = document.getElementById('chatLogs');
    if(!logs) return;
    const div = document.createElement('div');
    const isMe = senderID === activeUser;
    
    div.className = `msg ${type === 'winner' ? 'winner-msg' : (isMe ? 'my-msg' : 'user-msg')}`;
    div.innerHTML = text;
    logs.prepend(div); 
    if (logs.childNodes.length > 15) logs.removeChild(logs.lastChild);
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

    // Auto-generate winners with the images/gc_icon.png
    setInterval(() => {
        const randID = "09" + Math.floor(10+Math.random()*80) + "***" + Math.floor(1000+Math.random()*9000);
        
        // Ginamit ang img tag na may tamang class para sa CSS styling natin
        const winnerHTML = `
            <img src="images/gc_icon.png" class="gc-icon-img" alt="GCash">
            <span class="winner-text">User ${randID} claimed</span>
            <span class="winner-amt">₱100.00!</span>
        `;
        
        addFeedItem(winnerHTML, 'winner');
    }, 45000); // Every 45 seconds
}

// Post Referral Function
async function handlePost() {
    const btn = document.getElementById('btnPostRef');
    try {
        const last5 = activeUser.slice(-5);
        await addDoc(collection(db, "chatlogs"), {
            text: `User[${last5}]: Use my code <b>${myActiveReferralCode}</b> 🚀`,
            sender: activeUser,
            timestamp: serverTimestamp()
        });
        localStorage.setItem('last_post_time', Date.now().toString());
        updatePostButton();
    } catch (err) { console.error(err); }
}
document.getElementById('btnPostRef').onclick = handlePost;

function updatePostButton() {
    const lastPost = localStorage.getItem('last_post_time');
    const btn = document.getElementById('btnPostRef');
    if (!lastPost) return;

    const remaining = parseInt(lastPost) + POST_COOLDOWN - Date.now();
    if (remaining > 0) {
        btn.disabled = true;
        document.getElementById('cooldownTimer').classList.remove('hidden');
        setTimeout(updatePostButton, 1000);
        const m = Math.floor(remaining / 60000);
        const s = Math.floor((remaining % 60000) / 1000);
        document.getElementById('timer').innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
    } else {
        btn.disabled = false;
        document.getElementById('cooldownTimer').classList.add('hidden');
    }
}

// Copy Code Helper
document.getElementById('copyreferralCode').onclick = function() {
    navigator.clipboard.writeText(myActiveReferralCode).then(() => {
        const originalClass = this.className;
        this.className = "fa-solid fa-check copy-icon";
        this.style.color = "var(--success)";
        setTimeout(() => {
            this.className = originalClass;
            this.style.color = ""; 
        }, 1500);
    });
};

init();
