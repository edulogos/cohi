# COHI - Yüksek Zeka Konseyi Sistemi Öğrenme Dosyası

> Bu dosya COHI projesinin mimarisini, çalışma sistemini ve geliştirme detaylarını dokümante eder.

---

## 📐 MİMARİ

```
┌─────────────────────────────────────────────────────────────┐
│                      KULLANICI                              │
│              (educaprof.github.io/cohi)                   │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTML/CSS/JS (Statik)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│           GİTHUB PAGES (Frontend)                          │
│   index.html + app.js + style.css                          │
└─────────────────────┬───────────────────────────────────────┘
                      │ POST /api/chat
                      ▼
┌─────────────────────────────────────────────────────────────┐
│           VERCEL (Backend - Serverless)                     │
│   api/chat.js                                               │
└─────────────────────┬───────────────────────────────────────┘
                      │ OpenRouter API
                      ▼
┌─────────────────────────────────────────────────────────────┐
│           OPENROUTER (LLM Aggregator)                       │
│   Gemini, Llama, GPT-4o-mini                                │
└─────────────────────────────────────────────────────────────┘
```

### Deploy URL'leri
- **Frontend:** `https://educaprof.github.io/cohi/`
- **Backend API:** `https://cohi-p46b.vercel.app/api/chat`

---

## 📁 DOSYA YAPILARI

| Dosya | Tip | Görev |
|-------|-----|-------|
| `index.html` | Frontend | UI markup - form, checkbox'lar, butonlar |
| `app.js` | Frontend | Client-side logic - API çağrısı, sonuç gösterimi |
| `style.css` | Frontend | Tüm stiller - tema, component stilleri |
| `api/chat.js` | Backend | Vercel serverless - LLM çağrıları, persona yönetimi |

---

## 🔧 FRONTEND (index.html + app.js)

### index.html Yapısı

```html
<!-- Header -->
<header>
    <h1 class="glow-text">Yüksek Zeka Konseyi</h1>
    <p>Fikirlerinizi tarihin en büyük zihinleriyle tartışın.</p>
</header>

<!-- Dashboard (2 kolon grid) -->
<main class="dashboard">
    <!-- Sol Panel: Input -->
    <section class="input-panel">
        <!-- Triad Butonları -->
        <div class="triads-container">
            <button onclick="selectTriad(['suntzu', 'machiavelli', 'aurelius'])">Strateji & Güç</button>
            <button onclick="selectTriad(['socrates', 'feynman', 'kahneman'])">Mantık & Analiz</button>
            <button onclick="selectTriad(['torvalds', 'feynman', 'machiavelli'])">Uygulama & Pragmatizm</button>
            <button onclick="selectTriad(['aurelius', 'socrates', 'suntzu'])">Etik & Disiplin</button>
        </div>

        <!-- 18 Üye Checkbox -->
        <div class="checkbox-grid">
            <label><input type="checkbox" id="socrates" value="socrates">Sokrates</label>
            <label><input type="checkbox" id="feynman" value="feynman">Feynman</label>
            <!-- ... 18 üye ... -->
        </div>

        <!-- Soru Textarea -->
        <textarea id="user-input" placeholder="Sorunuzu buraya yazın..."></textarea>

        <!-- Gönder Butonu -->
        <button onclick="askCouncil()">Konseye Sun ➔</button>
    </section>

    <!-- Sağ Panel: Output -->
    <section class="output-panel">
        <h2>Konseyin Analizi</h2>
        <div id="loading" class="hidden">
            <div class="spinner"></div>
            <p>Zihinler tartışıyor...</p>
        </div>
        <div id="response-box"></div>
    </section>
</main>
```

### app.js Fonksiyonları

#### `selectTriad(memberIds)`
```javascript
function selectTriad(memberIds) {
    // 1. Tüm checkbox'ları temizle
    const allCheckboxes = document.querySelectorAll('input[name="council-member"]');
    allCheckboxes.forEach(cb => cb.checked = false);

    // 2. Verilen ID'leri işaretle
    memberIds.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) checkbox.checked = true;
    });
}
```

#### `askCouncil()`
```javascript
async function askCouncil() {
    const userInput = document.getElementById("user-input").value;
    const selectedMembers = Array.from(
        document.querySelectorAll('input[name="council-member"]:checked')
    ).map(cb => cb.value);

    // Validation
    if (selectedMembers.length === 0) {
        alert("Lütfen en az bir üye seçin.");
        return;
    }

    // API çağrısı
    const response = await fetch(VERCEL_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            message: userInput,
            members: selectedMembers
        })
    });

    const data = await response.json();
    displayResults(data);
}
```

#### `displayResults(data)`
```javascript
function displayResults(data) {
    // Her üyenin cevabını render et
    data.responses.forEach(res => {
        responseBox.innerHTML += `
            <div class="member-response">
                <h3>${res.member.toUpperCase()}</h3>
                <p>${res.answer}</p>
            </div>
        `;
    });

    // Nihai kararı render et
    responseBox.innerHTML += `
        <div class="final-verdict">
            <h3>Nihai Karar</h3>
            <p>${data.verdict}</p>
        </div>
    `;
}
```

### API İsteği & Yanıtı

**İstek:**
```javascript
POST https://cohi-p46b.vercel.app/api/chat
{
    "message": "Kullanıcının sorusu",
    "members": ["socrates", "feynman", "aurelius"]
}
```

**Yanıt:**
```javascript
{
    "responses": [
        { "member": "socrates", "answer": "Sokrates'in cevabı..." },
        { "member": "feynman", "answer": "Feynman'ın cevabı..." }
    ],
    "verdict": "Moderatörün nihai kararı..."
}
```

---

## ⚙️ BACKEND (api/chat.js)

### Giriş Noktası
```javascript
export default async function handler(req, res) {
    // CORS
    res.setHeader("Access-Control-Allow-Origin", "https://educaprof.github.io");

    // Method kontrolü
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Yalnızca POST kabul" });
    }

    const { message, members } = req.body;

    // ... işlemler ...

    res.status(200).json({ responses, verdict });
}
```

### 18 Persona Tanımları

```javascript
const councilMembers = {
    socrates: {
        prompt: "Sen Sokrates'sin. Varsayımları sorgula. Yanıtın TÜRKÇE olsun.",
        freeModel: "google/gemini-2.0-flash-lite:free"
    },
    feynman: {
        prompt: "Sen Richard Feynman'sın. Konuyu basitleştir. Yanıtın TÜRKÇE olsun.",
        freeModel: "google/gemini-2.0-flash-lite:free"
    },
    aristotle: {
        prompt: "Sen Aristo'sun. Sınıflandırma ve mantık çerçevesinde analiz et. Yanıtın TÜRKÇE olsun.",
        freeModel: "google/gemini-2.0-flash-lite:free"
    },
    aurelius: {
        prompt: "Sen Marcus Aurelius'sun. Stoacı perspektif sun. Yanıtın TÜRKÇE olsun.",
        freeModel: "google/gemini-2.0-flash-lite:free"
    },
    machiavelli: {
        prompt: "Sen Machiavelli'sin. Stratejik ve gerçekçi ol. Yanıtın TÜRKÇE olsun.",
        freeModel: "meta-llama/llama-3.1-8b-instruct:free"
    },
    torvalds: {
        prompt: "Sen Linus Torvalds'sın. Pragmatik mühendisliğe odaklan. Yanıtın TÜRKÇE olsun.",
        freeModel: "openrouter/auto"
    },
    suntzu: {
        prompt: "Sen Sun Tzu'sun. Strateji ve arazi avantajına odaklan. Yanıtın TÜRKÇE olsun.",
        freeModel: "openrouter/auto"
    },
    kahneman: {
        prompt: "Sen Daniel Kahneman'sın. Bilişsel önyargıları analiz et. Yanıtın TÜRKÇE olsun.",
        freeModel: "google/gemini-2.0-flash-lite:free"
    },
    ada: {
        prompt: "Sen Ada Lovelace'sın. Matematiksel sınırlar ve algoritmik yapıya odaklan. Yanıtın TÜRKÇE olsun.",
        freeModel: "google/gemini-2.0-flash-lite:free"
    },
    laotzu: {
        prompt: "Sen Lao Tzu'sun. Doğal akış ve beliriş (emergence) üzerinden yorumla. Yanıtın TÜRKÇE olsun.",
        freeModel: "openrouter/auto"
    },
    musashi: {
        prompt: "Sen Miyamoto Musashi'sin. Zamanlama, disiplin ve tek odaklılık sun. Yanıtın TÜRKÇE olsun.",
        freeModel: "meta-llama/llama-3.1-8b-instruct:free"
    },
    watts: {
        prompt: "Sen Alan Watts'sın. Konuyu farklı bir çerçeveye (reframing) oturt. Yanıtın TÜRKÇE olsun.",
        freeModel: "openrouter/auto"
    },
    karpathy: {
        prompt: "Sen Andrej Karpathy'sin. Uygulamalı yapay zeka ve ampirik verilere odaklan. Yanıtın TÜRKÇE olsun.",
        freeModel: "google/gemini-2.0-flash-lite:free"
    },
    sutskever: {
        prompt: "Sen Ilya Sutskever'sin. Yapay zekanın geleceği ve güvenlik sınırlarına odaklan. Yanıtın TÜRKÇE olsun.",
        freeModel: "google/gemini-2.0-flash-lite:free"
    },
    munger: {
        prompt: "Sen Charlie Munger'sın. Zihinsel modeller ve tersine çevirme (inversion) kullan. Yanıtın TÜRKÇE olsun.",
        freeModel: "openrouter/auto"
    },
    meadows: {
        prompt: "Sen Donella Meadows'sun. Geri bildirim döngüleri ve sistem dinamiklerine odaklan. Yanıtın TÜRKÇE olsun.",
        freeModel: "meta-llama/llama-3.1-8b-instruct:free"
    },
    taleb: {
        prompt: "Sen Nassim Taleb'sin. Kuyruk riskleri ve anti-kırılganlık üzerinden analiz et. Yanıtın TÜRKÇE olsun.",
        freeModel: "openrouter/auto"
    },
    rams: {
        prompt: "Sen Dieter Rams'sın. Tasarımın netliği ve kullanıcı deneyimine odaklan. Yanıtın TÜRKÇE olsun.",
        freeModel: "google/gemini-2.0-flash-lite:free"
    }
};
```

### OpenRouter API Çağrısı

```javascript
async function callOpenRouter(modelId, sysPrompt, userMsg) {
    return fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "HTTP-Referer": "https://educaprof.github.io/cohi",
            "X-Title": "COHI Council",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: modelId,
            messages: [
                { role: "system", content: sysPrompt },
                { role: "user", content: userMsg }
            ]
        })
    });
}
```

### Fallback Mekanizması

```javascript
async function getResponseWithFallback(memberKey, userMsg) {
    const member = councilMembers[memberKey];

    try {
        // 1. Önce ücretsiz modeli dene
        const freeResponse = await callOpenRouter(member.freeModel, member.prompt, userMsg);
        if (!freeResponse.ok) throw new Error("Free model unavailable");

        const freeData = await freeResponse.json();
        if (freeData.error) throw new Error(freeData.error.message);

        return freeData.choices?.[0]?.message?.content || "Cevap üretilemedi.";

    } catch (err) {
        // 2. Hata olursa ücretli modele geç
        console.warn(`${memberKey} için ücretli modele geçiliyor...`);

        const paidResponse = await callOpenRouter(STABLE_PAID_MODEL, member.prompt, userMsg);

        // 3. Bütçe aşımı kontrolü
        if (paidResponse.status === 402) {
            throw new Error("LIMIT_EXCEEDED");
        }

        const paidData = await paidResponse.json();
        return paidData.choices?.[0]?.message?.content || "Cevap alınamadı.";
    }
}
```

### Ana Akış

```javascript
try {
    // 1. Seçili üyeleri al (yoksa tüm üyeleri)
    const membersToUse = members && members.length > 0
        ? members
        : Object.keys(councilMembers);

    // 2. Tüm üyeleri PARALEL çalıştır
    const responses = await Promise.all(
        membersToUse.map(async (key) => {
            if (!councilMembers[key]) {
                return { member: key, answer: "Üye bulunamadı." };
            }
            const answer = await getResponseWithFallback(key, message);
            return { member: key, answer };
        })
    );

    // 3. Tüm yanıtları birleştir
    const combinedText = responses.map(r =>
        `${r.member.toUpperCase()}: ${r.answer}`
    ).join("\n\n");

    // 4. Moderatör'den nihai karar al
    const modResponse = await callOpenRouter(
        STABLE_PAID_MODEL,
        "Sen bir moderatörsün. Tartışmayı özetle ve Türkçe olarak nihai bir yargı sun.",
        combinedText
    );
    const modData = await modResponse.json();
    verdict = modData.choices?.[0]?.message?.content || "Özet oluşturulamadı.";

    // 5. Yanıtı dön
    res.status(200).json({ responses, verdict });

} catch (error) {
    console.error("Genel Backend Hatası:", error);
    res.status(500).json({ error: error.message });
}
```

---

## 🎯 TRİAD GRUPLARI

| Triad Adı | Üyeler | Tema |
|-----------|--------|------|
| Strateji & Güç | suntzu, machiavelli, aurelius | Rekabet + Güç + Ahlak |
| Mantık & Analiz | socrates, feynman, kahneman | Sorgulama + Basitleştirme + Önyargı |
| Uygulama & Pragmatizm | torvalds, feynman, machiavelli | Çalışan kod + İlk prensipler + Gerçekçilik |
| Etik & Disiplin | aurelius, socrates, suntzu | Stoacılık + Sorgulama + Strateji |

---

## 🔄 VERDICT ÜRETİMİ

Moderatör prompt'u:
```
"Sen bir moderatörsün. Tartışmayı özetle ve Türkçe olarak nihai bir yargı sun."
```

Akış:
1. Tüm üyelerin yanıtları birleştirilir
2. Moderatör'e gönderilir
3. Tek bir özet karar döner

---

## 🐛 HATA YÖNETİMİ

| Durum | Frontend Mesaj | Backend Davranış |
|-------|---------------|------------------|
| Sunucu hatası | "Bir sorun oluştu: {error}" | `res.status(500)` |
| 402 Bütçe aşımı | "Konsey Dinlenmeye Çekildi" | LIMIT_EXCEEDED fırlat |
| Geçersiz üye | "{üye}: Üye bulunamadı" | Boş cevap döner |
| Free model hatası | Otomatik fallback | gpt-4o-mini'e geçer |

---

## 🎨 STİL VE TASARIM

- **Tema:** Koyu mod (koyu lacivert arka plan)
- **Ana Renkler:**
  - Arka plan: `#0a0f1a`
  - Panel: `#141b2d`
  - Cyan accent: `#38bdf8`
  - Purple accent: `#818cf8`
- **Fontlar:**
  - Body: Inter
  - Başlıklar: Space Grotesk
- **Layout:** 2 kolonlu dashboard (768px'de mobil: 1 kolon)
- **Animasyonlar:**
  - Spinner: loading durumu
  - Pulse: bütçe aşımı uyarısı
  - Hover: buton ve checkbox efektleri

---

## 🔑 ÖNEMLİ NOTLAR

### Vercel API URL
```javascript
const VERCEL_API_URL = "https://cohi-p46b.vercel.app/api/chat";
```
Bu URL GitHub Pages'ten API'ye istek atarken kullanılır. **Relative path (`/api/chat`) kullanılmaz!**

### Environment Variable
`OPENROUTER_API_KEY` Vercel'de environment variable olarak tanımlanmıştır.

### CORS
Sadece `https://educaprof.github.io` origin'inden gelen istekler kabul edilir.

### Paralel Çalıştırma
`Promise.all()` kullanarak tüm üyeler aynı anda çalıştırılır - bu önemli bir performans optimizasyonudur.

---

## 🛠️ GELİŞTİRME

### Yeni Persona Ekleme
1. `api/chat.js`'de `councilMembers` objesine yeni kayıt ekle
2. `index.html`'de yeni checkbox ekle
3. İsteğe bağlı: `selectTriad()` fonksiyonuna yeni triad ekle

### Yeni Triad Ekleme
```html
<button onclick="selectTriad(['üye1', 'üye2', 'üye3'])">Yeni Triad</button>
```

---

## 📝 GELİŞTİRME TARİHÇESİ

| Tarih | Değişiklik |
|-------|------------|
| 2024-XX-XX | Sistem oluşturuldu |
| 2024-XX-XX | 7 üyeden 18 üyeye genişletildi |
| 2024-XX-XX | Fallback mekanizması eklendi |
| 2024-XX-XX | Triad grupları eklendi |

---

*Bu dosya educaprof/cohi projesini anlamak ve geliştirmek için oluşturulmuştur.*
