const API_URL = "https://cohi-p46b.vercel.app/api/chat";

async function askCouncil() {
  const input = document.getElementById("user-input").value;
  const loading = document.getElementById("loading");
  const responseBox = document.getElementById("response-box");

  const selectedMembers = Array.from(
    document.querySelectorAll('input[type="checkbox"]:checked')
  ).map(el => el.value);

  if (!input) {
    alert("Lütfen bir fikir gir.");
    return;
  }

  if (selectedMembers.length === 0) {
    alert("En az 1 üye seç.");
    return;
  }

  loading.classList.remove("hidden");
  responseBox.innerHTML = "";

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: input,
        members: selectedMembers
      })
    });

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
