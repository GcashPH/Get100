import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, doc, getDoc, setDoc 
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

// --- DEVICE FINGERPRINT GENERATOR ---
function generateDeviceSignature() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const txt = 'SocialConnect-Auth-v1.1';
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillText(txt, 2, 2);
    // Nag-ge-generate ito ng unique string base sa graphics card at browser engine ng device
    const b64 = canvas.toDataURL().replace("data:image/png;base64,", "");
    const bin = atob(b64.slice(-100, -50));
    let hash = 0;
    for (let i = 0; i < bin.length; i++) {
        hash = ((hash << 5) - hash) + bin.charCodeAt(i);
        hash |= 0;
    }
    return "SIG-" + Math.abs(hash) + "-" + navigator.userAgent.length;
}

const secretInput = document.getElementById('secretKeyInput');

// --- AUTOMATIC ENTER LOGIC ---
if (secretInput) {
    secretInput.oninput = function() {
        // Kapag umabot ng 11 digits (GCash format), automatic mag-e-enter
        if (this.value.length === 11) {
            processLogin(this.value);
        }
    };
}

async function processLogin(userID) {
    const statusEl = document.getElementById('authStatus');
    statusEl.innerText = "Verifying device...";
    
    const deviceSig = generateDeviceSignature();

    try {
        const userRef = doc(db, "users", userID);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const userData = userSnap.data();

            // CHECK DEVICE LOCK
            if (userData.DeviceSignature && userData.DeviceSignature !== deviceSig) {
                statusEl.innerText = "Error: This account is locked to another device.";
                statusEl.style.color = "#ff7675";
                return;
            }

            // REGISTER DEVICE IF NEW
            if (!userData.DeviceSignature) {
                await updateDoc(userRef, {
                    DeviceSignature: deviceSig,
                    LastLogin: new Date().toISOString()
                });
            }

            // SUCCESS
            localStorage.setItem('active_user', userID);
            statusEl.innerText = "Access Granted! Redirecting...";
            statusEl.style.color = "#00b894";
            
            setTimeout(() => {
                window.location.href = "main.html";
            }, 1000);

        } else {
            statusEl.innerText = "Invalid Key. Access Denied.";
            statusEl.style.color = "#ff7675";
        }
    } catch (err) {
        console.error(err);
        statusEl.innerText = "Connection Error.";
    }
}

// DOM Elements
const scanLayer = document.getElementById('scan-layer');
const authLayer = document.getElementById('auth-layer');
const mobileBox = document.getElementById('mobile-box');
const keypadSection = document.getElementById('keypad-section');
const uiSubtitle = document.getElementById('ui-subtitle');
const btnAction = document.getElementById('btnAction');
const mobileInput = document.getElementById('mobile');
const userBadge = document.getElementById('user-badge');
const dotContainer = document.querySelector('.dot-container'); // Para sa shake effect

let authMode = "INPUT"; 
let tempPIN = "";
let enteredPIN = "";
let targetUserID = localStorage.getItem('local_userID');

async function initGatekeeper() {
    setTimeout(() => {
        scanLayer.classList.add('hidden');
        authLayer.classList.remove('hidden');

        if (targetUserID && targetUserID.length === 11) {
            prepareLogin(targetUserID);
        } else {
            uiSubtitle.innerText = "Enter 11-digit Mobile Number";
            mobileBox.classList.remove('hidden');
        }
    }, 1500);
}

function prepareLogin(uid) {
    targetUserID = uid;
    authMode = "LOGIN";
    uiSubtitle.innerText = "Enter Secret Keys to Access";
    userBadge.classList.remove('hidden');
    document.getElementById('masked-id').innerText = uid.replace(/(\d{2})(\d{5})(\d{4})/, "$1*****$3");
    mobileBox.classList.add('hidden');
    keypadSection.classList.remove('hidden');
}

// Mobile Input Listener
mobileInput.oninput = async () => {
    if (mobileInput.value.length === 11) {
        const uid = mobileInput.value;
        const userSnap = await getDoc(doc(db, "users", uid));
        
        if (userSnap.exists()) {
            prepareLogin(uid);
        } else {
            targetUserID = uid;
            authMode = "REGISTER";
            uiSubtitle.innerText = "New User: Set 6-Digit Secret Keys";
            mobileBox.classList.add('hidden');
            keypadSection.classList.remove('hidden');
        }
    }
};

// Keypad Handler (Numbers + Clear)
document.querySelectorAll('.key').forEach(key => {
    key.onclick = () => {
        const val = key.dataset.val;

        if (val === "clear") {
            enteredPIN = "";
            updateDots();
            btnAction.classList.add('hidden');
            return;
        }

        if (enteredPIN.length < 6) {
            enteredPIN += val;
            updateDots();
            if (enteredPIN.length === 6) btnAction.classList.remove('hidden');
        }
    };
});

function updateDots() {
    document.querySelectorAll('.dot').forEach((dot, i) => {
        dot.classList.toggle('active', i < enteredPIN.length);
    });
}

// Shake Effect Function
function triggerErrorEffect() {
    dotContainer.classList.add('shake');
    if (navigator.vibrate) navigator.vibrate(200); // Vibrate for mobile
    setTimeout(() => dotContainer.classList.remove('shake'), 500);
    enteredPIN = "";
    updateDots();
    btnAction.classList.add('hidden');
}

// Button Action Logic
btnAction.onclick = async () => {
    try {
        if (authMode === "LOGIN") {
            const userSnap = await getDoc(doc(db, "users", targetUserID));
            if (userSnap.data().secretKey === enteredPIN) {
                completeAuth();
            } else {
                triggerErrorEffect(); // Shake pag mali ang PIN
            }
        } 
        else if (authMode === "REGISTER") {
            tempPIN = enteredPIN;
            enteredPIN = ""; 
            updateDots();
            authMode = "CONFIRM";
            uiSubtitle.innerText = "Confirm your 6-Digit Secret Keys";
            btnAction.classList.add('hidden');
        } 
        else if (authMode === "CONFIRM") {
            if (enteredPIN === tempPIN) {
                await setDoc(doc(db, "users", targetUserID), {
                    userID: targetUserID,
                    secretKey: enteredPIN,
                    earnings: 0,
                    referralCode: "REF" + Math.floor(1000 + Math.random() * 9000),
                    Referral_status: "New"
                });
                completeAuth();
            } else {
                alert("Keys do not match!");
                location.reload();
            }
        }
    } catch (err) {
        console.error(err);
    }
};

function completeAuth() {
    localStorage.setItem('active_user', targetUserID);
    localStorage.setItem('local_userID', targetUserID);
    window.location.href = "main.html";
}

window.onload = initGatekeeper;
