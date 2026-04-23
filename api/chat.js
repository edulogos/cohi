export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "https://educaprof.github.io");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    if (req.method !== "POST") {
        return res.status(405).json({ message: "Yalnızca POST istekleri kabul edilir." });
    }

    const { message, members } = req.body;
    const STABLE_PAID_MODEL = "openai/gpt-4o-mini";

    const councilMembers = {
        socrates: { prompt: "Sen Sokrates'sin. Varsayımları sorgula. Yanıtın TÜRKÇE olsun.", freeModel: "google/gemini-2.0-flash-lite:free" },
        feynman: { prompt: "Sen Richard Feynman'sın. Konuyu basitleştir. Yanıtın TÜRKÇE olsun.", freeModel: "google/gemini-2.0-flash-lite:free" },
        machiavelli: { prompt: "Sen Machiavelli'sin. Stratejik ve gerçekçi ol. Yanıtın TÜRKÇE olsun.", freeModel: "meta-llama/llama-3.1-8b-instruct:free" },
        torvalds: { prompt: "Sen Linus Torvalds'sın. Pragmatik mühendisliğe odaklan. Yanıtın TÜRKÇE olsun.", freeModel: "openrouter/auto" },
        aurelius: { prompt: "Sen Marcus Aurelius'sun. Stoacı perspektif sun. Yanıtın TÜRKÇE olsun.", freeModel: "google/gemini-2.0-flash-lite:free" },
        suntzu: { prompt: "Sen Sun Tzu'sun. Strateji ve arazi avantajına odaklan. Yanıtın TÜRKÇE olsun.", freeModel: "openrouter/auto" },
        kahneman: { prompt: "Sen Daniel Kahneman'sın. Bilişsel önyargıları analiz et. Yanıtın TÜRKÇE olsun.", freeModel: "google/gemini-2.0-flash-lite:free" },
        aristotle: { prompt: "Sen Aristo'sun. Sınıflandırma ve mantık çerçevesinde analiz et. Yanıtın TÜRKÇE olsun.", freeModel: "google/gemini-2.0-flash-lite:free" },
        ada: { prompt: "Sen Ada Lovelace'sın. Matematiksel sınırlar ve algoritmik yapıya odaklan. Yanıtın TÜRKÇE olsun.", freeModel: "google/gemini-2.0-flash-lite:free" },
        laotzu: { prompt: "Sen Lao Tzu'sun. Doğal akış ve beliriş (emergence) üzerinden yorumla. Yanıtın TÜRKÇE olsun.", freeModel: "openrouter/auto" },
        musashi: { prompt: "Sen Miyamoto Musashi'sin. Zamanlama, disiplin ve tek odaklılık sun. Yanıtın TÜRKÇE olsun.", freeModel: "meta-llama/llama-3.1-8b-instruct:free" },
        watts: { prompt: "Sen Alan Watts'sın. Konuyu farklı bir çerçeveye (reframing) oturt. Yanıtın TÜRKÇE olsun.", freeModel: "openrouter/auto" },
        karpathy: { prompt: "Sen Andrej Karpathy'sin. Uygulamalı yapay zeka ve ampirik verilere odaklan. Yanıtın TÜRKÇE olsun.", freeModel: "google/gemini-2.0-flash-lite:free" },
        sutskever: { prompt: "Sen Ilya Sutskever'sin. Yapay zekanın geleceği ve güvenlik sınırlarına odaklan. Yanıtın TÜRKÇE olsun.", freeModel: "google/gemini-2.0-flash-lite:free" },
        munger: { prompt: "Sen Charlie Munger'sın. Zihinsel modeller ve tersine çevirme (inversion) kullan. Yanıtın TÜRKÇE olsun.", freeModel: "openrouter/auto" },
        meadows: { prompt: "Sen Donella Meadows'sun. Geri bildirim döngüleri ve sistem dinamiklerine odaklan. Yanıtın TÜRKÇE olsun.", freeModel: "meta-llama/llama-3.1-8b-instruct:free" },
        taleb: { prompt: "Sen Nassim Taleb'sin. Kuyruk riskleri ve anti-kırılganlık üzerinden analiz et. Yanıtın TÜRKÇE olsun.", freeModel: "openrouter/auto" },
        rams: { prompt: "Sen Dieter Rams'sın. Tasarımın netliği ve kullanıcı deneyimine odaklan. Yanıtın TÜRKÇE olsun.", freeModel: "google/gemini-2.0-flash-lite:free" }
    };

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

    async function getResponseWithFallback(memberKey, userMsg) {
        const member = councilMembers[memberKey];
        try {
            const freeResponse = await callOpenRouter(member.freeModel, member.prompt, userMsg);
            if (!freeResponse.ok) throw new Error("Free model unavailable");
            const freeData = await freeResponse.json();
            if (freeData.error) throw new Error(freeData.error.message);
            return freeData.choices?.[0]?.message?.content || "Cevap üretilemedi.";
        } catch (err) {
            console.warn(`${memberKey} için ücretli modele geçiliyor...`);
            const paidResponse = await callOpenRouter(STABLE_PAID_MODEL, member.prompt, userMsg);
            if (paidResponse.status === 402) {
                throw new Error("LIMIT_EXCEEDED");
            }
            const paidData = await paidResponse.json();
            return paidData.choices?.[0]?.message?.content || "Cevap alınamadı.";
        }
    }

    try {
        const membersToUse = members && members.length > 0 ? members : Object.keys(councilMembers);

        const responses = await Promise.all(
            membersToUse.map(async (key) => {
                if (!councilMembers[key]) return { member: key, answer: "Üye bulunamadı." };
                const answer = await getResponseWithFallback(key, message);
                return { member: key, answer };
            })
        );

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