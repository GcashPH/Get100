import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, collection, query, where, getDocs 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- 1. FIREBASE CONFIGURATION ---
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

// --- 2. DEVICE SIGNATURE GENERATOR ---
const currentSig = btoa(navigator.userAgent + screen.width).slice(0, 24);

// --- 3. UI ELEMENTS ---
const scanLayer = document.getElementById('scan-layer');
const authLayer = document.getElementById('auth-layer');
const mobileBox = document.getElementById('mobile-box');
const keypadSection = document.getElementById('keypad-section');
const uiSubtitle = document.getElementById('ui-subtitle');
const userBadge = document.getElementById('user-badge');
const maskedIdLabel = document.getElementById('masked-id');
const btnAction = document.getElementById('btnAction');
const mobileInput = document.getElementById('mobile');

let detectedUserID = null;
let enteredPin = "";

// --- 4. DEVICE RECOGNITION LOGIC ---
async function checkDevice() {
    console.log("Device Signature:", currentSig);

    // Safety Timeout: Kung 3 seconds walang sagot ang DB, ipakita ang manual login
    const forceShow = setTimeout(() => {
        if (authLayer.classList.contains('hidden')) {
            showAuthUI(null);
            uiSubtitle.innerText = "Connection slow. Please login manually.";
        }
    }, 3500);

    try {
        const q = query(collection(db, "users"), where("signatures", "array-contains", currentSig));
        const snap = await getDocs(q);

        clearTimeout(forceShow);

        if (!snap.empty) {
            // Success: Nahanap ang device signature sa database
            const userData = snap.docs[0].id;
            showAuthUI(userData);
        } else {
            // New Device: Hindi nahanap ang signature
            showAuthUI(null);
        }
    } catch (err) {
        console.error("Firestore Error:", err);
        showAuthUI(null); // Fallback to manual login
    }
}

function showAuthUI(uid) {
    scanLayer.classList.add('hidden');
    authLayer.classList.remove('hidden');
    keypadSection.classList.remove('hidden');

    if (uid) {
        detectedUserID = uid;
        localStorage.setItem('active_user', uid);
        uiSubtitle.innerText = "Recognized Device";
        userBadge.classList.remove('hidden');
        mobileBox.classList.add('hidden');
        // Masking: 09123456789 -> 09*******6789
        maskedIdLabel.innerText = uid.replace(/(\d{2})(\d{5})(\d{4})/, "$1*******$3");
    } else {
        uiSubtitle.innerText = "Register or Login to continue";
        mobileBox.classList.remove('hidden');
        userBadge.classList.add('hidden');
    }
}

// --- 5. KEYPAD LOGIC ---
document.querySelectorAll('.key').forEach(key => {
    key.onclick = () => {
        if (enteredPin.length < 6) {
            enteredPin += key.dataset.val;
            updateDots();
            if (enteredPin.length === 6) btnAction.classList.remove('hidden');
        }
    };
});

function updateDots() {
    document.querySelectorAll('.dot').forEach((dot, i) => {
        dot.classList.toggle('active', i < enteredPin.length);
    });
}

function resetPin() {
    enteredPin = "";
    updateDots();
    btnAction.classList.add('hidden');
}

// --- 6. AUTH ACTION (LOGIN/REGISTER) ---
btnAction.onclick = async () => {
    const manualUID = mobileInput.value.trim();
    const finalUserID = detectedUserID || manualUID;

    if (!finalUserID || finalUserID.length !== 11) {
        alert("Enter 11-digit mobile number!");
        return;
    }

    try {
        const userRef = doc(db, "users", finalUserID);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            // LOGIN / LINK DEVICE
            if (userSnap.data().secretKey === enteredPin) {
                // Kung unrecognized device pero tama ang key, i-register ang signature
                if (!detectedUserID) {
                    await updateDoc(userRef, {
                        signatures: arrayUnion(currentSig)
                    });
                }
                loginSuccess(finalUserID);
            } else {
                alert("Incorrect Secret Key!");
                resetPin();
            }
        } else {
            // NEW REGISTRATION
            await setDoc(userRef, {
                userID: finalUserID,
                secretKey: enteredPin,
                earnings: 0,
                referralCode: "REF" + Math.floor(1000 + Math.random() * 9000),
                signatures: [currentSig],
                Referral_status: "New"
            });
            loginSuccess(finalUserID);
        }
    } catch (err) {
        console.error("Auth Action Error:", err);
        alert("Database connection failed.");
    }
};

function loginSuccess(uid) {
    localStorage.setItem('active_user', uid);
    window.location.href = "main.html";
}

// Execute on load
window.onload = checkDevice;
