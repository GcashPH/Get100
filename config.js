import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

// Initialize
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let step = 1; 
let secretKey = "";
let confirmKey = "";
let mobileNum = "";

const mobileInput = document.getElementById('mobile');
const keypadSection = document.getElementById('keypad-section');
const instruction = document.getElementById('instruction');
const dots = document.querySelectorAll('.dot');
const registerBtn = document.getElementById('btnRegister');

// Validation: 11 digits and starts with 09
mobileInput.addEventListener('input', (e) => {
    let val = e.target.value;
    if (val.length === 11) {
        if (val.startsWith("09")) {
            document.getElementById('mobile-err').classList.add('hidden');
            mobileNum = val;
            switchToKeypad();
        } else {
            document.getElementById('mobile-err').classList.remove('hidden');
        }
    }
});

function switchToKeypad() {
    document.getElementById('mobile-section').classList.add('hidden');
    keypadSection.classList.remove('hidden');
    instruction.innerText = "Set 6-Digit Secret Key";
    step = 2;
}

// Keypad Clicks
document.querySelectorAll('.key').forEach(key => {
    key.addEventListener('click', () => {
        const val = key.getAttribute('data-val');
        handleKeyPress(val);
    });
});

function handleKeyPress(num) {
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
                alert("Keys do not match! Try again.");
                secretKey = ""; confirmKey = ""; step = 2;
                instruction.innerText = "Set 6-Digit Secret Key";
                resetDots();
            }
        }
    }
}

function updateDots(len) {
    dots.forEach((dot, i) => {
        i < len ? dot.classList.add('active') : dot.classList.remove('active');
    });
}

function resetDots() {
    dots.forEach(dot => dot.classList.remove('active'));
}

registerBtn.onclick = async () => {
    const signature = btoa(navigator.userAgent + screen.width); // Simple device signature
    try {
        await set(ref(db, 'users/' + mobileNum), {
            mobile: mobileNum,
            secretKey: secretKey,
            deviceFingerprint: signature,
            createdAt: new Date().toISOString()
        });
        alert("Registration Successful!");
        location.reload();
    } catch (e) {
        alert("Firebase Error: " + e.message);
    }
};
