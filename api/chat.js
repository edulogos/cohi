export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "https://edulogos.github.io");
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
        socrates: { prompt: "Sen Sokrates'sin. Varsayımları sorgula. Yanıtın TÜRKÇE olsun.", name: "Sokrates" },
        feynman: { prompt: "Sen Richard Feynman'sın. Konuyu basitleştir, ilk prensiplere indir. Yanıtın TÜRKÇE olsun.", name: "Richard Feynman" },
        machiavelli: { prompt: "Sen Machiavelli'sin. Stratejik ve gerçekçi ol, güç dinamiklerini analiz et. Yanıtın TÜRKÇE olsun.", name: "Machiavelli" },
        torvalds: { prompt: "Sen Linus Torvalds'sın. Pragmatik mühendisliğe odaklan, pragmatik çözümler sun. Yanıtın TÜRKÇE olsun.", name: "Linus Torvalds" },
        aurelius: { prompt: "Sen Marcus Aurelius'sun. Stoacı perspektif sun, ahlaki netlik ver. Yanıtın TÜRKÇE olsun.", name: "Marcus Aurelius" },
        suntzu: { prompt: "Sen Sun Tzu'sun. Strateji ve arazi avantajına odaklan. Yanıtın TÜRKÇE olsun.", name: "Sun Tzu" },
        kahneman: { prompt: "Sen Daniel Kahneman'sın. Bilişsel önyargıları analiz et, karar tuzaklarını göster. Yanıtın TÜRKÇE olsun.", name: "Daniel Kahneman" },
        aristotle: { prompt: "Sen Aristo'sun. Sınıflandırma ve mantık çerçevesinde analiz et. Yanıtın TÜRKÇE olsun.", name: "Aristo" },
        ada: { prompt: "Sen Ada Lovelace'sın. Matematiksel sınırlar ve algoritmik yapıya odaklan. Yanıtın TÜRKÇE olsun.", name: "Ada Lovelace" },
        laotzu: { prompt: "Sen Lao Tzu'sun. Doğal akış ve beliriş (emergence) üzerinden yorumla. Yanıtın TÜRKÇE olsun.", name: "Lao Tzu" },
        musashi: { prompt: "Sen Miyamoto Musashi'sin. Zamanlama, disiplin ve tek odaklılık sun. Yanıtın TÜRKÇE olsun.", name: "Miyamoto Musashi" },
        watts: { prompt: "Sen Alan Watts'sın. Konuyu farklı bir çerçeveye (reframing) oturt. Yanıtın TÜRKÇE olsun.", name: "Alan Watts" },
        karpathy: { prompt: "Sen Andrej Karpathy'sin. Uygulamalı yapay zeka ve ampirik verilere odaklan. Yanıtın TÜRKÇE olsun.", name: "Andrej Karpathy" },
        sutskever: { prompt: "Sen Ilya Sutskever'sin. Yapay zekanın geleceği ve güvenlik sınırlarına odaklan. Yanıtın TÜRKÇE olsun.", name: "Ilya Sutskever" },
        munger: { prompt: "Sen Charlie Munger'sın. Zihinsel modeller ve tersine çevirme (inversion) kullan. Yanıtın TÜRKÇE olsun.", name: "Charlie Munger" },
        meadows: { prompt: "Sen Donella Meadows'sun. Geri bildirim döngüleri ve sistem dinamiklerine odaklan. Yanıtın TÜRKÇE olsun.", name: "Donella Meadows" },
        taleb: { prompt: "Sen Nassim Taleb'sin. Kuyruk riskleri ve anti-kırılganlık üzerinden analiz et. Yanıtın TÜRKÇE olsun.", name: "Nassim Taleb" },
        rams: { prompt: "Sen Dieter Rams'sın. Tasarımın netliği ve kullanıcı deneyimine odaklan. Yanıtın TÜRKÇE olsun.", name: "Dieter Rams" }
    };

    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('application/json')) {
        return res.status(400).json({ error: "Geçersiz Content-Type. application/json gerekli." });
    }

    if (message !== undefined && typeof message !== 'string') {
        return res.status(400).json({ error: "message parametresi string olmalıdır." });
    }

    if (message && message.length > 2000) {
        return res.status(400).json({ error: "Mesaj 2000 karakteri geçemez." });
    }

    if (message) {
        const dangerousPatterns = [/<script/i, /javascript:/i, /on\w+\s*=/i];
        if (dangerousPatterns.some(pattern => pattern.test(message))) {
            return res.status(400).json({ error: "Mesaj içinde izin verilmeyen karakterler tespit edildi." });
        }
    }

    if (members !== undefined) {
        if (!Array.isArray(members)) {
            return res.status(400).json({ error: "members parametresi array olmalıdır." });
        }
        if (members.length > 18) {
            return res.status(400).json({ error: "En fazla 18 üye seçilebilir." });
        }
        const validMemberIds = Object.keys(councilMembers);
        const invalidMembers = members.filter(m => !validMemberIds.includes(m));
        if (invalidMembers.length > 0) {
            return res.status(400).json({ error: `Geçersiz üye: ${invalidMembers.join(', ')}` });
        }
    }

    async function callOpenRouter(modelId, sysPrompt, userMsg) {
        return fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "HTTP-Referer": "https://edulogos.github.io/cohi",
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

    async function getResponse(modelId, prompt, userMsg) {
        const response = await callOpenRouter(modelId, prompt, userMsg);
        if (response.status === 402) {
            throw new Error("LIMIT_EXCEEDED");
        }
        const data = await response.json();
        return data.choices?.[0]?.message?.content || "Cevap alınamadı.";
    }

    try {
        const membersToUse = members && members.length > 0 ? members : Object.keys(councilMembers);
        const useCrossExamination = membersToUse.length >= 2 && membersToUse.length <= 3;

        if (useCrossExamination && message) {
            const round1Results = await Promise.all(
                membersToUse.map(async (key) => {
                    if (!councilMembers[key]) return { member: key, answer: "Üye bulunamadı." };
                    const round1Prompt = `Aşağıdaki soruyu ${councilMembers[key].name} olarak bağımsız şekilde analiz et. Kendi uzmanlık alanına odaklanarak, 200 kelimeyi geçmeyen bir analiz yap:\n\nSoru: ${message}`;
                    const answer = await getResponse(STABLE_PAID_MODEL, councilMembers[key].prompt, round1Prompt);
                    return { member: key, answer };
                })
            );

            const round2Results = await Promise.all(
                membersToUse.map(async (key) => {
                    if (!councilMembers[key]) return { member: key, answer: "Üye bulunamadı." };

                    const otherMembers = membersToUse.filter(m => m !== key);
                    const otherAnalyses = round1Results
                        .filter(r => otherMembers.includes(r.member))
                        .map(r => `${councilMembers[r.member]?.name || r.member}: ${r.answer}`)
                        .join("\n\n");

                    const round2Prompt = `Sen ${councilMembers[key].name}'sin. Aşağıda diğer konsey üyelerinin soruya verdikleri yanıtlar var:\n\n${otherAnalyses}\n\nŞimdi sen, ${councilMembers[key].name} olarak, bu diğer üyelerin argümanlarına kendi perspektifinden yanıt ver.\nYANIT FORMATI:\nHer üyenin argümanına şu şekilde yanıt ver:\n[ÜYE_ADI]: [Katıldığın/katılmadığın noktalar]... [Kendi eklediğin noktalar]...\n\nToplam 250 kelimeyi geçme. Yanıtın TÜRKÇE olsun. Başka başlık veya alt başlık kullanma.`;

                    const answer = await getResponse(STABLE_PAID_MODEL, councilMembers[key].prompt, round2Prompt);
                    return { member: key, answer };
                })
            );

            const combinedText = [...round1Results, ...round2Results]
                .map(r => `${r.member.toUpperCase()}: ${r.answer}`)
                .join("\n\n");

            let verdict = "";
            try {
                const verdictPrompt = `Sen bir moderatörsün. Aşağıda bir konsey tartışması var:\n\n${combinedText}\n\nBu tartışmayı sentezle. Türkçe olarak şu bölümleri kullan:\n\n**Genel Değerlendirme:** [Ana sonuç ve değerlendirme]\n\n**Çözümsüz Sorular:** [Belirsizlikler ve açık sorular - madde madde]\n\n**Önerilen Sonraki Adımlar:** [Ne yapılmalı - madde madde]\n\nBaşka başlık veya format kullanma. Yanıtın TÜRKÇE olsun.`;
                verdict = await getResponse(STABLE_PAID_MODEL, verdictPrompt, "Tartışmayı özetle");
            } catch (e) {
                verdict = "Moderatör şu an ulaşılamaz durumda.";
            }

            res.status(200).json({ round1: round1Results, round2: round2Results, verdict });

        } else {
            const responses = await Promise.all(
                membersToUse.map(async (key) => {
                    if (!councilMembers[key]) return { member: key, answer: "Üye bulunamadı." };
                    const answer = await getResponse(STABLE_PAID_MODEL, councilMembers[key].prompt, message || '');
                    return { member: key, answer };
                })
            );

            const combinedText = responses.map(r => `${r.member.toUpperCase()}: ${r.answer}`).join("\n\n");
            let verdict = "";
            try {
                verdict = await getResponse(STABLE_PAID_MODEL, "Sen bir moderatörsün. Tartışmayı özetle ve Türkçe olarak nihai bir yargı sun.", combinedText);
            } catch (e) {
                verdict = "Moderatör şu an ulaşılamaz durumda.";
            }

            res.status(200).json({ responses, verdict });
        }
    } catch (error) {
        console.error("Genel Backend Hatası:", error);
        res.status(500).json({ error: "Sunucu hatası oluştu." });
    }
}