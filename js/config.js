import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAK5I_7WeKouFM08SeOZcDHrXsgckYoULg",
    authDomain: "get100-8333e.firebaseapp.com",
    projectId: "get100-8333e",
    storageBucket: "get100-8333e.firebasestorage.app",
    messagingSenderId: "242341429618",
    appId: "1:242341429618:web:c596b279f746dc22851deb",
    measurementId: "G-Y8TW2M3494"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let step = 0; 
let tempKey = "", confirmKey = "", mobileNum = "", dbKey = "";
const getSignature = () => btoa(navigator.userAgent + screen.width + screen.height);

window.onload = () => setTimeout(checkDevice, 2000);

async function checkDevice() {
    const signature = getSignature();
      try {
           const sigSnap = await getDoc(doc(db, "signatures", signature));
        document.getElementById('scan-layer').classList.add('hidden');
        document.getElementById('auth-layer').classList.remove('hidden');

        if (sigSnap.exists()) {
            mobileNum = sigSnap.data().owner;
             const userSnap = await getDoc(doc(db, "users", mobileNum));
            if (userSnap.exists()) {
                dbKey = userSnap.data().secretKey;
                setupLoginUI();
                 }
        } else {
            setupRegisterUI();
        }
    } catch (e) {
          document.getElementById('ui-subtitle').innerText = "Check Firestore Connection/Rules";
    }
}

function setupLoginUI() {
    step = 4;
    document.getElementById('ui-title').innerText = "SECURE LOGIN";
    document.getElementById('ui-subtitle').innerText = "Welcome back!";
    document.getElementById('user-badge').classList.remove('hidden');
    document.getElementById('mobile-box').classList.add('hidden');
    document.getElementById('keypad-section').classList.remove('hidden');
    document.getElementById('masked-id').innerText = mobileNum.substring(0,2) + "****" + mobileNum.substring(7);
}

function setupRegisterUI() {
    step = 1;
    document.getElementById('ui-title').innerText = "REGISTER DEVICE";
     document.getElementById('mobile-box').classList.remove('hidden');
}

// Keypad Actions
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
                  alert("Wrong PIN");
                tempKey = ""; resetDots();
            }
        }
    }
}

function handleRegistration(val) {
    if (step === 2) {
        tempKey += val;
        updateDots(tempKey.length);
        if (tempKey.length === 6) { step = 3; resetDots(); document.getElementById('ui-subtitle').innerText = "Confirm PIN"; }
    } else if (step === 3) {
        confirmKey += val;
        updateDots(confirmKey.length);
        if (confirmKey.length === 6) {
            if (tempKey === confirmKey) {
                document.getElementById('btnAction').classList.remove('hidden');
                document.getElementById('ui-subtitle').innerText = "PIN Match!";
            } else {
                alert("Mismatch!"); resetDots(); tempKey = ""; confirmKey = ""; step = 2;
            }
        }
    }
}

document.getElementById('mobile').oninput = (e) => {
     if (e.target.value.length === 11) {
        mobileNum = e.target.value;
        document.getElementById('mobile-box').classList.add('hidden');
        document.getElementById('keypad-section').classList.remove('hidden');
         step = 2;
    }
};

document.getElementById('btnAction').onclick = async () => {
    const sig = getSignature();
    const myRef = Math.random().toString(36).substring(2, 8).toUpperCase();
    await setDoc(doc(db, "users", mobileNum), { 
        secretKey: tempKey, 
        earnings: 0, 
        referralCode: myRef, 
        registeredAt: new Date().toISOString() 
    });
    await setDoc(doc(db, "signatures", sig), { owner: mobileNum });
    localStorage.setItem('active_user', mobileNum);
    window.location.href = "main.html";
};

function updateDots(l) { document.querySelectorAll('.dot').forEach((d, i) => i < l ? d.classList.add('active') : d.classList.remove('active')); }
function resetDots() { document.querySelectorAll('.dot').forEach(d => d.classList.remove('active')); }
