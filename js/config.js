import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, collection, query, where, getDocs 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = { /* iyong config */ };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 1. GENERATE DEVICE SIGNATURE
const getDeviceSignature = () => {
    return btoa(navigator.userAgent + screen.width + screen.height).slice(0, 24);
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

async function checkDevice() {
    // Hanapin ang user na may-ari ng current signature sa 'signatures' array
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("signatures", "array-contains", currentSig));
    const querySnapshot = await getDocs(q);

    setTimeout(() => {
        scanLayer.classList.add('hidden');
        authLayer.classList.remove('hidden');

        if (!querySnapshot.empty) {
            // DEVICE RECOGNIZED (Existing Device)
            const userDoc = querySnapshot.docs[0];
            detectedUserID = userDoc.id;
            
            showKeypadFlow(detectedUserID);
        } else {
            // DEVICE NOT RECOGNIZED (New Device or New User)
            document.getElementById('ui-subtitle').innerText = "Security Check: Device not registered.";
            mobileBox.classList.remove('hidden');
        }
    }, 2000);
}

function showKeypadFlow(uid) {
    localStorage.setItem('active_user', uid);
    userBadge.classList.remove('hidden');
    mobileBox.classList.add('hidden');
    const masked = uid.replace(/(\d{2})(\d{5})(\d{4})/, "$1*******$3");
    maskedIdLabel.innerText = masked;
    keypadSection.classList.remove('hidden');
}

// 2. ACTION LOGIC (Login or Register New Device)
let enteredPin = "";
document.querySelectorAll('.key').forEach(key => {
    key.onclick = () => {
        if (enteredPin.length < 6) {
            enteredPin += key.dataset.val;
            updateDots();
            if (enteredPin.length === 6) document.getElementById('btnAction').classList.remove('hidden');
        }
    };
});

function updateDots() {
    document.querySelectorAll('.dot').forEach((dot, i) => {
        dot.classList.toggle('active', i < enteredPin.length);
    });
}

document.getElementById('btnAction').onclick = async () => {
    const mobileNum = document.getElementById('mobile').value;

    if (!detectedUserID) {
        // CHECK KUNG REGISTERED NA ANG USER SA IBANG DEVICE
        const userRef = doc(db, "users", mobileNum);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            // EXISTING USER, NEW DEVICE: I-verify ang Secret Key
            if (userSnap.data().secretKey === enteredPin) {
                await updateDoc(userRef, {
                    signatures: arrayUnion(currentSig) // Idagdag ang bagong device sa array
                });
                loginSuccess(mobileNum);
            } else {
                alert("Wrong Secret Key for this account!");
            }
        } else {
            // TOTOOONG NEW USER: Fresh Registration
            if (mobileNum.length !== 11) return alert("Invalid Number");
            await setDoc(userRef, {
                userID: mobileNum,
                secretKey: enteredPin,
                earnings: 0,
                referralCode: "REF" + Math.floor(1000 + Math.random() * 9000),
                signatures: [currentSig] // Unang device sa array
            });
            loginSuccess(mobileNum);
        }
    } else {
        // NORMAL LOGIN PARA SA RECOGNIZED DEVICE
        const userSnap = await getDoc(doc(db, "users", detectedUserID));
        if (userSnap.data().secretKey === enteredPin) {
            loginSuccess(detectedUserID);
        } else {
            alert("Incorrect Key!");
            enteredPin = ""; updateDots();
        }
    }
};

function loginSuccess(uid) {
    localStorage.setItem('active_user', uid);
    window.location.href = "main.html";
}

window.onload = checkDevice;
