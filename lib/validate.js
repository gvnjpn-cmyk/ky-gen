// Bersihkan output AI: kadang masih ke-selip markdown fence walau udah dilarang di prompt
export function extractCode(raw) {
  if (!raw) return "";
  let text = raw.trim();

  const fenceMatch = text.match(/```(?:js|javascript|jsx)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  } else {
    text = text.replace(/^```(?:js|javascript|jsx)?/i, "").replace(/```$/, "").trim();
  }

  return text;
}

// Validasi format plugin — niru cek yang dipakai addplugin.js di shotabase
export function validatePlugin(code) {
  const hasExport = /export\s+default\s+handler/.test(code);
  const hasCommand = /handler\.command\s*=\s*\[/.test(code);
  const hasAsync = /(?:const|let)\s+handler\s*=\s*async/.test(code);

  if (hasExport && hasCommand && hasAsync) {
    return { valid: true };
  }

  const missing = [];
  if (!hasAsync) missing.push("deklarasi 'const handler = async (...)'");
  if (!hasCommand) missing.push("'handler.command = [...]'");
  if (!hasExport) missing.push("'export default handler'");

  return { valid: false, reason: `Format plugin tidak lengkap, kurang: ${missing.join(", ")}` };
}

// Validasi format case — niru cek di case_manager.js (parseInput)
export function validateCase(code) {
  const hasCase = /case\s+["'`].+?["'`]\s*:/.test(code);
  const hasBlock = /\{[\s\S]*\}/.test(code);
  const hasBreak = /\bbreak\b/.test(code);

  if (hasCase && hasBlock && hasBreak) {
    return { valid: true };
  }

  const missing = [];
  if (!hasCase) missing.push("label \"case 'nama':\"");
  if (!hasBlock) missing.push("blok kurung kurawal { }");
  if (!hasBreak) missing.push("kata kunci 'break'");

  return { valid: false, reason: `Format case tidak lengkap, kurang: ${missing.join(", ")}` };
}

export function validate(code, type) {
  return type === "case" ? validateCase(code) : validatePlugin(code);
}

// Ambil nama-nama case label dari sebuah blok (buat cek duplikat pas mau di-push ke GitHub)
export function extractCaseNames(code) {
  const names = [];
  const regex = /case\s+["'`](.+?)["'`]\s*:/g;
  let match;
  while ((match = regex.exec(code)) !== null) {
    names.push(match[1].trim().toLowerCase());
  }
  return names;
}

// Ambil command names dari plugin (buat suggest filename)
export function extractCommands(code) {
  const match = code.match(/handler\.command\s*=\s*\[([\s\S]*?)\]/);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((s) => s.trim().replace(/^["'`]/, "").replace(/["'`]$/, ""))
    .filter(Boolean);
}
