import axios from "axios";
import FormData from "form-data";
import crypto from "node:crypto";
import * as cheerio from "cheerio";
import { CookieJar } from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";

export const meta = { id: "chatgpt", label: "ChatGPT (gptonline)" };

const BASE_URL = "https://gptonline.ai";
const PAGE_URL = `${BASE_URL}/id/chat-online/`;
const AJAX_URL = `${BASE_URL}/id/wp-admin/admin-ajax.php`;

const UA =
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36";

function extractNonceCandidates(text) {
  const source = String(text || "");
  const candidates = [];
  const patterns = [
    /["']nonce["']\s*[:=]\s*["']([a-zA-Z0-9_-]{8,})["']/gi,
    /nonce\s*[:=]\s*["']([a-zA-Z0-9_-]{8,})["']/gi,
    /name=["']nonce["'][^>]*value=["']([a-zA-Z0-9_-]{8,})["']/gi,
    /value=["']([a-zA-Z0-9_-]{8,})["'][^>]*name=["']nonce["']/gi,
    /data-nonce=["']([a-zA-Z0-9_-]{8,})["']/gi,
    /gpt_embed_get_message[^"'<>]{0,500}["']([a-zA-Z0-9_-]{8,})["']/gi,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(source)) !== null) {
      if (match[1]) candidates.push(match[1]);
    }
  }
  return [...new Set(candidates)];
}

function cleanAnswer(text) {
  return String(text || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li>/gi, "- ")
    .replace(/<pre[^>]*>/gi, "")
    .replace(/<\/pre>/gi, "")
    .replace(/<code[^>]*>/gi, "")
    .replace(/<\/code>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function getNonce(client) {
  const res = await client.get(PAGE_URL, {
    headers: { accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", referer: BASE_URL },
  });

  const html = String(res.data || "");
  const $ = cheerio.load(html);
  const candidates = [];

  $('[name="nonce"], [id*="nonce"], [data-nonce]').each((_, el) => {
    const value = $(el).attr("value") || $(el).attr("content") || $(el).attr("data-nonce") || $(el).text();
    if (value) candidates.push(value.trim());
  });

  candidates.push(...extractNonceCandidates(html));

  const inlineScripts = $("script").map((_, el) => $(el).html()).get().filter(Boolean);
  for (const script of inlineScripts) candidates.push(...extractNonceCandidates(script));

  const cleanCandidates = [...new Set(candidates)]
    .map((x) => String(x || "").trim())
    .filter((x) => /^[a-zA-Z0-9_-]{8,80}$/.test(x));

  if (!cleanCandidates.length) throw new Error("Nonce tidak ditemukan otomatis");
  return cleanCandidates[0];
}

async function sendMessage(client, question, userId) {
  const form = new FormData();
  form.append("msg", question);
  form.append("user_id", userId);
  form.append("action", "gpt_embed_send_message");

  const res = await client.post(AJAX_URL, form, {
    headers: { ...form.getHeaders(), accept: "*/*", origin: BASE_URL, referer: PAGE_URL },
  });

  if (res.status !== 200 || !res.data?.id) throw new Error(`Gagal send_message | HTTP ${res.status}`);
  return res.data.id;
}

async function getMessage(client, chatHistoryId, userId, nonce) {
  const form = new FormData();
  form.append("chat_history_id", String(chatHistoryId));
  form.append("user_id", userId);
  form.append("action", "gpt_embed_get_message");
  form.append("nonce", nonce);

  const res = await client.post(AJAX_URL, form, {
    headers: { ...form.getHeaders(), accept: "*/*", origin: BASE_URL, referer: PAGE_URL },
  });

  if (res.status !== 200 || !res.data?.message) throw new Error(`Gagal get_message | HTTP ${res.status}`);
  return res.data.message;
}

export async function ask(prompt, system) {
  try {
    const jar = new CookieJar();
    const client = wrapper(
      axios.create({
        jar,
        withCredentials: true,
        timeout: 25000,
        validateStatus: () => true,
        headers: { "user-agent": UA, "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7" },
      })
    );

    const fullPrompt = system ? `${system}\n\n${prompt}` : prompt;
    const userId = crypto.randomUUID();

    const nonce = await getNonce(client);
    const chatHistoryId = await sendMessage(client, fullPrompt, userId);
    const raw = await getMessage(client, chatHistoryId, userId, nonce);
    const answer = cleanAnswer(raw);

    if (!answer) return { ok: false, error: "Respons kosong dari provider" };
    return { ok: true, text: answer };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
