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
