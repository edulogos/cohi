const { AGENTS_DATA } = require('./agents-data.js');

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    if (req.method !== "POST") {
        return res.status(405).json({ message: "Yalnızca POST istekleri kabul edilir." });
    }

    const { message, members, mode } = req.body;
    const STABLE_PAID_MODEL = "openai/gpt-4o-mini";
    const OPUS_MODEL = "anthropic/claude-3.5-sonnet";

    if (req.headers['content-type'] !== 'application/json') {
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
        if (mode === 'duo' && members.length !== 2) {
            return res.status(400).json({ error: "Duo modu için tam olarak 2 üye seçilmelidir." });
        }
        if (mode !== 'duo' && members.length > 18) {
            return res.status(400).json({ error: "En fazla 18 üye seçilebilir." });
        }
        const validMemberIds = Object.keys(AGENTS_DATA);
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

    function buildSystemPrompt(memberKey, roundType, otherMembers = []) {
        const agent = AGENTS_DATA[memberKey];
        if (!agent) {
            return "Sen bir konsey üyesisin. Yanıtın TÜRKÇE olsun.";
        }

        let prompt = `${agent.identity}\n\n${agent.groundingProtocol}\n\n${agent.analyticalMethod}\n\n${agent.uniqueInsight}\n\n${agent.blindSpot}\n\n${agent.deliberationStyle}`;

        if (roundType === 1) {
            prompt += `\n\nYanıtın TÜRKÇE olsun. 200 kelimeyu geçme.`;
        } else if (roundType === 2) {
            prompt += `\n\n[YENİ] Round 2 çıktı formatın zorunludur:\n${agent.outputFormatRound2}`;
            prompt += `\n\nYanıtın TÜRKÇE olsun. 250 kelimeyu geçme.`;
        }

        return prompt;
    }

    async function getResponseWithFallback(memberKey, userMsg, roundType = 1, otherMembers = []) {
        const agent = AGENTS_DATA[memberKey];
        if (!agent) {
            return { member: memberKey, answer: "Üye bulunamadı." };
        }

        const systemPrompt = buildSystemPrompt(memberKey, roundType, otherMembers);
        const freeModel = agent.freeModel || "google/gemini-2.0-flash-lite:free";

        try {
            const freeResponse = await callOpenRouter(freeModel, systemPrompt, userMsg);
            if (!freeResponse.ok) throw new Error("Free model unavailable");
            const freeData = await freeResponse.json();
            if (freeData.error) throw new Error(freeData.error.message);
            return { member: memberKey, answer: freeData.choices?.[0]?.message?.content || "Cevap üretilemedi." };
        } catch (err) {
            console.warn(`${memberKey} için ücretli modele geçiliyor...`);
            try {
                const paidModel = agent.tier === "opus" ? OPUS_MODEL : STABLE_PAID_MODEL;
                const paidResponse = await callOpenRouter(paidModel, systemPrompt, userMsg);
                if (paidResponse.status === 402) {
                    throw new Error("LIMIT_EXCEEDED");
                }
                const paidData = await paidResponse.json();
                return { member: memberKey, answer: paidData.choices?.[0]?.message?.content || "Cevap alınamadı." };
            } catch (paidErr) {
                if (paidErr.message === "LIMIT_EXCEEDED") {
                    throw new Error("LIMIT_EXCEEDED");
                }
                return { member: memberKey, answer: "Cevap alınamadı." };
            }
        }
    }

    try {
        const membersToUse = members && members.length > 0 ? members : Object.keys(AGENTS_DATA);
        const useCrossExamination = membersToUse.length >= 2 && membersToUse.length <= 3 && mode !== 'duo';
        const useDuoMode = mode === 'duo' && membersToUse.length === 2;

        if (useDuoMode && message) {
            const duoResults = await Promise.all(
                membersToUse.map(async (key) => {
                    const otherMember = membersToUse.find(m => m !== key);
                    const round1Prompt = `Aşağıdaki soruyu ${AGENTS_DATA[key]?.figure || key} olarak bağımsız şekilde analiz et. Kendi uzmanlık alanına odaklanarak, 300 kelimeyu geçmeyen bir analiz yap:\n\nSoru: ${message}`;
                    return getResponseWithFallback(key, round1Prompt, 1);
                })
            );

            const round2Results = await Promise.all(
                membersToUse.map(async (key) => {
                    const otherMember = membersToUse.find(m => m !== key);
                    const otherAgent = AGENTS_DATA[otherMember];
                    const otherAnalysis = duoResults.find(r => r.member === otherMember)?.answer || "";

                    const round2Prompt = `Sen ${AGENTS_DATA[key]?.figure || key}'sin. Aşağıda konsey arkadaşının soruya verdiği yanıt var:\n\n${otherAgent?.figure || otherMember}: ${otherAnalysis}\n\nŞimdi sen, ${AGENTS_DATA[key]?.figure || key} olarak, bu arkadaşının argümanına kendi perspektifinden yanıt ver. Şunlardan birini veya birkaçını yap:\n- Katıldığın noktaları belirt\n- Katılmadığın noktalara itiraz et\n- Eksik kalan noktaları tamamla\n- Kendi argümanını güçlendir\n\n300 kelimeyu geçme. Yanıtın TÜRKÇE olsun.`;

                    return getResponseWithFallback(key, round2Prompt, 2);
                })
            );

            const combinedText = [...duoResults, ...round2Results]
                .map(r => `${r.member.toUpperCase()}: ${r.answer}`)
                .join("\n\n");

            let verdict = "";
            try {
                const verdictPrompt = `Sen bir moderatörsün. Aşağıda bir konsey tartışması var:\n\n${combinedText}\n\nBu tartışmayı sentezle ve Türkçe olarak şu formatta bir nihai karar sun:\n\n[Genel değerlendirmen]\n\n## Çözümsüz Kalan Sorular\n- [Belirsizlikler ve açık sorular]\n\n## Önerilen Sonraki Adımlar\n- [Ne yapılmalı]\n\n\nYanıtın TÜRKÇE olsun.`;
                const modResponse = await callOpenRouter(STABLE_PAID_MODEL, verdictPrompt, "Tartışmayı özetle");
                const modData = await modResponse.json();
                verdict = modData.choices?.[0]?.message?.content || "Özet oluşturulamadı.";
            } catch (e) {
                verdict = "Moderatör şu an ulaşılamaz durumda.";
            }

            res.status(200).json({ round1: duoResults, round2: round2Results, verdict });

        } else if (useCrossExamination && message) {
            const round1Results = await Promise.all(
                membersToUse.map(async (key) => {
                    const round1Prompt = `Aşağıdaki soruyu ${AGENTS_DATA[key]?.figure || key} olarak bağımsız şekilde analiz et. Kendi uzmanlık alanına odaklanarak, 200 kelimeyu geçmeyen bir analiz yap:\n\nSoru: ${message}`;
                    return getResponseWithFallback(key, round1Prompt, 1);
                })
            );

            const round2Results = await Promise.all(
                membersToUse.map(async (key) => {
                    const otherMembers = membersToUse.filter(m => m !== key);
                    const otherAnalyses = round1Results
                        .filter(r => otherMembers.includes(r.member))
                        .map(r => `${AGENTS_DATA[r.member]?.figure || r.member}: ${r.answer}`)
                        .join("\n\n");

                    const round2Prompt = `Sen ${AGENTS_DATA[key]?.figure || key}'sin. Aşağıda diğer konsey üyelerinin soruya verdikleri yanıtlar var:\n\n${otherAnalyses}\n\nŞimdi sen, ${AGENTS_DATA[key]?.figure || key} olarak, bu diğer üyelerin argümanlarına kendi perspektifinden yanıt ver. Şunlardan birini veya birkaçını yap:\n- Katıldığın noktaları belirt\n- Katılmadığın noktalara itiraz et\n- Eksik kalan noktaları tamamla\n- Kendi argümanını güçlendir\n\nHer üyenin argümanına ayrı ayrı yanıt ver. Toplam 250 kelimeyu geçme.\n\n[YENİ] Round 2 çıktı formatın zorunludur:\n${AGENTS_DATA[key]?.outputFormatRound2 || ''}\n\nYanıtın TÜRKÇE olsun.`;

                    return getResponseWithFallback(key, round2Prompt, 2);
                })
            );

            const combinedText = [...round1Results, ...round2Results]
                .map(r => `${r.member.toUpperCase()}: ${r.answer}`)
                .join("\n\n");

            let verdict = "";
            try {
                const verdictPrompt = `Sen bir moderatörsün. Aşağıda bir konsey tartışması var:\n\n\n${combinedText}\n\nBu tartışmayı sentezle ve Türkçe olarak şu formatta bir nihai karar sun:\n\n[Genel değerlendirmen]\n\n## Çözümsüz Kalan Sorular\n- [Belirsizlikler ve açık sorular]\n\n## Önerilen Sonraki Adımlar\n- [Ne yapılmalı]\n\nYanıtın TÜRKÇE olsun.`;
                const modResponse = await callOpenRouter(STABLE_PAID_MODEL, verdictPrompt, "Tartışmayı özetle");
                const modData = await modResponse.json();
                verdict = modData.choices?.[0]?.message?.content || "Özet oluşturulamadı.";
            } catch (e) {
                verdict = "Moderatör şu an ulaşılamaz durumda.";
            }

            res.status(200).json({ round1: round1Results, round2: round2Results, verdict });

        } else {
            const responses = await Promise.all(
                membersToUse.map(async (key) => {
                    const answer = await getResponseWithFallback(key, message || '', 1);
                    return answer;
                })
            );

            const combinedText = responses.map(r => `${r.member.toUpperCase()}: ${r.answer}`).join("\n\n");
            let verdict = "";
            try {
                const modResponse = await callOpenRouter(STABLE_PAID_MODEL, "Sen bir moderatörsün. Tartışmayı özetle ve Türkçe olarak nihai bir yargı sun. Üyelerin isimlerini <strong>İsim</strong> formatında yaz.", combinedText);
                const modData = await modResponse.json();
                verdict = modData.choices?.[0]?.message?.content || "Özet oluşturulamadı.";
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