import crypto from "node:crypto";

export const meta = { id: "gpt-4o-mini", label: "GPT-4o-mini" };

const API = "https://aga-api.aichatting.net/aigc/chat/v2/professional/stream";

const PUBLIC_KEY_BASE64 =
  "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDCAdf/EyIbLBxjGqmh7qLU6/CPCzru+75+82OSPZ+nf4BFvg88drpZ6KigNW0J8TNgxe6Yms1irCZNVDyu+RXsl4y/7c2KOHc4OGTzHB5fUMiMasFUvcEs2P70e6yA/sKHZfBLG1XPhlb84Ibs3nhD3W5e2SuC+4EuVkaqzN08LQIDAQAB";

const UA =
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36";

function makePublicKey() {
  const wrapped = PUBLIC_KEY_BASE64.match(/.{1,64}/g).join("\n");
  return `-----BEGIN PUBLIC KEY-----\n${wrapped}\n-----END PUBLIC KEY-----`;
}

function encryptVisitorId(visitorId) {
  const encrypted = crypto.publicEncrypt(
    { key: makePublicKey(), padding: crypto.constants.RSA_PKCS1_PADDING },
    Buffer.from(visitorId)
  );
  return encrypted.toString("base64");
}

function cleanAnswer(text) {
  return String(text || "")
    .replace(/-=-\s*--/g, " ")
    .replace(/--@DONE@--/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function ask(prompt, system) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);

  try {
    const fullPrompt = system ? `${system}\n\n${prompt}` : prompt;
    const visitorId = crypto.randomBytes(16).toString("hex");
    const vtoken = encryptVisitorId(visitorId);
    const conversationId = crypto.randomInt(10000000, 99999999);

    const body = {
      spaceHandle: true,
      roleId: 0,
      messages: [{ role: "user", content: [{ type: "text", text: fullPrompt }] }],
      conversationId,
      model: "gpt-4o-mini",
    };

    const response = await fetch(API, {
      method: "POST",
      headers: {
        "sec-ch-ua-platform": `"Android"`,
        lang: "en",
        "sec-ch-ua": `"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"`,
        "sec-ch-ua-mobile": "?1",
        vtoken,
        source: "web",
        "user-agent": UA,
        accept: "text/event-stream,application/json, text/event-stream",
        "content-type": "application/json",
        origin: "https://www.aichatting.net",
        referer: "https://www.aichatting.net/",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        priority: "u=1, i",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return { ok: false, error: `HTTP ${response.status}: ${text.slice(0, 300)}` };
    }
    if (!response.body) return { ok: false, error: "Response body kosong" };

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let answer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || "";

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5);
        if (!data.trim() || data.includes("--@DONE@--")) continue;
        answer += data;
      }
    }

    answer = cleanAnswer(answer);
    if (!answer) return { ok: false, error: "Respons kosong dari provider" };

    return { ok: true, text: answer };
  } catch (err) {
    return { ok: false, error: err.name === "AbortError" ? "Timeout" : err.message };
  } finally {
    clearTimeout(timer);
  }
}
