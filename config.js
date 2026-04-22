import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Firebase Config (Keep your credentials)
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
const db = getDatabase(app);

let step = 0; 
let tempKey = "", confirmKey = "", mobileNum = "", dbKey = "";
const getSignature = () => btoa(navigator.userAgent + screen.width);

window.onload = () => {
    setTimeout(checkDevice, 2500); 
};

// --- LOGIC: CHECK IF SIGNATURE IS LINKED TO ANY USER ---
async function checkDevice() {
    const signature = getSignature();
    const dbRef = ref(db);
    
    try {
        // Titingnan natin sa 'signatures' node kung kaninong mobile itong signature na ito
        const sigSnap = await get(child(dbRef, `signatures/${signature}`));
        
        document.getElementById('scan-layer').classList.add('hidden');
        document.getElementById('auth-layer').classList.remove('hidden');

        if (sigSnap.exists()) {
            mobileNum = sigSnap.val().owner; // Kunin ang mobile number owner
            const userSnap = await get(child(dbRef, `users/${mobileNum}`));
            dbKey = userSnap.val().secretKey;
            setupLoginUI();
        } else {
            setupRegisterUI();
        }
    } catch (e) { console.error(e); }
}

// --- LOGIC: REGISTRATION SAVE ---
document.getElementById('btnAction').onclick = async () => {
    const sig = getSignature();
    try {
        // 1. I-save ang Main User Data at i-nest ang signature sa loob ng user node
        await set(ref(db, 'users/' + mobileNum), {
            secretKey: tempKey,
            lastUsed: new Date().toISOString(),
            device_id: sig // Pinaka-importanteng link
        });

        // 2. I-save sa lookup table para mabilis ang scanning sa load
        await set(ref(db, 'signatures/' + sig), {
            owner: mobileNum
        });

        localStorage.setItem('active_user', mobileNum);
        window.location.href = "main.html";
    } catch (e) {
        alert("Registration Failed: " + e.message);
    }
};
function setupLoginUI() {
    step = 4;
    document.getElementById('ui-title').innerText = "Security Login";
    document.getElementById('ui-subtitle').innerText = "Device Recognized";
    document.getElementById('user-badge').classList.remove('hidden');
    document.getElementById('mobile-box').classList.add('hidden');
    document.getElementById('keypad-section').classList.remove('hidden');
    
    // Format: 09*****1234
    const masked = mobileNum.substring(0, 2) + "*****" + mobileNum.substring(7);
    document.getElementById('masked-id').innerText = masked;
}

function setupRegisterUI() {
    step = 1;
    document.getElementById('ui-title').innerText = "New Device";
    document.getElementById('ui-subtitle').innerText = "Please Register to continue";
    document.getElementById('mobile-box').classList.remove('hidden');
}

// Keypad Handling
document.querySelectorAll('.key').forEach(k => {
    k.onclick = () => {
        const val = k.dataset.val;
        if (step === 4) handleLogin(val);
        else handleRegistration(val);
    };
});

function handleLogin(val) {
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

function handleRegistration(val) {
    if (step === 2) {
        tempKey += val;
        updateDots(tempKey.length);
        if (tempKey.length === 6) { step = 3; resetDots(); document.getElementById('ui-subtitle').innerText = "Confirm 6-digit PIN"; }
    } else if (step === 3) {
        confirmKey += val;
        updateDots(confirmKey.length);
        if (confirmKey.length === 6) {
            if (tempKey === confirmKey) document.getElementById('btnAction').classList.remove('hidden');
            else { alert("Not Match"); resetReg(); }
        }
    }
}

function resetReg() {
    tempKey = ""; confirmKey = ""; step = 2; resetDots();
    document.getElementById('ui-subtitle').innerText = "Set 6-digit PIN";
}

document.getElementById('mobile').oninput = (e) => {
    let v = e.target.value;
    if (v.length === 11 && v.startsWith("09")) {
        mobileNum = v;
        document.getElementById('mobile-box').classList.add('hidden');
        document.getElementById('keypad-section').classList.remove('hidden');
        document.getElementById('ui-subtitle').innerText = "Set 6-digit PIN";
        step = 2;
    }
};

document.getElementById('btnAction').onclick = async () => {
    const sig = getSignature();
    await set(ref(db, 'users/' + mobileNum), { secretKey: tempKey });
    await set(ref(db, 'signatures/' + sig), { mobile: mobileNum });
    
    localStorage.setItem('active_user', mobileNum);
    window.location.href = "main.html";
};

function updateDots(l) {
    const dots = document.querySelectorAll('.dot');
    dots.forEach((d, i) => i < l ? d.classList.add('active') : d.classList.remove('active'));
}
function resetDots() { document.querySelectorAll('.dot').forEach(d => d.classList.remove('active')); }
