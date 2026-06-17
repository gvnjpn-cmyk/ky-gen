import { PROVIDER_MAP, PROVIDER_LIST } from "./providers/index.js";
import { buildPrompt } from "./prompts.js";
import { extractCode, validate } from "./validate.js";

async function runOne(provider, userText, systemText, type) {
  const start = Date.now();
  try {
    const result = await provider.ask(userText, systemText);
    const elapsedMs = Date.now() - start;

    if (!result.ok) {
      return { providerId: provider.meta.id, providerLabel: provider.meta.label, ok: false, error: result.error, elapsedMs };
    }

    const code = extractCode(result.text);
    const validation = validate(code, type);

    return {
      providerId: provider.meta.id,
      providerLabel: provider.meta.label,
      ok: true,
      code,
      raw: result.text,
      validation,
      elapsedMs,
    };
  } catch (err) {
    return {
      providerId: provider.meta.id,
      providerLabel: provider.meta.label,
      ok: false,
      error: err.message,
      elapsedMs: Date.now() - start,
    };
  }
}

export async function generate({ type, description, flags = [], mode = "squad", providerId, exclude = [] }) {
  if (!description || !description.trim()) {
    return { ok: false, error: "Deskripsi tidak boleh kosong" };
  }

  const { system, user } = buildPrompt(type, { description, flags });

  if (mode === "manual") {
    const provider = PROVIDER_MAP[providerId];
    if (!provider) return { ok: false, error: `Provider '${providerId}' tidak ditemukan` };

    const result = await runOne(provider, user, system, type);
    return { ok: result.ok, mode: "manual", winner: result.ok ? result : null, attempts: [result] };
  }

  const candidates = PROVIDER_LIST.filter((p) => !exclude.includes(p.id)).map((p) => PROVIDER_MAP[p.id]);

  if (!candidates.length) {
    return { ok: false, error: "Semua provider sudah di-exclude, coba reset." };
  }

  const settled = await Promise.allSettled(candidates.map((p) => runOne(p, user, system, type)));
  const attempts = settled.map((s) =>
    s.status === "fulfilled" ? s.value : { ok: false, error: s.reason?.message || "Unknown error" }
  );

  // Prioritaskan provider yang sukses DAN formatnya valid, baru fallback ke yang sukses tapi formatnya perlu dicek manual
  const validWinner = attempts.find((a) => a.ok && a.validation?.valid);
  const anyWinner = attempts.find((a) => a.ok);
  const winner = validWinner || anyWinner || null;

  return { ok: Boolean(winner), mode: "squad", winner, attempts };
}
