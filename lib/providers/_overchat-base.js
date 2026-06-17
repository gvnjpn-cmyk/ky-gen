// Adapter dasar untuk provider yang lewat backend overchat.ai
// (dipakai oleh claude-haiku & qwen, beda model/personaId aja)
import crypto from "node:crypto";

const API = "https://api.overchat.ai/v1/chat/completions";

const BASE_HEADERS = {
  "sec-ch-ua-platform": `"Android"`,
  "sec-ch-ua": `"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"`,
  "sec-ch-ua-mobile": "?1",
  "x-device-language": "id-ID",
  "x-device-platform": "web",
  "x-device-version": "1.0.44",
  "user-agent":
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36",
  accept: "*/*",
  "content-type": "application/json",
  origin: "https://overchat.ai",
  referer: "https://overchat.ai/",
  "accept-language": "id-ID,id;q=0.9",
  priority: "u=1, i",
};

export async function overchatAsk({ prompt, system, model, personaId, timeoutMs = 25000 }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const deviceId = crypto.randomUUID();

    const messages = [
      { id: crypto.randomUUID(), role: "user", content: prompt },
    ];

    if (system) {
      messages.push({ id: crypto.randomUUID(), role: "system", content: system });
    }

    const body = {
      chatId: crypto.randomUUID(),
      model,
      messages,
      personaId,
      frequency_penalty: 0,
      max_tokens: 4000,
      presence_penalty: 0,
      stream: true,
      temperature: 0.4,
      top_p: 0.95,
    };

    const response = await fetch(API, {
      method: "POST",
      headers: { ...BASE_HEADERS, "x-device-uuid": deviceId },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return { ok: false, error: `HTTP ${response.status}: ${text.slice(0, 300)}` };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let answer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line.startsWith("data:")) continue;

        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;

        try {
          const json = JSON.parse(data);
          const content = json.choices?.[0]?.delta?.content;
          if (typeof content === "string") answer += content;
        } catch {}
      }
    }

    if (!answer.trim()) return { ok: false, error: "Respons kosong dari provider" };

    return { ok: true, text: answer };
  } catch (err) {
    return { ok: false, error: err.name === "AbortError" ? "Timeout" : err.message };
  } finally {
    clearTimeout(timer);
  }
}
