// api/chat.js
export default async function handler(req, res) {

  // === CORS ===
  res.setHeader("Access-Control-Allow-Origin", "https://educaprof.github.io");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // === METHOD CHECK ===
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Yalnızca POST istekleri kabul edilir.' });
  }

  const { message, members } = req.body;

  // === COUNCIL MEMBERS ===
  const councilMembers = {
    socrates: {
      prompt: `Sen Sokrates'sin.
- Varsayımları sorgula
- Kullanıcının düşünme biçimine meydan oku
- Hemen doğrudan cevap verme, düşündürücü sorular sor.
Lütfen sadece TÜRKÇE yanıt ver.`,
      model: "openai/gpt-4o-mini"
    },
    feynman: {
      prompt: `Sen Richard Feynman'sın.
- Konuları basitleştirerek açıkla
- Problemleri ilk prensiplerine (first principles) kadar indirge
- Anlaşılır ve net örnekler kullan.
Lütfen sadece TÜRKÇE yanıt ver.`,
      model: "openai/gpt-4o-mini"
    },
    machiavelli: {
      prompt: `Sen Machiavelli'sin.
- Güç ve stratejiye odaklan
- Pragmatik (faydacı) ve gerçekçi ol
- Avantaj elde etme üzerine düşün.
Lütfen sadece TÜRKÇE yanıt ver.`,
      model: "meta-llama/llama-3.1-8b-instruct"
    }
  };

  // === SELECTED MEMBERS ===
  const membersToUse = members && members.length > 0
    ? members
    : Object.keys(councilMembers);

  try {

    // === MULTI AGENT CALL ===
    const responses = await Promise.all(
      membersToUse.map(async (key) => {

        const memberData = councilMembers[key];

        if (!memberData) {
          return {
            member: key,
            answer: "Geçersiz üye"
          };
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://educaprof.github.io/cohi',
            'X-Title': 'Council of High Intelligence',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: memberData.model,
            messages: [
              { role: 'system', content: memberData.prompt },
              { role: 'user', content: message }
            ],
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          return {
            member: key,
            answer: data.error?.message || "API hatası"
          };
        }

        return {
          member: key,
          answer: data.choices?.[0]?.message?.content || "Boş cevap"
        };
      })
    );

    // === FINAL VERDICT ===
    const combinedText = responses
      .map(r => `${r.member}: ${r.answer}`)
      .join("\n");

    const finalResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://educaprof.github.io/cohi',
        'X-Title': 'Yüksek Zeka Konseyi',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
  { role: "system", content: "Sen bir moderatörsün. Verilen tartışmayı özetle, tarafların argümanlarını değerlendir ve net bir nihai karar (Final Verdict) sun. Cevabını MUTLAKA TÜRKÇE olarak ver." },
  { role: "user", content: combinedText }
]
      })
    });

    const finalData = await finalResponse.json();

    const verdict =
      finalData.choices?.[0]?.message?.content || "Final değerlendirme alınamadı.";

    // === RESPONSE ===
    res.status(200).json({
      responses,
      verdict
    });

  } catch (error) {
    console.error("Backend Hatası:", error);
    res.status(500).json({ error: error.message });
  }
}
