function selectTriad(memberIds) {
    const allCheckboxes = document.querySelectorAll('input[name="council-member"]');
    allCheckboxes.forEach(cb => cb.checked = false);
    memberIds.forEach(val => {
        const checkbox = document.querySelector(`input[name="council-member"][value="${val}"]`);
        if (checkbox) checkbox.checked = true;
    });
}

async function askCouncil() {
    const submitBtn = document.getElementById("submit-btn");
    const userInputField = document.getElementById("user-input");
    const userInput = userInputField.value;
    const responseBox = document.getElementById("response-box");
    const loading = document.getElementById("loading");

    if (!userInput.trim()) {
        alert("Lütfen bir fikir belirtin.");
        return;
    }

    const selectedMembers = Array.from(document.querySelectorAll('input[name="council-member"]:checked'))
        .map(cb => cb.value);

    if (selectedMembers.length === 0) {
        alert("Lütfen en az bir konsey üyesi seçin.");
        return;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    submitBtn.disabled = true;
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = `<span>Düşünülüyor...</span>`;
    responseBox.innerHTML = "";
    loading.classList.remove("hidden");

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ members: selectedMembers, message: userInput })
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        data.responses.forEach(r => {
            responseBox.innerHTML += `
                <div class="member-response">
                    <h3>${r.member.toUpperCase()}</h3>
                    <p>${r.answer}</p>
                </div>
            `;
        });

        if (data.verdict) {
            responseBox.innerHTML += `
                <div class="member-response moderator" style="border-top: 2px solid #38bdf8; background: rgba(56, 189, 248, 0.05);">
                    <h3 style="color: #38bdf8;">📜 KONSEY KARARI</h3>
                    <p>${data.verdict}</p>
                </div>
            `;
        }

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
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
}