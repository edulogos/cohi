const VERCEL_API_URL = "https://cohi-p46b.vercel.app/api/chat";

function selectTriad(memberIds) {
    const allCheckboxes = document.querySelectorAll('input[name="council-member"]');
    allCheckboxes.forEach(cb => cb.checked = false);
    memberIds.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) checkbox.checked = true;
    });

    const allTriadBtns = document.querySelectorAll('.triad-btn');
    allTriadBtns.forEach(btn => btn.classList.remove('selected'));

    const clickedBtn = Array.from(allTriadBtns).find(btn => {
        const btnMemberIds = btn.getAttribute('onclick').match(/'([^']+)'/g)?.map(s => s.replace(/'/g, ''));
        if (!btnMemberIds) return false;
        return btnMemberIds.length === memberIds.length && btnMemberIds.every(id => memberIds.includes(id));
    });
    if (clickedBtn) clickedBtn.classList.add('selected');
}

const DAILY_LIMIT = 5;
const STORAGE_KEY_COUNT = 'cohi_daily_count';
const STORAGE_KEY_DATE = 'cohi_daily_date';

function updateQueryCountDisplay() {
    const limitCheck = checkDailyLimit();
    const queryCountEl = document.getElementById('query-count');

    if (limitCheck.reached) {
        queryCountEl.textContent = 'Günlük soru sayınız bitti !';
        queryCountEl.classList.add('exhausted');
        document.getElementById('submit-btn').disabled = true;
    } else {
        queryCountEl.textContent = `(${limitCheck.remaining} sorgu hakkınız bulunmakta)`;
        queryCountEl.classList.remove('exhausted');
    }
}

function checkDailyLimit() {
    const today = new Date().toDateString();
    const storedDate = localStorage.getItem(STORAGE_KEY_DATE);
    const count = parseInt(localStorage.getItem(STORAGE_KEY_COUNT) || '0', 10);


    if (storedDate !== today) {
        localStorage.setItem(STORAGE_KEY_DATE, today);
        localStorage.setItem(STORAGE_KEY_COUNT, '0');
        return { remaining: DAILY_LIMIT, reached: false };
    }

    return { remaining: DAILY_LIMIT - count, reached: count >= DAILY_LIMIT };
}

function incrementDailyCount() {
    const today = new Date().toDateString();
    const storedDate = localStorage.getItem(STORAGE_KEY_DATE);

    if (storedDate !== today) {
        localStorage.setItem(STORAGE_KEY_DATE, today);
        localStorage.setItem(STORAGE_KEY_COUNT, '1');
    } else {
        const count = parseInt(localStorage.getItem(STORAGE_KEY_COUNT) || '0', 10);
        localStorage.setItem(STORAGE_KEY_COUNT, String(count + 1));
    }
}

function showLimitReachedMessage() {
    const responseBox = document.getElementById("response-box");
    const loading = document.getElementById("loading");
    responseBox.innerHTML = '';
    loading.classList.add("hidden");


    const div = document.createElement('div');
    div.className = 'limit-warning';
    div.innerHTML = '<strong>Konsey dinlenmeye çekildi !</strong><br>Bugünlük 5 tartışma hakkınız doldu. Yarın tekrar bekleriz.';
    responseBox.appendChild(div);

    const queryCountEl = document.getElementById('query-count');
    queryCountEl.textContent = 'Günlük soru sayınız bitti !';
    queryCountEl.classList.add('exhausted');
    document.getElementById('submit-btn').disabled = true;
}


async function askCouncil() {
    const submitBtn = document.getElementById("submit-btn");
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

    const limitCheck = checkDailyLimit();
    if (limitCheck.reached) {
        showLimitReachedMessage();
        return;
    }

    submitBtn.disabled = true;
    window.scrollTo({ top: 0, behavior: "smooth" });

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
        incrementDailyCount();
        displayResults(data);
        updateQueryCountDisplay();

    } catch (error) {
        console.error("Hata Detayı:", error);
        responseBox.innerHTML = '';

        if (error.message.includes("LIMIT_EXCEEDED") || error.message.includes("402")) {
            const div = document.createElement('div');
            div.className = 'limit-warning';
            div.innerHTML = '<strong>Konsey dinlenmeye çekildi !</strong><br>Bugünlük 5 tartışma hakkınız doldu. Yarın tekrar bekleriz.';
            responseBox.appendChild(div);

        } else {
            const p = document.createElement('p');
            p.className = 'error';
            p.textContent = 'Bir sorun oluştu: ' + error.message;
            responseBox.appendChild(p);
        }
    } finally {
        loading.classList.add("hidden");
        submitBtn.disabled = false;
    }
}


function parseMarkdown(text) {
    if (!text) return '';


    let html = text
        .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/^### (.+)$/gm, '<h4>$1</h4>')
        .replace(/^## (.+)$/gm, '<h3>$1</h3>')
        .replace(/^# (.+)$/gm, '<h2>$1</h2>')
        .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
        .replace(/^(\d+)\. (.+)$/gm, '<li><span class="list-number">$1.</span> $2</li>')
        .replace(/^- (.+)$/gm, '<li>$1</li>');


    html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
    html = html.replace(/\n/g, '<br>');


    return html;
}

function displayResults(data) {
    const responseBox = document.getElementById("response-box");
    responseBox.innerHTML = '';


    data.responses.forEach(res => {
        const div = document.createElement('div');
        div.className = 'member-response';

        const h3 = document.createElement('h3');
        h3.textContent = res.member.toUpperCase();

        const content = document.createElement('div');
        content.className = 'member-content';
        content.innerHTML = parseMarkdown(res.answer);


        div.appendChild(h3);
        div.appendChild(content);
        responseBox.appendChild(div);
    });


    const verdictDiv = document.createElement('div');
    verdictDiv.className = 'final-verdict';

    const verdictH3 = document.createElement('h3');
    verdictH3.textContent = 'Nihai Karar';

    const verdictContent = document.createElement('div');
    verdictContent.className = 'verdict-content';
    verdictContent.innerHTML = parseMarkdown(data.verdict);


    verdictDiv.appendChild(verdictH3);
    verdictDiv.appendChild(verdictContent);
    responseBox.appendChild(verdictDiv);
}

function closeIntroBox() {
    const introBox = document.getElementById("intro-box");
    introBox.classList.add("hidden");
    localStorage.setItem("cohi_intro_shown", "true");
}

function showIntroBoxIfNeeded() {
    const introBox = document.getElementById("intro-box");
    const shown = localStorage.getItem("cohi_intro_shown");
    if (!shown) {
        introBox.classList.remove("hidden");
    }
}

window.addEventListener("DOMContentLoaded", showIntroBoxIfNeeded);
window.addEventListener("DOMContentLoaded", updateQueryCountDisplay);