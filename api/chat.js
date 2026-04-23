// api/chat.js
export default async function handler(req, res) {
  // CORS HEADERS
  res.setHeader("Access-Control-Allow-Origin", "https://educaprof.github.io");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Preflight request (EN KRİTİK KISIM)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Sadece POST kabul et
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Yalnızca POST istekleri kabul edilir.' });
  }

  const { message, member } = req.body;

  const councilMembers = {
    socrates: {
      prompt: "Sen Sokrates'sin. Varsayımları yıkar, derin ve sorgulayıcı cevaplar verirsin.",
      model: "anthropic/claude-3.5-sonnet"
    },
    feynman: {
      prompt: "Sen Richard Feynman'sın. Karmaşık problemleri ilk prensiplerine ayırarak basitçe açıklarsın.",
      model: "openai/gpt-4o"
    },
    machiavelli: {
      prompt: "Sen Machiavelli'sin. Güç dinamikleri, gerçekçilik ve insan doğası odaklı stratejiler sunarsın.",
      model: "meta-llama/llama-3.1-70b-instruct"
    }
  };

  const selectedMember = councilMembers[member] || councilMembers['socrates'];

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://educaprof.github.io/cohi',
        'X-Title': 'Council of High Intelligence',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: selectedMember.model,
        messages: [
          { role: 'system', content: selectedMember.prompt },
          { role: 'user', content: message }
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'API Hatası');
    }

    res.status(200).json({ answer: data.choices[0].message.content });
  } catch (error) {
    console.error("Backend Hatası:", error);
    res.status(500).json({ error: 'Konsey üyesine ulaşılamadı.' });
  }
}