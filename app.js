// 1. ÜYELERİ SEÇMEYİ SAĞLAYAN FONKSİYON (TRIADS)
function selectTriad(memberIds) {
    // Önce tüm seçimleri temizle
    const allCheckboxes = document.querySelectorAll('input[name="council-member"]');
    allCheckboxes.forEach(cb => cb.checked = false);

    // Seçilen triad üyelerini işaretle
    memberIds.forEach(val => {
        // HTML'de ID olmasa bile value üzerinden bulur
        const checkbox = document.querySelector(`input[name="council-member"][value="${val}"]`);
        if (checkbox) checkbox.checked = true;
    });
}

// 2. KONSEYE SORU SORAN ANA FONKSİYON
async function askCouncil() {
    const submitBtn = document.getElementById("submit-btn");
    const userInputField = document.getElementById("user-input");
    const userInput = userInputField.value;
    const responseBox = document.getElementById("response-box");
    const loading = document.getElementById("loading");

    // Giriş kontrolü
    if (!userInput.trim()) {
        alert("Lütfen bir fikir belirtin.");
        return;
    }

    // Seçili üyeleri al
    const selectedMembers = Array.from(document.querySelectorAll('input[name="council-member"]:checked'))
        .map(cb => cb.value);

    if (selectedMembers.length === 0) {
        alert("Lütfen en az bir konsey üyesi seçin.");
        return;
    }

    // Arayüz Hazırlığı
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Yukarı kayma efekti
    submitBtn.disabled = true; // Butonu kilitle
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = `<span>Düşünülüyor...</span>`;
    
    responseBox.innerHTML = ""; // Eski cevapları temizle
    loading.classList.remove("hidden"); // Yükleniyor göster

    try {
        // Her üye için sırayla API'ye git
        for (const member of selectedMembers) {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ member, message: userInput })
            });
            
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            // Üye cevabını ekrana ekle
            responseBox.innerHTML += `
                <div class="member-response">
                    <h3>${member.toUpperCase()}</h3>
                    <p>${data.text}</p>
                </div>
            `;
        }

        // Tüm üyeler bitince Moderatör Özeti al
        const modRes = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                member: 'moderator', 
                message: userInput, 
                context: responseBox.innerText 
            })
        });
        const modData = await modRes.json();
        
        responseBox.innerHTML += `
            <div class="member-response moderator" style="border-top: 2px solid #38bdf8; background: rgba(56, 189, 248, 0.05);">
                <h3 style="color: #38bdf8;">📜 KONSEY KARARI</h3>
                <p>${modData.text}</p>
            </div>
        `;

    } catch (error) {
        console.error("Hata Detayı:", error);
        
        let friendlyMessage = `Bir sorun oluştu: ${error.message}`;
        
        // Bütçe aşımı kontrolü
        if (error.message.includes("LIMIT_EXCEEDED") || error.message.includes("402")) {
            friendlyMessage = `
                <div class="limit-warning">
                    <strong>Konsey Dinlenmeye Çekildi</strong><br>
                    Bugünlük bilgelik kotamız dolmuştur. Yarın tekrar bekleriz.
                </div>
            `;
        }
        responseBox.innerHTML = `<p class="error">${friendlyMessage}</p>`;
        
    } finally {
        // İşlem bittiğinde her şeyi eski haline getir
        loading.classList.add("hidden");
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
}
