import crypto from "node:crypto";

export const meta = { id: "kimi", label: "Kimi K2.5 Thinking" };

const API = "https://api.easemate.ai";
const ORIGIN = "https://www.easemate.ai";
const WASM_SOURCE = "https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/chat_generatorrr.wasm";
const MODEL_ID = 10;

const USER_AGENT =
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36";

// Cache bytes WASM di memori instance serverless biar gak fetch ulang tiap request
let _wasmBytesCache = null;

function epochNanoseconds() {
  return `${BigInt(Date.now()) * 1_000_000n + BigInt(process.hrtime.bigint() % 1_000_000n)}`;
}

class EaseMateWasmSigner {
  constructor({ wasmBytes, origin = ORIGIN, visitorId, identityId = "" }) {
    this.wasmBytes = wasmBytes;
    this.origin = origin;
    this.visitorId = visitorId;
    this.identityId = identityId;
    this.wasm = null;
    this.cachedUint8ArrayMemory0 = null;
    this.cachedDataViewMemory0 = null;
    this.decoder = new TextDecoder("utf-8", { ignoreBOM: true, fatal: true });
    this.encoder = new TextEncoder();
    this.store = new Map();
    this.refreshLocalStorage();
  }

  refreshLocalStorage() {
    this.store.set("app-main", JSON.stringify({ visitorId: this.visitorId, identityId: this.identityId }));
  }

  setIdentityId(identityId) {
    this.identityId = identityId || "";
    this.refreshLocalStorage();
  }

  getUint8ArrayMemory0() {
    if (this.cachedUint8ArrayMemory0 === null || this.cachedUint8ArrayMemory0.byteLength === 0) {
      this.cachedUint8ArrayMemory0 = new Uint8Array(this.wasm.memory.buffer);
    }
    return this.cachedUint8ArrayMemory0;
  }

  getDataViewMemory0() {
    if (this.cachedDataViewMemory0 === null || this.cachedDataViewMemory0.buffer !== this.wasm.memory.buffer) {
      this.cachedDataViewMemory0 = new DataView(this.wasm.memory.buffer);
    }
    return this.cachedDataViewMemory0;
  }

  getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return this.decoder.decode(this.getUint8ArrayMemory0().subarray(ptr, ptr + len));
  }

  passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
      const buf = this.encoder.encode(arg);
      const ptr = malloc(buf.length, 1) >>> 0;
      this.getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
      this.WASM_VECTOR_LEN = buf.length;
      return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;
    const mem = this.getUint8ArrayMemory0();
    let offset = 0;

    for (; offset < len; offset++) {
      const code = arg.charCodeAt(offset);
      if (code > 0x7f) break;
      mem[ptr + offset] = code;
    }

    if (offset !== len) {
      if (offset !== 0) arg = arg.slice(offset);
      ptr = realloc(ptr, len, (len = offset + arg.length * 3), 1) >>> 0;
      const view = this.getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
      const ret = this.encoder.encodeInto(arg, view);
      offset += ret.written || 0;
      ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    this.WASM_VECTOR_LEN = offset;
    return ptr;
  }

  addToExternrefTable0(obj) {
    const idx = this.wasm.__externref_table_alloc();
    this.wasm.__wbindgen_export_2.set(idx, obj);
    return idx;
  }

  handleError(fn, args) {
    try {
      return fn.apply(null, args);
    } catch (err) {
      const idx = this.addToExternrefTable0(err);
      this.wasm.__wbindgen_exn_store(idx);
      return undefined;
    }
  }

  async init() {
    const fakeWindow = {};
    const localStorage = { getItem: (key) => this.store.get(key) ?? null };

    class Window {}
    Object.setPrototypeOf(fakeWindow, Window.prototype);
    fakeWindow.location = { origin: this.origin };
    fakeWindow.localStorage = localStorage;

    globalThis.Window = Window;
    globalThis.window = fakeWindow;
    globalThis.self = fakeWindow;

    const imports = { wbg: {} };

    imports.wbg.__wbg_call_13410aac570ffff7 = (...args) => this.handleError((fn, thisArg) => fn.call(thisArg), args);
    imports.wbg.__wbg_getItem_9fc74b31b896f95a = (...args) =>
      this.handleError((retptr, obj, ptr, len) => {
        const key = this.getStringFromWasm0(ptr, len);
        const value = obj.getItem(key);
        const ptr0 = value == null ? 0 : this.passStringToWasm0(value, this.wasm.__wbindgen_malloc, this.wasm.__wbindgen_realloc);
        const len0 = this.WASM_VECTOR_LEN;
        this.getDataViewMemory0().setInt32(retptr + 4, len0, true);
        this.getDataViewMemory0().setInt32(retptr + 0, ptr0, true);
      }, args);
    imports.wbg.__wbg_instanceof_Window_12d20d558ef92592 = (arg) => arg instanceof Window;
    imports.wbg.__wbg_location_92d89c32ae076cab = (arg) => arg.location;
    imports.wbg.__wbg_localStorage_9330af8bf39365ba = (...args) =>
      this.handleError((arg) => {
        const value = arg.localStorage;
        return value == null ? 0 : this.addToExternrefTable0(value);
      }, args);
    imports.wbg.__wbg_newnoargs_254190557c45b4ec = (ptr, len) => new Function(this.getStringFromWasm0(ptr, len));
    imports.wbg.__wbg_origin_00892013881c6e2b = (...args) =>
      this.handleError((retptr, obj) => {
        const value = obj.origin;
        const ptr0 = this.passStringToWasm0(value, this.wasm.__wbindgen_malloc, this.wasm.__wbindgen_realloc);
        const len0 = this.WASM_VECTOR_LEN;
        this.getDataViewMemory0().setInt32(retptr + 4, len0, true);
        this.getDataViewMemory0().setInt32(retptr + 0, ptr0, true);
      }, args);
    imports.wbg.__wbg_static_accessor_GLOBAL_8921f820c2ce3f12 = () => this.addToExternrefTable0(globalThis);
    imports.wbg.__wbg_static_accessor_GLOBAL_THIS_f0a4409105898184 = () => this.addToExternrefTable0(globalThis);
    imports.wbg.__wbg_static_accessor_SELF_995b214ae681ff99 = () => this.addToExternrefTable0(fakeWindow);
    imports.wbg.__wbg_static_accessor_WINDOW_cde3890479c675ea = () => this.addToExternrefTable0(fakeWindow);
    imports.wbg.__wbg_stringify_b98c93d0a190446a = (...args) => this.handleError((arg) => JSON.stringify(arg), args);
    imports.wbg.__wbg_wbindgenisnull_f3037694abe4d97a = (arg) => arg === null;
    imports.wbg.__wbg_wbindgenisobject_307a53c6bd97fbf8 = (arg) => typeof arg === "object" && arg !== null;
    imports.wbg.__wbg_wbindgenisstring_d4fa939789f003b0 = (arg) => typeof arg === "string";
    imports.wbg.__wbg_wbindgenisundefined_c4b71d073b92f3c5 = (arg) => arg === undefined;
    imports.wbg.__wbg_wbindgenstringget_0f16a6ddddef376f = (retptr, arg) => {
      const value = typeof arg === "string" ? arg : undefined;
      let ptr0 = 0, len0 = 0;
      if (value !== undefined) {
        ptr0 = this.passStringToWasm0(value, this.wasm.__wbindgen_malloc, this.wasm.__wbindgen_realloc);
        len0 = this.WASM_VECTOR_LEN;
      }
      this.getDataViewMemory0().setInt32(retptr + 4, len0, true);
      this.getDataViewMemory0().setInt32(retptr + 0, ptr0, true);
    };
    imports.wbg.__wbg_wbindgenthrow_451ec1a8469d7eb6 = (ptr, len) => {
      throw new Error(this.getStringFromWasm0(ptr, len));
    };
    imports.wbg.__wbindgen_cast_2241b6af4c4b2941 = (ptr, len) => this.getStringFromWasm0(ptr, len);
    imports.wbg.__wbindgen_init_externref_table = () => {
      const table = this.wasm.__wbindgen_export_2;
      const offset = table.grow(4);
      table.set(0, undefined);
      table.set(offset + 0, undefined);
      table.set(offset + 1, null);
      table.set(offset + 2, true);
      table.set(offset + 3, false);
    };

    const { instance } = await WebAssembly.instantiate(this.wasmBytes, imports);
    this.wasm = instance.exports;
    this.cachedUint8ArrayMemory0 = null;
    this.cachedDataViewMemory0 = null;
    this.wasm.__wbindgen_start?.();
  }

  getSigns(body, forcedTimestamp = "") {
    if (!this.wasm) throw new Error("WASM belum di-init.");
    const timestamp = forcedTimestamp || epochNanoseconds();
    const ptr = this.passStringToWasm0(timestamp, this.wasm.__wbindgen_malloc, this.wasm.__wbindgen_realloc);
    const len = this.WASM_VECTOR_LEN;
    const ret = this.wasm.get_signs(body, ptr, len);
    const text = this.getStringFromWasm0(ret[0], ret[1]);
    this.wasm.__wbindgen_free(ret[0], ret[1], 1);
    return JSON.parse(text);
  }
}

function baseHeaders({ signer, sign, timestamp, accept = "application/json" }) {
  const headers = {
    language: "id-ID",
    timestamp,
    lang: "id",
    "device-type": "web",
    "device-uuid": signer.visitorId,
    accept,
    "content-type": "application/json;charset=UTF-8",
    sign,
    site: "www.easemate.ai",
    "client-type": "web",
    "device-platform": "Android,Chrome",
    "user-agent": USER_AGENT,
    "client-name": "chatpdf",
    origin: ORIGIN,
    referer: `${ORIGIN}/`,
  };
  if (signer.visitorId) headers["device-identifier"] = signer.visitorId;
  if (signer.identityId) headers["identity-id"] = signer.identityId;
  if (accept.includes("text/event-stream")) headers["cache-control"] = "no-cache";
  else headers["product-code"] = "888";
  return headers;
}

async function apiPostJson(path, body, signer, timeoutMs, controller) {
  const { sign, timestamp } = signer.getSigns(body);
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: baseHeaders({ signer, sign, timestamp, accept: "application/json" }),
    body: JSON.stringify(body),
    signal: controller.signal,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { ok: res.ok, status: res.status, text, json };
}

function parseSSE(raw) {
  let answer = "", inference = "";
  for (const line of raw.split(/\r?\n/)) {
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      const outer = JSON.parse(payload);
      const inner = typeof outer.data === "string" ? JSON.parse(outer.data) : outer.data;
      if (typeof inner?.answer === "string") answer += inner.answer;
      if (typeof inner?.inference === "string") inference += inner.inference;
      if (typeof inner?.message === "string" && !inner.answer) answer += inner.message;
    } catch {}
  }
  return answer || inference;
}

export async function ask(prompt, system) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 28000);

  try {
    const fullPrompt = system ? `${system}\n\n${prompt}` : prompt;

    if (!_wasmBytesCache) {
      const res = await fetch(WASM_SOURCE, {
        headers: { "user-agent": USER_AGENT, accept: "application/wasm,*/*" },
        signal: controller.signal,
      });
      if (!res.ok) return { ok: false, error: `Gagal download WASM signer: HTTP ${res.status}` };
      _wasmBytesCache = new Uint8Array(await res.arrayBuffer());
    }

    const visitorId = crypto.randomBytes(16).toString("hex");
    const signer = new EaseMateWasmSigner({ wasmBytes: _wasmBytesCache, visitorId, identityId: "" });
    await signer.init();

    const idRes = await apiPostJson("/api2/task/identity_id", {}, signer, 28000, controller);
    const identityId = idRes.json?.data?.identity_id;
    if (!idRes.ok || idRes.json?.code !== 200 || !identityId) {
      return { ok: false, error: `Gagal ambil identity-id: ${idRes.text.slice(0, 200)}` };
    }
    signer.setIdentityId(identityId);

    const sessionRes = await apiPostJson("/api2/task/create_pure_session", { model_id: MODEL_ID }, signer, 28000, controller);
    const sessionId = sessionRes.json?.data?.session_id;
    if (!sessionRes.ok || sessionRes.json?.code !== 200 || !sessionId) {
      return { ok: false, error: `Gagal create session: ${sessionRes.text.slice(0, 200)}` };
    }

    const body = {
      model_id: MODEL_ID,
      session_id: sessionId,
      operation_info: { operation: fullPrompt, id: 10000 },
      parameters: JSON.stringify({ webSearch: false, isThinking: false }),
    };
    const { sign, timestamp } = signer.getSigns(body);

    const res = await fetch(`${API}/api2/stream/exec_operation`, {
      method: "POST",
      headers: baseHeaders({ signer, sign, timestamp, accept: "text/event-stream, text/event-stream" }),
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const raw = await res.text();
    const answer = parseSSE(raw);

    if (!res.ok || !answer) return { ok: false, error: `Respons kosong/gagal: ${raw.slice(0, 200)}` };
    return { ok: true, text: answer };
  } catch (err) {
    return { ok: false, error: err.name === "AbortError" ? "Timeout" : err.message };
  } finally {
    clearTimeout(timer);
  }
}
