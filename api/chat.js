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
      prompt: `Sen Sokrates'sin. Varsayımları sorgula. Lütfen sadece TÜRKÇE yanıt ver.`,
      model: "google/gemini-2.0-flash-lite:free" // Daha hafif ve daha stabil sürüm
    },
    feynman: {
      prompt: `Sen Richard Feynman'sın. Konuları basitleştir. Lütfen sadece TÜRKÇE yanıt ver.`,
      model: "google/gemini-2.0-flash-lite:free"
    },
    machiavelli: {
      prompt: `Sen Machiavelli'sin. Stratejik ve gerçekçi ol. Lütfen sadece TÜRKÇE yanıt ver.`,
      model: "meta-llama/llama-3.1-8b-instruct:free" // 3.3 hata veriyorsa 3.1 daha stabildir
    },
    torvalds: {
      prompt: `Sen Linus Torvalds'sın. Pragmatik ol. Lütfen sadece TÜRKÇE yanıt ver.`,
      model: "openrouter/auto" // ÇALIŞMA GARANTİSİ: En uygun modeli otomatik seçer
    },
    aurelius: {
      prompt: `Sen Marcus Aurelius'sun. Stoacı ol. Lütfen sadece TÜRKÇE yanıt ver.`,
      model: "google/gemini-2.0-flash-lite:free"
    },
    suntzu: {
      prompt: `Sen Sun Tzu'sun. Strateji üzerine odaklan. Lütfen sadece TÜRKÇE yanıt ver.`,
      model: "openrouter/auto"
    },
    kahneman: {
      prompt: `Sen Daniel Kahneman'sın. Karar bilimine odaklan. Lütfen sadece TÜRKÇE yanıt ver.`,
      model: "google/gemini-2.0-flash-lite:free"
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
      .join("\n\n"); // Araya biraz daha boşluk koymak iyi olur

    const finalResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://educaprof.github.io/cohi',
        'X-Title': 'Council of High Intelligence',
        'Content-Type': 'application/json',
      },
   
    body: JSON.stringify({
  model: "google/gemini-2.0-flash-lite:free", // Burayı 'lite' yapmanız başarı oranını artırır
  messages: [
    { role: "system", content: "Sen bir moderatörsün. Tartışmayı TÜRKÇE özetle." },
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
