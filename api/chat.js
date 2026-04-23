// api/chat.js
export default async function handler(req, res) {
    // === 1. GÜVENLİK (CORS) AYARLARI ===
    res.setHeader("Access-Control-Allow-Origin", "https://educaprof.github.io");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Yalnızca POST istekleri kabul edilir.' });
    }

    const { message, members } = req.body;
    
    // === 2. MODELLERİN TANIMLANMASI ===
    // Bu model her zaman çalışır ve çok ucuzdur (Yedek modelimiz)
    const STABLE_PAID_MODEL = "openai/gpt-4o-mini"; 

    const councilMembers = {
        socrates: { 
            prompt: "Sen Sokrates'sin. Varsayımları sorgula, derin sorular sor. Yanıtın TÜRKÇE olsun.", 
            freeModel: "google/gemini-2.0-flash-lite:free" 
        },
        feynman: { 
            prompt: "Sen Richard Feynman'sın. Konuyu bir çocuğun anlayacağı kadar basitleştir. Yanıtın TÜRKÇE olsun.", 
            freeModel: "google/gemini-2.0-flash-lite:free" 
        },
        machiavelli: { 
            prompt: "Sen Machiavelli'sin. Güç, strateji ve pragmatizm odaklı konuş. Yanıtın TÜRKÇE olsun.", 
            freeModel: "meta-llama/llama-3.1-8b-instruct:free" 
        },
        torvalds: { 
            prompt: "Sen Linus Torvalds'sın. Mühendislik gerçeklerine ve çalışan çözümlere odaklan. Yanıtın TÜRKÇE olsun.", 
            freeModel: "openrouter/auto" 
        },
        aurelius: { 
            prompt: "Sen Marcus Aurelius'sun. Stoacı ve ahlaki bir perspektif sun. Yanıtın TÜRKÇE olsun.", 
            freeModel: "google/gemini-2.0-flash-lite:free" 
        },
        suntzu: { 
            prompt: "Sen Sun Tzu'sun. Stratejik avantaj ve rekabet sanatı açısından bak. Yanıtın TÜRKÇE olsun.", 
            freeModel: "openrouter/auto" 
        },
        kahneman: { 
            prompt: "Sen Daniel Kahneman'sın. Bilişsel önyargıları ve mantık hatalarını analiz et. Yanıtın TÜRKÇE olsun.", 
            freeModel: "google/gemini-2.0-flash-lite:free" 
        }
    };

    // --- YARDIMCI FONKSİYON: OpenRouter API Çağrısı ---
    async function callOpenRouter(modelId, sysPrompt, userMsg) {
        return fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'https://educaprof.github.io/cohi',
                'X-Title': 'COHI Council',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: modelId,
                messages: [
                    { role: 'system', content: sysPrompt },
                    { role: 'user', content: userMsg }
                ],
            }),
        });
    }

    // --- YARDIMCI FONKSİYON: Önce Ücretsiz, Hata Verirse Ücretli ---
    async function getResponseWithFallback(memberKey, userMsg) {
        const member = councilMembers[memberKey];
        try {
            // 1. Önce Ücretsiz Modeli Dene
            const freeResponse = await callOpenRouter(member.freeModel, member.prompt, userMsg);
            if (!freeResponse.ok) throw new Error("Free model unavailable");
            
            const freeData = await freeResponse.json();
            if (freeData.error) throw new Error(freeData.error.message);
            
            return freeData.choices?.[0]?.message?.content || "Cevap üretilemedi.";
        } catch (err) {
            console.warn(`${memberKey} için ücretli modele geçiliyor: ${err.message}`);
            // 2. Hata Olursa Ücretli (GPT-4o-mini) Modeli Dene
            const paidResponse = await callOpenRouter(STABLE_PAID_MODEL, member.prompt, userMsg);
            const paidData = await paidResponse.json();
            return paidData.choices?.[0]?.message?.content || "Yedek modelden de cevap alınamadı.";
        }
    }

    try {
        const membersToUse = members && members.length > 0 ? members : Object.keys(councilMembers);

        // Tüm konsey üyelerini aynı anda çalıştır
        const responses = await Promise.all(
            membersToUse.map(async (key) => {
                if (!councilMembers[key]) return { member: key, answer: "Üye bulunamadı." };
                const answer = await getResponseWithFallback(key, message);
                return { member: key, answer };
            })
        );

        // === 3. FİNAL VERDİCT (MODERATÖR) ===
        const combinedText = responses.map(r => `${r.member.toUpperCase()}: ${r.answer}`).join("\n\n");
        
        let verdict = "";
        try {
            const modResponse = await callOpenRouter(STABLE_PAID_MODEL, "Sen bir moderatörsün. Tartışmayı özetle ve Türkçe olarak nihai bir yargı sun.", combinedText);
            const modData = await modResponse.json();
            verdict = modData.choices?.[0]?.message?.content || "Özet oluşturulamadı.";
        } catch (e) {
            verdict = "Moderatör şu an ulaşılamaz durumda.";
        }

        res.status(200).json({ responses, verdict });

    } catch (error) {
        console.error("Genel Backend Hatası:", error);
        res.status(500).json({ error: error.message });
    }
}
