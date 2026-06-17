import axios from "axios";
import crypto from "node:crypto";

export const meta = { id: "perplexity", label: "Perplexity" };

const BASE = "https://www.perplexity.ai";

const HEADER_DASAR = {
  "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
  Accept: "text/event-stream",
  "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
  "Content-Type": "application/json",
  Origin: BASE,
  Referer: BASE + "/",
};

function buatCookie() {
  const cookies = {
    "pplx.visitor-id": crypto.randomUUID(),
    "pplx.session-id": crypto.randomUUID(),
    "pplx.edge-vid": crypto.randomUUID(),
    "pplx.edge-sid": crypto.randomUUID(),
  };
  return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; ");
}

function buatPayload(query) {
  return {
    params: {
      last_backend_uuid: crypto.randomUUID(),
      read_write_token: crypto.randomUUID(),
      attachments: [],
      language: "id-ID",
      timezone: "Asia/Jakarta",
      search_focus: "writing",
      sources: ["web"],
      frontend_uuid: crypto.randomUUID(),
      mode: "copilot",
      model_preference: "turbo",
      query_source: "followup",
      version: "2.18",
    },
    query_str: query,
  };
}

function parseSSE(raw) {
  const lines = raw.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    if (!lines[i].startsWith("data: ")) continue;
    try {
      const d = JSON.parse(lines[i].slice(6));
      if (d.text && d.final) {
        const parsed = JSON.parse(d.text);
        for (const item of parsed) {
          if (item.step_type === "FINAL" && item.content?.answer) {
            return JSON.parse(item.content.answer).answer.replace(/\[\d+\]/g, "").trim();
          }
        }
      }
    } catch {}
  }
  return null;
}

export async function ask(prompt, system) {
  try {
    const fullPrompt = system ? `${system}\n\n${prompt}` : prompt;

    const { data } = await axios.post(`${BASE}/rest/sse/perplexity_ask`, JSON.stringify(buatPayload(fullPrompt)), {
      headers: { ...HEADER_DASAR, Cookie: buatCookie(), "x-request-id": crypto.randomUUID() },
      timeout: 25000,
      responseType: "text",
    });

    const hasil = parseSSE(data);
    if (!hasil) return { ok: false, error: "Gagal parsing jawaban" };

    return { ok: true, text: hasil };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
