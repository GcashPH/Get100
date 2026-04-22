import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, collection, query, where, getDocs 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = { /* IYONG CONFIG DITO */ };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 1. GENERATE UNIQUE DEVICE SIGNATURE
const getDeviceSignature = () => {
    // Specs-based signature
    return btoa(navigator.userAgent + screen.width + screen.height + navigator.hardwareConcurrency).slice(0, 24);
};

const currentSig = getDeviceSignature();
let detectedUserID = null;

// UI Elements
const scanLayer = document.getElementById('scan-layer');
const authLayer = document.getElementById('auth-layer');
const userBadge = document.getElementById('user-badge');
const mobileBox = document.getElementById('mobile-box');
const keypadSection = document.getElementById('keypad-section');
const maskedIdLabel = document.getElementById('masked-id');
const uiSubtitle = document.getElementById('ui-subtitle');
const btnAction = document.getElementById('btnAction');

async function checkDevice() {
    console.log("Scanning signature:", currentSig);
    
    // Hanapin ang user na may-ari ng current signature sa kanilang 'signatures' array
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("signatures", "array-contains", currentSig));
    
    try {
        const querySnapshot = await getDocs(q);

        setTimeout(() => {
            scanLayer.classList.add('hidden');
            authLayer.classList.remove('hidden');

            if (!querySnapshot.empty) {
                // DEVICE RECOGNIZED
                const userDoc = querySnapshot.docs[0];
                detectedUserID = userDoc.id; // Ito yung 11-digit number
                
                showRecognizedUI(detectedUserID);
            } else {
                // DEVICE NOT RECOGNIZED (Login or Register Flow)
                uiSubtitle.innerText = "Device not recognized. Please Login/Register.";
                mobileBox.classList.remove('hidden');
                keypadSection.classList.remove('hidden'); // Ipakita ang keypad para sa PIN
            }
        }, 2000);
    } catch (err) {
        console.error("Scan Error:", err);
    }
}

function showRecognizedUI(uid) {
    detectedUserID = uid;
    localStorage.setItem('active_user', uid);
    
    uiSubtitle.innerText = "Recognized Device. Enter Secret Key.";
    userBadge.classList.remove('hidden');
    mobileBox.classList.add('hidden');
    
    // Masking: 09123456789 -> 09*******6789
    const masked = uid.replace(/(\d{2})(\d{5})(\d{4})/, "$1*******$3");
    maskedIdLabel.innerText = masked;
    keypadSection.classList.remove('hidden');
}

// 2. KEYPAD LOGIC
let enteredPin = "";
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

// 3. THE "ACTION" (LOGIN / REGISTER / LINK DEVICE)
btnAction.onclick = async () => {
    const mobileInput = document.getElementById('mobile').value.trim();

    try {
        if (detectedUserID) {
            // SCENARIO A: RECOGNIZED DEVICE (Login check only)
            const userSnap = await getDoc(doc(db, "users", detectedUserID));
            if (userSnap.exists() && userSnap.data().secretKey === enteredPin) {
                proceedToMain(detectedUserID);
            } else {
                alert("Incorrect Secret Key!");
                resetPin();
            }
        } else {
            // SCENARIO B: UNRECOGNIZED DEVICE
            if (mobileInput.length !== 11) return alert("Enter 11-digit mobile number!");

            const userRef = doc(db, "users", mobileInput);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                // EXISTING USER, NEW DEVICE: I-verify ang key bago i-save ang signature
                if (userSnap.data().secretKey === enteredPin) {
                    await updateDoc(userRef, {
                        signatures: arrayUnion(currentSig) // I-register ang bagong device signature
                    });
                    proceedToMain(mobileInput);
                } else {
                    alert("Wrong key for this existing account!");
                    resetPin();
                }
            } else {
                // NEW USER: Fresh Registration
                await setDoc(userRef, {
                    userID: mobileInput,
                    secretKey: enteredPin,
                    earnings: 0,
                    referralCode: "REF" + Math.floor(1000 + Math.random() * 9000),
                    signatures: [currentSig], // Unang signature
                    Referral_status: "New"
                });
                proceedToMain(mobileInput);
            }
        }
    } catch (err) {
        console.error("Action Error:", err);
        alert("System Error. Check Console.");
    }
};

function resetPin() {
    enteredPin = "";
    updateDots();
    btnAction.classList.add('hidden');
}

function proceedToMain(uid) {
    localStorage.setItem('active_user', uid);
    window.location.href = "main.html";
}

window.onload = checkDevice;
