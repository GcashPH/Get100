import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, collection, query, where, getDocs 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = { /* Iyong Config */ };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const currentSig = btoa(navigator.userAgent + screen.width).slice(0, 24);

// Elements mapping based on your HTML
const scanLayer = document.getElementById('scan-layer');
const authLayer = document.getElementById('auth-layer');
const mobileBox = document.getElementById('mobile-box');
const keypadSection = document.getElementById('keypad-section');
const uiSubtitle = document.getElementById('ui-subtitle');

async function checkDevice() {
    try {
        const q = query(collection(db, "users"), where("signatures", "array-contains", currentSig));
        const snap = await getDocs(q);

        // Alisin ang loading screen
        scanLayer.classList.add('hidden');
        authLayer.classList.remove('hidden');

        if (!snap.empty) {
            // RECOGNIZED
            const user = snap.docs[0].id;
            localStorage.setItem('active_user', user);
            
            uiSubtitle.innerText = "Device Recognized";
            document.getElementById('user-badge').classList.remove('hidden');
            document.getElementById('masked-id').innerText = user.replace(/(\d{2})(\d{5})(\d{4})/, "$1*******$3");
            
            mobileBox.classList.add('hidden'); // Itago ang input box
            keypadSection.classList.remove('hidden'); // Ipakita ang keypad
        } else {
            // NEW DEVICE
            uiSubtitle.innerText = "Register your device to continue";
            mobileBox.classList.remove('hidden'); // Ipakita ang input box
            keypadSection.classList.remove('hidden'); // Ipakita ang keypad
        }
    } catch (e) {
        console.error(e);
        // Fallback: ipakita ang login kung may error
        scanLayer.classList.add('hidden');
        authLayer.classList.remove('hidden');
        mobileBox.classList.remove('hidden');
        keypadSection.classList.remove('hidden');
    }
}

window.onload = checkDevice;
