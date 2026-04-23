import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, collection, query, where, getDocs 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// --- 1. GENERATE HARDWARE DATA ---
const getSpecs = () => btoa(navigator.userAgent + screen.width).slice(0, 24);
const getFingerprint = () => btoa(navigator.hardwareConcurrency + navigator.language + screen.colorDepth).slice(0, 16);

const currentSig = getSpecs();
const currentFP = getFingerprint();

// UI Elements
const scanLayer = document.getElementById('scan-layer');
const authLayer = document.getElementById('auth-layer');
const mobileBox = document.getElementById('mobile-box');
const keypadSection = document.getElementById('keypad-section');
const uiSubtitle = document.getElementById('ui-subtitle');
const btnAction = document.getElementById('btnAction');
const mobileInput = document.getElementById('mobile');
const userBadge = document.getElementById('user-badge');

let authMode = "SCAN"; // SCAN, LOGIN, REGISTER, CONFIRM
let tempPIN = "";
let enteredPIN = "";
let targetUserID = localStorage.getItem('local_userID');

async function initGatekeeper() {
    console.log("Gatekeeper started. Specs:", currentSig, currentFP);

    // 1. FAIL-SAFE TIMER (Ang 'Pilit' na taga-alis ng Loading Screen)
    const forceProceed = setTimeout(() => {
        if (!scanLayer.classList.contains('hidden')) {
            console.warn("Scan timed out. Proceeding to Manual Input.");
            showManualInputUI();
            scanLayer.classList.add('hidden');
            authLayer.classList.remove('hidden');
        }
    }, 5000); // 5 seconds max loading

    try {
        // 2. CHECK LOCAL DATA
        if (!targetUserID) {
            console.log("No local user found. Showing Manual UI.");
            clearTimeout(forceProceed); // Patayin ang timer dahil tapos na tayo
            showManualInputUI();
            scanLayer.classList.add('hidden');
            authLayer.classList.remove('hidden');
            return;
        }

        // 3. DB SCAN (Kung may local_userID)
        const userRef = doc(db, "users", targetUserID);
        const userSnap = await getDoc(userRef);

        clearTimeout(forceProceed); // Patayin ang timer kung sumagot agad ang DB

        if (userSnap.exists()) {
            const data = userSnap.data();
            const isSigMatch = data.signatures?.includes(currentSig);
            const isFPMatch = data.fingerprint === currentFP;

            if (isSigMatch && isFPMatch) {
                // RECOGNIZED: Ipakita ang Verify Access (Fingerprint Button)
                showLoginUI(targetUserID, true);
            } else {
                // USER EXISTS PERO NEW DEVICE: Ipakita rin ang Verify Access (PIN required)
                showLoginUI(targetUserID, false);
            }
        } else {
            // HINDI EXIST SA DB: Register mode
            showManualInputUI();
        }

    } catch (err) {
        console.error("Gatekeeper Error:", err);
        showManualInputUI(); // Fallback sa manual input kung may database error
    } finally {
        // Siguraduhin na laging mawawala ang loading screen sa dulo
        scanLayer.classList.add('hidden');
        authLayer.classList.remove('hidden');
    }
}

// --- 2. UI CONTROL FUNCTIONS ---

function showLoginUI(uid, isRecognized) {
    authMode = "LOGIN";
    targetUserID = uid;
    uiSubtitle.innerText = isRecognized ? "Recognized Device" : "User Found: Verify Access";
    
    // Ipakita ang Fingerprint Button (Verify Access)
    userBadge.classList.remove('hidden');
    document.getElementById('masked-id').innerText = uid.replace(/(\d{2})(\d{5})(\d{4})/, "$1*******$3");
    
    mobileBox.classList.add('hidden');
    keypadSection.classList.remove('hidden');
}

function showManualInputUI() {
    authMode = "SCAN";
    uiSubtitle.innerText = "Enter 11-digit Mobile Number";
    mobileBox.classList.remove('hidden');
    keypadSection.classList.add('hidden');
    userBadge.classList.add('hidden');
}

// --- 3. INPUT LOGIC ---

// Pag-type sa Mobile Input
mobileInput.oninput = async () => {
    if (mobileInput.value.length === 11) {
        const userSnap = await getDoc(doc(db, "users", mobileInput.value));
        if (userSnap.exists()) {
            showLoginUI(mobileInput.value, false);
        } else {
            authMode = "REGISTER";
            uiSubtitle.innerText = "New Number: Set 6-Digit Secret Key";
            mobileBox.classList.add('hidden');
            keypadSection.classList.remove('hidden');
            targetUserID = mobileInput.value;
        }
    }
};

// Keypad Handler
document.querySelectorAll('.key').forEach(key => {
    key.onclick = () => {
        if (enteredPIN.length < 6) {
            enteredPIN += key.dataset.val;
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

// --- 4. FINAL DATABASE ACTIONS ---

btnAction.onclick = async () => {
    try {
        if (authMode === "LOGIN") {
            const userRef = doc(db, "users", targetUserID);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.data().secretKey === enteredPIN) {
                // Register Device Signatures & Fingerprint upon match
                await updateDoc(userRef, {
                    signatures: arrayUnion(currentSig),
                    fingerprint: currentFP, // Store/Update fingerprint
                    owner: targetUserID // Ensure owner name is stored
                });
                completeAuth();
            } else {
                alert("Invalid Secret Key!");
                enteredPIN = ""; updateDots();
            }
        } 
        else if (authMode === "REGISTER") {
            tempPIN = enteredPIN;
            enteredPIN = "";
            updateDots();
            authMode = "CONFIRM";
            uiSubtitle.innerText = "Confirm your 6-Digit Secret Key";
            btnAction.classList.add('hidden');
        } 
        else if (authMode === "CONFIRM") {
            if (enteredPIN === tempPIN) {
                await setDoc(doc(db, "users", targetUserID), {
                    userID: targetUserID,
                    owner: targetUserID,
                    secretKey: enteredPIN,
                    signatures: [currentSig],
                    fingerprint: currentFP,
                    earnings: 0,
                    referralCode: "REF" + Math.floor(1000 + Math.random() * 9000),
                    Referral_status: "New"
                });
                completeAuth();
            } else {
                alert("Keys do not match! Restarting...");
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
