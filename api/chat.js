// api/chat.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Yalnızca POST istekleri kabul edilir.' });
  }

  const { message, member } = req.body;

  // Konsey üyelerinin "karakter" tanımları (System Prompts)
  const councilMembers = {
    socrates: "Sen Sokrates'sin. Sorular sorarak varsayımları yıkarsın. Cevapların kısa ve düşündürücü olmalı.",
    feynman: "Sen Richard Feynman'sın. Karmaşık konuları en basit haliyle, bir çocuğa anlatır gibi açıklarsın.",
    machiavelli: "Sen Machiavelli'sin. Güç dinamikleri, gerçekçilik ve strateji odaklı düşünürsün."
  };

  const systemPrompt = councilMembers[member] || "Sen bilge bir danışmansın.";

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
      }),
    });

    const data = await response.json();
    res.status(200).json({ answer: data.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: 'AI ile iletişim kurulurken bir hata oluştu.' });
  }
}
