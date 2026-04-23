const VERCEL_API_URL = "https://cohi-p46b.vercel.app/api/chat";

function selectTriad(memberIds) {
    const allCheckboxes = document.querySelectorAll('input[name="council-member"]');
    allCheckboxes.forEach(cb => cb.checked = false);
    memberIds.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) checkbox.checked = true;
    });
}

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

    loading.classList.remove("hidden");
    responseBox.innerHTML = "";

    try {
        const response = await fetch(VERCEL_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: userInput,
                members: selectedMembers
            })
        });

        if (!response.ok) {
            throw new Error("Sunucu yanıt vermedi.");
        }

        const data = await response.json();
        displayResults(data);

    } catch (error) {
        console.error("Hata Detayı:", error);
        let friendlyMessage = `Bir sorun oluştu: ${error.message}`;
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
        loading.classList.add("hidden");
    }
}

function displayResults(data) {
    const responseBox = document.getElementById("response-box");
    let htmlContent = data.responses.map(res => `
        <div class="member-response">
            <h3>${res.member.toUpperCase()}</h3>
            <p>${res.answer}</p>
        </div>
    `).join("");

    htmlContent += `
        <div class="final-verdict">
            <h2>Nihai Karar (Final Verdict)</h2>
            <p>${data.verdict}</p>
        </div>
    `;

    responseBox.innerHTML = htmlContent;
}