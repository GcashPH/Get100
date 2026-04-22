import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

// Elements
const mobileInput = document.getElementById('mobile');
const keypadSection = document.getElementById('keypad-section');
const instruction = document.getElementById('instruction');
const dots = document.querySelectorAll('.dot');
const registerBtn = document.getElementById('btnRegister');

let step = 0; // 0: Check, 1: Mobile, 2: Key, 3: Confirm, 4: Login
let secretKey = "";
let confirmKey = "";
let mobileNum = "";
let registeredKey = ""; // Key galing sa DB

// --- 1. DEVICE SIGNATURE GENERATOR ---
const getSignature = () => btoa(navigator.userAgent + screen.width + screen.height);

// --- 2. AUTO-CHECK ON LOAD ---
window.addEventListener('load', async () => {
    const localSig = localStorage.getItem('device_sig');
    const currentSig = getSignature();

    // Check database kung ang signature na ito ay registered
    const dbRef = ref(db);
    try {
        // Nag-search tayo sa 'signatures' node (dapat i-save natin ito during reg)
        const snapshot = await get(child(dbRef, `signatures/${currentSig}`));
        
        if (snapshot.exists()) {
            // MATCH FOUND: Login Mode
            const data = snapshot.val();
            mobileNum = data.mobile;
            
            // Kunin ang actual user data para sa verification
            const userSnap = await get(child(dbRef, `users/${mobileNum}`));
            registeredKey = userSnap.val().secretKey;

            showLoginUI();
        } else {
            // NO MATCH: Registration Mode
            instruction.innerText = "Device not recognized. Please Register.";
            step = 1;
        }
    } catch (e) {
        console.error("Auth Error:", e);
    }
});

function showLoginUI() {
    step = 4;
    document.getElementById('mobile-section').classList.add('hidden');
    keypadSection.classList.remove('hidden');
    instruction.innerHTML = `Welcome back!<br><small>User: ${mobileNum}</small><br>Enter 6-digit code`;
    resetDots();
}

// --- 3. KEYPAD LOGIC ---
document.querySelectorAll('.key').forEach(key => {
    key.addEventListener('click', () => {
        const val = key.getAttribute('data-val');
        
        if (step === 4) handleLoginPress(val); // Login mode
        else handleRegistrationPress(val);    // Register mode
    });
});

function handleLoginPress(num) {
    secretKey += num;
    updateDots(secretKey.length);
    
    if (secretKey.length === 6) {
        if (secretKey === registeredKey) {
            alert("Login Success! Redirecting to Dashboard...");
            // location.href = "dashboard.html";
        } else {
            alert("Wrong Key! Try again.");
            secretKey = "";
            resetDots();
        }
    }
}

function handleRegistrationPress(num) {
    if (step === 2 && secretKey.length < 6) {
        secretKey += num;
        updateDots(secretKey.length);
        if (secretKey.length === 6) {
            setTimeout(() => {
                step = 3;
                instruction.innerText = "Confirm Secret Key";
                resetDots();
            }, 300);
        }
    } else if (step === 3 && confirmKey.length < 6) {
        confirmKey += num;
        updateDots(confirmKey.length);
        if (confirmKey.length === 6) {
            if (secretKey === confirmKey) {
                registerBtn.classList.remove('hidden');
                instruction.innerText = "Keys match! Ready to register.";
            } else {
                alert("Keys do not match!");
                secretKey = ""; confirmKey = ""; step = 2;
                resetDots();
            }
        }
    }
}

// --- 4. REGISTRATION EXECUTION ---
registerBtn.onclick = async () => {
    const sig = getSignature();
    try {
        // Save User Data
        await set(ref(db, 'users/' + mobileNum), {
            mobile: mobileNum,
            secretKey: secretKey,
            deviceFingerprint: sig,
            createdAt: new Date().toISOString()
        });

        // Save Signature Lookup (Para mabilis ang checking sa load)
        await set(ref(db, 'signatures/' + sig), {
            mobile: mobileNum
        });

        localStorage.setItem('device_sig', sig);
        alert("Device Registered Successfully!");
        location.reload();
    } catch (e) {
        alert("Error: " + e.message);
    }
};

// Mobile Input Listener
mobileInput.addEventListener('input', (e) => {
    let val = e.target.value;
    if (val.length === 11 && val.startsWith("09")) {
        mobileNum = val;
        document.getElementById('mobile-section').classList.add('hidden');
        keypadSection.classList.remove('hidden');
        instruction.innerText = "Set 6-Digit Secret Key";
        step = 2;
    }
});

function updateDots(len) {
    dots.forEach((dot, i) => i < len ? dot.classList.add('active') : dot.classList.remove('active'));
}

function resetDots() {
    dots.forEach(dot => dot.classList.remove('active'));
}
