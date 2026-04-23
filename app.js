// app.js dosyanızın en üstünde bu satırın olduğundan emin olun:
const VERCEL_API_URL = "https://cohi-p46b.vercel.app/api/chat";

async function askCouncil() {
    const userInput = document.getElementById("user-input").value;
    const checkedCheckboxes = document.querySelectorAll('input[name="council-member"]:checked');
    const selectedMembers = Array.from(checkedCheckboxes).map(cb => cb.value);

    const responseBox = document.getElementById("response-box");
    const loading = document.getElementById("loading");

    // Seçim kontrolü
    if (selectedMembers.length === 0) {
        alert("Lütfen en az bir üye seçin.");
        return;
    }
    if (!userInput.trim()) {
        alert("Lütfen bir fikir yazın.");
        return;
    }

    // Arayüzü temizle ve yükleniyor animasyonunu aç
    loading.classList.remove("hidden");
    responseBox.innerHTML = "";

    try {
        // İSTEK GÖNDERME (Sonuç 'response' olarak tanımlandı)
        const response = await fetch(VERCEL_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: userInput,
                members: selectedMembers
            })
        });

        // 37. SATIR BURASI OLMALI: 'res' değil 'response' kullanılmalı
        if (!response.ok) {
            throw new Error("Sunucu yanıt vermedi.");
        }

        // VERİYİ ALMA (Yine 'response' kullanılmalı)
        const data = await response.json();
        
        // Sonuçları ekrana bas
        displayResults(data);

    } catch (error) {
        console.error("Hata:", error);
        responseBox.innerHTML = `<p class="error">Bir sorun oluştu: ${error.message}</p>`;
    } finally {
        // İşlem bitince yükleniyor simgesini gizle
        loading.classList.add("hidden");
    }
}

// Sonuçları gösteren yardımcı fonksiyon (Eğer dosyanızda yoksa ekleyin)
function displayResults(data) {
    const responseBox = document.getElementById("response-box");
    
    // Konsey üyelerinin cevapları
    let htmlContent = data.responses.map(res => `
        <div class="member-response">
            <h3>${res.member.toUpperCase()}</h3>
            <p>${res.answer}</p>
        </div>
    `).join("");

    // Nihai Karar (Verdict)
    htmlContent += `
        <div class="final-verdict">
            <h2>Nihai Karar (Final Verdict)</h2>
            <p>${data.verdict}</p>
        </div>
    `;

    responseBox.innerHTML = htmlContent;
}
