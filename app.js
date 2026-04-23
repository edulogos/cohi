// DİKKAT: Buraya Vercel'den aldığınız URL'yi yazın. Sonunda /api/chat olduğundan emin olun.
const VERCEL_API_URL = "https://cohi-p46b.vercel.app/api/chat"; 

async function askCouncil() {
    const userInput = document.getElementById("user-input").value;
    const memberSelect = document.getElementById("member-select").value;
    const responseBox = document.getElementById("response-box");
    const loadingDiv = document.getElementById("loading");
    const submitBtn = document.getElementById("submit-btn");

    if (!userInput.trim()) {
        alert("Lütfen tartışmak için bir fikir yazın.");
        return;
    }

    // Yükleniyor durumunu aç
    responseBox.innerHTML = "";
    loadingDiv.classList.remove("hidden");
    submitBtn.disabled = true;

    try {
        const response = await fetch(VERCEL_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: userInput,
                member: memberSelect
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || data.message || "Bilinmeyen bir hata oluştu.");
        }

        // Başarılı cevabı ekrana yazdır
        responseBox.innerHTML = `<div class="answer-content">${data.answer}</div>`;
        
    } catch (error) {
        responseBox.innerHTML = `<p style="color: #ef4444;">Hata: ${error.message}</p>`;
    } finally {
        // Yükleniyor durumunu kapat
        loadingDiv.classList.add("hidden");
        submitBtn.disabled = false;
    }
}