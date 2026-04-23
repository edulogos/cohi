const VERCEL_API_URL = "https://cohi-p46b.vercel.app/api/chat";

async function askCouncil() {
    const userInput = document.getElementById("user-input").value;
    
    // Tik atılmış (checked) tüm checkbox'ları bul ve değerlerini bir listeye al
    const checkedCheckboxes = document.querySelectorAll('input[name="council-member"]:checked');
    const selectedMembers = Array.from(checkedCheckboxes).map(cb => cb.value);

    const responseBox = document.getElementById("response-box");
    const loadingDiv = document.getElementById("loading");
    const submitBtn = document.getElementById("submit-btn");

    if (selectedMembers.length === 0) {
        alert("Lütfen tartışma için en az 1 konsey üyesi seçin.");
        return;
    }

    if (!userInput.trim()) {
        alert("Lütfen tartışılacak bir fikir yazın.");
        return;
    }

  loading.classList.remove("hidden");
  responseBox.innerHTML = "";

  try {
        // Burada cevabı 'response' ismiyle alıyoruz
        const response = await fetch(VERCEL_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: userInput,
                members: selectedMembers
            })
        });

        // HATA BURADAYDI: Aşağıdaki satırlarda 'res' değil, 'response' yazmalı!
        if (!response.ok) {
            throw new Error("Ağ hatası veya API yanıt vermiyor.");
        }

        const data = await response.json(); // Burada da 'response' olmalı
        
        // Cevapları ekrana yazdıran fonksiyonu çağır
        displayResults(data);

    } catch (error) {
        console.error("Hata detayı:", error);
        responseBox.innerHTML = `<p class="error">Hata: ${error.message}</p>`;
    } finally {
        loading.classList.add("hidden");
    }

    const data = await res.json();

    loading.classList.add("hidden");

    // === ÜYELERİN CEVAPLARI ===
    const responsesHTML = data.responses.map(r => `
      <div class="member-response">
        <h3>${capitalize(r.member)}</h3>
        <p>${r.answer}</p>
      </div>
    `).join("");

    // === FINAL VERDICT ===
    const verdictHTML = data.verdict ? `
      <div class="verdict">
        <h2>Soh Tahlilde !</h2>
        <p>${data.verdict}</p>
      </div>
    ` : "";

    responseBox.innerHTML = responsesHTML + verdictHTML;

  } catch (err) {
    loading.classList.add("hidden");
    responseBox.innerHTML = `<p style="color:red;">Hata oluştu.</p>`;
    console.error(err);
  }
}

// Küçük helper
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
