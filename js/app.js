// 1. UPDATE ANG IMPORT SA TAAS
import { 
    getFirestore, doc, getDoc, collection, addDoc, 
    onSnapshot, query, orderBy, limit, serverTimestamp, updateDoc // <-- Idinagdag ang updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ... (Initialization at init() function ay pareho lang) ...

// 2. I-UPDATE ANG setupRealtimeListeners()
function setupRealtimeListeners() {
    onSnapshot(doc(db, "users", activeUser), (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            const bal = (data.earnings || 0).toFixed(2);
            
            const mainBalEl = document.getElementById('mainBalance');
            const withdrawInput = document.getElementById('withdrawAmount');
            if(mainBalEl) mainBalEl.innerText = bal;
            if(withdrawInput) withdrawInput.value = `₱${bal}`;
            
            myActiveReferralCode = data.referralCode || "NONE"; 
            const displayRefEl = document.getElementById('displayreferralCode');
            if(displayRefEl) displayRefEl.innerText = myActiveReferralCode;
            
            // LOGIC PARA SA REDEEM STATUS
            const redeemSec = document.getElementById('redeemSection');
            if(redeemSec) {
                // Kung true ang RedeemStatus o nakapag-redeem na siya, itago ang box
                if(data.RedeemStatus === true || data.Referral_status === "Redeem") {
                    redeemSec.style.display = "none";
                } else {
                    redeemSec.style.display = "block";
                }
            }

            const captionEl = document.getElementById('promoCaption');
            if(captionEl) {
                captionEl.value = `Earn 100 GCash Credits by Inviting Friends! FREE! Code: ${myActiveReferralCode}`;
            }
        }
    });
}

// ... (Other functions remain the same) ...

// 3. IDAGDAG ANG SUBMIT REDEEM LOGIC SA BABA BAGO ANG init();
const btnSubmitRedeem = document.getElementById('btnSubmitRedeem');
if (btnSubmitRedeem) {
    btnSubmitRedeem.onclick = async () => {
        const inputCode = document.getElementById('inputRedeemCode').value.trim();
        const btn = btnSubmitRedeem;
        
        if (!inputCode) {
            alert("Please enter a referral code.");
            return;
        }

        if (inputCode === myActiveReferralCode) {
            alert("You cannot redeem your own code!");
            return;
        }

        // Disable button while processing
        btn.innerText = "WAIT...";
        btn.disabled = true;

        try {
            // Update ang user document, gawing TRUE ang RedeemStatus
            await updateDoc(doc(db, "users", activeUser), {
                RedeemStatus: true,
                RedeemedCode: inputCode // Pwede nating i-save kung kaninong code ang ginamit niya
            });
            
            // Automatic itong mawawala dahil sa onSnapshot listener natin sa taas
            alert("Code successfully redeemed!");

        } catch (err) {
            console.error("Error redeeming code:", err);
            alert("An error occurred. Please try again.");
            btn.innerText = "CLAIM";
            btn.disabled = false;
        }
    };
}
