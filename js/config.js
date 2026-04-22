import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAK5I_7WeKouFM08SeOZcDHrXsgckYoULg",
    authDomain: "get100-8333e.firebaseapp.com",
    projectId: "get100-8333e",
    storageBucket: "get100-8333e.firebasestorage.app",
    messagingSenderId: "242341429618",
    appId: "1:242341429618:web:c596b279f746dc22851deb",
    measurementId: "G-Y8TW2M3494"
};

// Initialize Firebase & Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let step = 0; 
let tempKey = "", confirmKey = "", mobileNum = "", dbKey = "";
const getSignature = () => btoa(navigator.userAgent + screen.width + screen.height);

window.onload = () => {
    // Start Scanning Effect
    setTimeout(checkDevice, 2500); 
};

async function checkDevice() {
    const signature = getSignature();
    
    try {
        // Firestore path: signatures/{signature}
        const sigRef = doc(db, "signatures", signature);
        const sigSnap = await getDoc(sigRef);
        
        document.getElementById('scan-layer').classList.add('hidden');
        document.getElementById('auth-layer').classList.remove('hidden');

        if (sigSnap.exists()) {
            mobileNum = sigSnap.data().owner;
            // Firestore path: users/{mobileNum}
            const userRef = doc(db, "users", mobileNum);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                dbKey = userSnap.data().secretKey;
                setupLoginUI();
            }
        } else {
            setupRegisterUI();
        }
    } catch (e) {
        console.error("Connection Error", e);
        document.getElementById('ui-subtitle').innerText = "Database Connection Error";
    }
}

function setupLoginUI() {
    step = 4;
    document.getElementById('ui-title').innerText = "SECURE LOGIN";
    document.getElementById('ui-subtitle').innerText = "Welcome back!";
    document.getElementById('user-badge').classList.remove('hidden');
    document.getElementById('mobile-box').classList.add('hidden');
    document.getElementById('keypad-section').classList.remove('hidden');
    
    const masked = mobileNum.substring(0, 2) + "*****" + mobileNum.substring(7);
    document.getElementById('masked-id').innerText = masked;
}

function setupRegisterUI() {
    step = 1;
    document.getElementById('ui-title').innerText = "REGISTER DEVICE";
    document.getElementById('ui-subtitle').innerText = "Enter mobile to start";
    document.getElementById('mobile-box').classList.remove('hidden');
}

// Keypad Event Listeners
document.querySelectorAll('.key').forEach(k => {
    k.onclick = () => {
        const val = k.dataset.val;
        if (step === 4) handleLogin(val);
        else handleRegistration(val);
    };
});

function handleLogin(val) {
    if (tempKey.length < 6) {
        tempKey += val;
        updateDots(tempKey.length);
        if (tempKey.length === 6) {
            if (tempKey === dbKey) {
                localStorage.setItem('active_user', mobileNum);
                window.location.href = "main.html";
            } else {
                alert("Incorrect PIN");
                tempKey = ""; resetDots();
            }
        }
    }
}

function handleRegistration(val) {
    if (step === 2) {
        tempKey += val;
        updateDots(tempKey.length);
        if (tempKey.length === 6) {
            step = 3;
            resetDots();
            document.getElementById('ui-subtitle').innerText = "Confirm your 6-digit PIN";
        }
    } else if (step === 3) {
        confirmKey += val;
        updateDots(confirmKey.length);
        if (confirmKey.length === 6) {
            if (tempKey === confirmKey) {
                document.getElementById('btnAction').classList.remove('hidden');
                document.getElementById('ui-subtitle').innerText = "PIN Match! Click Proceed.";
            } else {
                alert("PINs do not match. Restarting...");
                tempKey = ""; confirmKey = ""; step = 2;
                resetDots();
            }
        }
    }
}

document.getElementById('mobile').oninput = (e) => {
    let v = e.target.value;
    if (v.length === 11 && v.startsWith("09")) {
        mobileNum = v;
        document.getElementById('mobile-box').classList.add('hidden');
        document.getElementById('keypad-section').classList.remove('hidden');
        document.getElementById('ui-subtitle').innerText = "Create 6-digit PIN";
        step = 2;
    }
};

document.getElementById('btnAction').onclick = async () => {
    const sig = getSignature();
    try {
        // Firestore SetDoc for User
        await setDoc(doc(db, "users", mobileNum), {
            secretKey: tempKey,
            device_id: sig,
            registeredAt: new Date().toISOString(),
            earnings: 0, // Initial balance
            referralCode: Math.random().toString(36).substring(2, 8).toUpperCase()
        });

        // Firestore SetDoc for Signature
        await setDoc(doc(db, "signatures", sig), {
            owner: mobileNum
        });

        localStorage.setItem('active_user', mobileNum);
        window.location.href = "main.html";
    } catch (e) {
        console.error(e);
        alert("Registration Failed");
    }
};

function updateDots(l) {
    const dots = document.querySelectorAll('.dot');
    dots.forEach((d, i) => i < l ? d.classList.add('active') : d.classList.remove('active'));
}

function resetDots() {
    document.querySelectorAll('.dot').forEach(d => d.classList.remove('active'));
}
