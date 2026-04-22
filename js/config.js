import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, collection, query, where, getDocs 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = { /* IYONG FIREBASE CONFIG DITO */ };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 1. UNIQUE DEVICE SIGNATURE
const currentSig = btoa(navigator.userAgent + screen.width).slice(0, 24);

// Elements Mapping
const scanLayer = document.getElementById('scan-layer');
const authLayer = document.getElementById('auth-layer');
const mobileBox = document.getElementById('mobile-box');
const keypadSection = document.getElementById('keypad-section');
const uiSubtitle = document.getElementById('ui-subtitle');
const userBadge = document.getElementById('user-badge');
const maskedIdLabel = document.getElementById('masked-id');
const btnAction = document.getElementById('btnAction');

let detectedUserID = null; // Dito i-store kung recognized ang device
let enteredPin = "";

async function checkDevice() {
    // START 3-SECOND TIMER (Para hindi ma-stuck sa loading)
    const timerPromise = new Promise(res => setTimeout(() => res("timeout"), 3000));
    
    // START DATABASE SCAN
    const scanPromise = (async () => {
        try {
            const q = query(collection(db, "users"), where("signatures", "array-contains", currentSig));
            const snap = await getDocs(q);
            return snap;
        } catch (e) { return null; }
    })();

    // Alinman ang mauna: 3 seconds o ang Database Result
    const result = await Promise.race([timerPromise, scanPromise]);

    // Transition UI
    scanLayer.classList.add('hidden');
    authLayer.classList.remove('hidden');

    if (result !== "timeout" && result && !result.empty) {
        // --- CASE: DEVICE RECOGNIZED ---
        detectedUserID = result.docs[0].id;
        localStorage.setItem('active_user', detectedUserID);
        
        uiSubtitle.innerText = "Welcome Back!";
        userBadge.classList.remove('hidden');
        maskedIdLabel.innerText = detectedUserID.replace(/(\d{2})(\d{5})(\d{4})/, "$1*******$3");
        
        mobileBox.classList.add('hidden'); // Itago ang input box
        keypadSection.classList.remove('hidden'); 
    } else {
        // --- CASE: NEW DEVICE / TIMEOUT ---
        uiSubtitle.innerText = "Security Check: Unrecognized Device";
        mobileBox.classList.remove('hidden');
        keypadSection.classList.remove('hidden');
        userBadge.classList.add('hidden');
    }
}

// 2. KEYPAD LOGIC
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

// 3. THE GATEKEEPER ACTION (Verify & Register)
btnAction.onclick = async () => {
    const mobileInput = document.getElementById('mobile').value.trim();
    const finalUserID = detectedUserID || mobileInput;

    if (!finalUserID || finalUserID.length !== 11) {
        alert("Please enter a valid 11-digit mobile number.");
        return;
    }

    try {
        const userRef = doc(db, "users", finalUserID);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            // LOGIN / LINK DEVICE: I-verify ang Secret Key
            if (userSnap.data().secretKey === enteredPin) {
                // Kung bagong device ito, i-save ang signature
                if (!detectedUserID) {
                    await updateDoc(userRef, {
                        signatures: arrayUnion(currentSig)
                    });
                }
                successAuth(finalUserID);
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
            successAuth(finalUserID);
        }
    } catch (err) {
        console.error(err);
        alert("Connection Error. Please try again.");
    }
};

function resetPin() {
    enteredPin = "";
    updateDots();
    btnAction.classList.add('hidden');
}

function successAuth(uid) {
    localStorage.setItem('active_user', uid);
    window.location.href = "main.html";
}

window.onload = checkDevice;
