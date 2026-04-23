const VERCEL_API_URL = "https://cohi-p46b.vercel.app/api/chat";

async function askCouncil() {
    const userInput = document.getElementById("user-input").value;
    const checkedCheckboxes = document.querySelectorAll('input[name="council-member"]:checked');
    const selectedMembers = Array.from(checkedCheckboxes).map(cb => cb.value);

    const responseBox = document.getElementById("response-box");
    const loading = document.getElementById("loading");

    if (selectedMembers.length === 0) {
        alert("Lütfen en az bir üye seçin.");
        return;
    }
    if (!userInput.trim()) {
        alert("Lütfen bir fikir yazın.");
        return;
    }

    // Arayüzü hazırla
    loading.classList.remove("hidden");
    responseBox.innerHTML = "";

    try {
        // BURAYA DİKKAT: Değişken adı 'response'
        const response = await fetch(VERCEL_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: userInput,
                members: selectedMembers
            })
        });

        // HATA BURADAYDI: 'res' değil 'response' kullanmalıyız
        if (!response.ok) {
            throw new Error("Sunucu yanıt vermedi.");
        }

        const data = await response.json(); // Burada da 'response' olmalı
        displayResults(data);

    } catch (error) {
        console.error("Hata:", error);
        responseBox.innerHTML = `<p class="error">Bir sorun oluştu: ${error.message}</p>`;
    } finally {
        loading.classList.add("hidden");
    }
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
