"use client";

import { useEffect, useMemo, useState } from "react";
import { extractCommands, extractCaseNames } from "../lib/validate.js";

const PLUGIN_FLAGS = [
  { id: "owner", label: "owner" },
  { id: "admin", label: "admin" },
  { id: "botadmin", label: "botadmin" },
  { id: "group", label: "group" },
  { id: "private", label: "private" },
  { id: "premium", label: "premium" },
  { id: "noJadiBot", label: "noJadiBot" },
];

const PLUGIN_PLACEHOLDER =
  "Contoh: buatkan plugin untuk convert gambar yang di-reply jadi sticker, dengan author watermark 'Kyzen Bot'. Kalau bukan reply gambar/video, balas suruh reply media dulu.";

const CASE_PLACEHOLDER =
  "Contoh: buatkan case 'jam' yang balas waktu sekarang sesuai timezone Asia/Jakarta, format jam:menit:detik.";

function StatusDot({ status }) {
  return <span className={`dot ${status}`} />;
}

export default function Page() {
  const [type, setType] = useState("plugin");
  const [description, setDescription] = useState("");
  const [flags, setFlags] = useState([]);
  const [category, setCategory] = useState("other");
  const [filename, setFilename] = useState("");
  const [mode, setMode] = useState("squad");
  const [providers, setProviders] = useState([]);
  const [providerId, setProviderId] = useState("");
  const [exclude, setExclude] = useState([]);

  const [statuses, setStatuses] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [winner, setWinner] = useState(null);
  const [code, setCode] = useState("");
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const [ghToken, setGhToken] = useState("");
  const [ghRepoFull, setGhRepoFull] = useState("");
  const [ghBranch, setGhBranch] = useState("");
  const [ghPath, setGhPath] = useState("");
  const [ghMessage, setGhMessage] = useState("");
  const [rememberToken, setRememberToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState(null);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    fetch("/api/providers")
      .then((r) => r.json())
      .then((d) => {
        setProviders(d.providers || []);
        if (d.providers?.length) setProviderId(d.providers[0].id);
      })
      .catch(() => {});

    try {
      const saved = JSON.parse(localStorage.getItem("kyzen_gh") || "null");
      if (saved) {
        setGhToken(saved.token || "");
        setGhRepoFull(saved.repo || "");
        setGhBranch(saved.branch || "");
        setRememberToken(Boolean(saved.token));
      }
    } catch {}
  }, []);

  useEffect(() => {
    setGhPath(type === "case" ? "case.js" : `plugins/${category || "other"}/${filename || "plugin"}.js`);
  }, [type, category, filename]);

  const toggleFlag = (id) => {
    setFlags((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  };

  const resetResult = () => {
    setWinner(null);
    setCode("");
    setSaveResult(null);
    setSaveError("");
  };

  async function runGenerate(excludeList) {
    setLoading(true);
    setError("");
    setSaveResult(null);
    setSaveError("");

    const candidateIds = mode === "manual" ? [providerId] : providers.map((p) => p.id).filter((id) => !excludeList.includes(id));

    const initialStatuses = {};
    providers.forEach((p) => {
      initialStatuses[p.id] = candidateIds.includes(p.id) ? "racing" : "skipped";
    });
    setStatuses(initialStatuses);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, description, flags, mode, providerId, exclude: excludeList }),
      });
      const data = await res.json();

      if (!data.ok) {
        setError(data.error || "Semua provider gagal merespons. Coba lagi.");
        const failStatuses = { ...initialStatuses };
        (data.attempts || []).forEach((a) => {
          failStatuses[a.providerId] = "failed";
        });
        setStatuses(failStatuses);
        setWinner(null);
        return;
      }

      const newStatuses = { ...initialStatuses };
      (data.attempts || []).forEach((a) => {
        newStatuses[a.providerId] = a.ok ? (a.validation?.valid ? "done" : "warn") : "failed";
      });
      setStatuses(newStatuses);
      setWinner(data.winner);
      setCode(data.winner.code);

      if (type === "plugin") {
        const cmds = extractCommands(data.winner.code);
        setFilename(cmds[0] || "plugin");
      }
    } catch (err) {
      setError(err.message || "Gagal menghubungi server generator");
    } finally {
      setLoading(false);
    }
  }

  const handleGenerate = () => {
    resetResult();
    setExclude([]);
    runGenerate([]);
  };

  const handleRegenerate = () => {
    const nextExclude = winner ? [...exclude, winner.providerId] : exclude;
    setExclude(nextExclude);
    runGenerate(nextExclude);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    const fname = type === "case" ? "case-snippet.js" : `${filename || "plugin"}.js`;
    const blob = new Blob([code], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fname;
    a.click();
    URL.revokeObjectURL(url);
  };

  const persistGithubPrefs = (token, repo, branch) => {
    if (rememberToken) {
      localStorage.setItem("kyzen_gh", JSON.stringify({ token, repo, branch }));
    } else {
      localStorage.setItem("kyzen_gh", JSON.stringify({ token: "", repo, branch }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    setSaveResult(null);

    const [owner, repo] = (ghRepoFull || "").split("/").map((s) => s.trim());

    if (!ghToken || !owner || !repo) {
      setSaveError("Token dan repo (format owner/repo) wajib diisi.");
      setSaving(false);
      return;
    }

    persistGithubPrefs(ghToken, ghRepoFull, ghBranch);

    try {
      const res = await fetch("/api/github-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: ghToken,
          owner,
          repo,
          branch: ghBranch || undefined,
          type,
          path: ghPath,
          content: code,
          message: ghMessage || undefined,
        }),
      });
      const data = await res.json();

      if (!data.ok) {
        setSaveError(data.error || "Gagal menyimpan ke GitHub");
        return;
      }
      setSaveResult(data);
    } catch (err) {
      setSaveError(err.message || "Gagal menghubungi server");
    } finally {
      setSaving(false);
    }
  };

  const caseNamesPreview = useMemo(() => (code && type === "case" ? extractCaseNames(code) : []), [code, type]);

  return (
    <main className="wrap">
      <div className="eyebrow">kyzen.id · squad console</div>
      <h1>Plugin &amp; Case Generator</h1>
      <p className="subtitle">
        Jelasin fitur yang lo mau dalam bahasa biasa, 7 AI provider race buat generate kode-nya, langsung cocok sama format plugin × case base lo. Tinggal save ke GitHub.
      </p>

      <div className="card">
        <div className="segmented">
          <button className={type === "plugin" ? "active" : ""} onClick={() => { setType("plugin"); resetResult(); }}>
            Plugin
          </button>
          <button className={type === "case" ? "active" : ""} onClick={() => { setType("case"); resetResult(); }}>
            Case
          </button>
        </div>

        {type === "plugin" && (
          <div className="field">
            <label>Folder kategori</label>
            <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="other" />
            <div className="hint">File bakal kesimpen di plugins/{category || "other"}/&lt;nama&gt;.js</div>
          </div>
        )}

        <div className="field">
          <label>Deskripsi fitur</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={type === "plugin" ? PLUGIN_PLACEHOLDER : CASE_PLACEHOLDER}
          />
        </div>

        {type === "plugin" && (
          <div className="field">
            <label>Flag (opsional)</label>
            <div className="chips">
              {PLUGIN_FLAGS.map((f) => (
                <button key={f.id} className={`chip ${flags.includes(f.id) ? "active" : ""}`} onClick={() => toggleFlag(f.id)}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="field">
          <label>Provider</label>
          <div className="segmented">
            <button className={mode === "squad" ? "active" : ""} onClick={() => setMode("squad")}>
              Squad (auto)
            </button>
            <button className={mode === "manual" ? "active" : ""} onClick={() => setMode("manual")}>
              Manual
            </button>
          </div>
          {mode === "manual" && (
            <select value={providerId} onChange={(e) => setProviderId(e.target.value)} style={{ marginTop: 10 }}>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          )}
        </div>

        <button className="btn btn-primary" disabled={loading || !description.trim()} onClick={handleGenerate}>
          {loading ? "Generating..." : "Generate"}
        </button>
      </div>

      {(loading || winner || error) && (
        <div className="card">
          <p className="card-title">Squad status</p>
          {providers.map((p) => {
            const st = statuses[p.id] || "idle";
            const attempt = winner?.providerId === p.id ? winner : null;
            return (
              <div className="console-row" key={p.id}>
                <span className="console-name">
                  <StatusDot status={st} />
                  {p.label}
                </span>
                <span className={`console-meta ${attempt ? "winner" : ""}`}>
                  {attempt ? `MENANG · ${attempt.elapsedMs}ms` : st === "racing" ? "racing..." : st === "failed" ? "gagal" : st === "warn" ? "format perlu cek" : st === "skipped" ? "skip" : "idle"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {error && <div className="alert error">{error}</div>}

      {winner && code && (
        <div className="card">
          <div className="row-between">
            <p className="card-title" style={{ margin: 0 }}>
              Hasil ({winner.providerLabel})
            </p>
            <span className={`badge ${winner.validation?.valid ? "valid" : "invalid"}`}>
              {winner.validation?.valid ? "✓ format valid" : "⚠ cek manual"}
            </span>
          </div>

          {!winner.validation?.valid && <div className="alert error">{winner.validation?.reason}</div>}

          {type === "case" && caseNamesPreview.length > 0 && (
            <p className="hint" style={{ marginBottom: 10 }}>
              Case name: {caseNamesPreview.join(", ")}
            </p>
          )}

          <div className="code-block">
            {editing ? (
              <textarea className="editable" value={code} onChange={(e) => setCode(e.target.value)} />
            ) : (
              <pre>{code}</pre>
            )}
          </div>

          <div className="btn-row">
            <button className="btn btn-sm" onClick={handleCopy}>
              {copied ? "Copied!" : "Copy"}
            </button>
            <button className="btn btn-sm" onClick={handleDownload}>
              Download .js
            </button>
            <button className="btn btn-sm" onClick={() => setEditing((e) => !e)}>
              {editing ? "Selesai edit" : "Edit manual"}
            </button>
            <button className="btn btn-sm" onClick={handleRegenerate} disabled={loading}>
              Regenerate (skip {winner.providerLabel})
            </button>
          </div>

          {type === "plugin" && (
            <div className="field" style={{ marginTop: 14 }}>
              <label>Nama file</label>
              <input type="text" value={filename} onChange={(e) => setFilename(e.target.value)} placeholder="nama-plugin" />
            </div>
          )}

          <div className="divider" />

          <p className="card-title">Save ke GitHub</p>

          <div className="field">
            <label>Personal Access Token</label>
            <input type="password" value={ghToken} onChange={(e) => setGhToken(e.target.value)} placeholder="ghp_xxxxxxxxxxxx" />
            <div className="checkbox-row">
              <input type="checkbox" checked={rememberToken} onChange={(e) => setRememberToken(e.target.checked)} />
              <span>Simpan di browser ini (localStorage, gak dikirim ke mana-mana selain GitHub)</span>
            </div>
          </div>

          <div className="field">
            <label>Repo (owner/repo)</label>
            <input type="text" value={ghRepoFull} onChange={(e) => setGhRepoFull(e.target.value)} placeholder="fiz/shotabase" />
          </div>

          <div className="field-row">
            <div className="field">
              <label>Branch (opsional)</label>
              <input type="text" value={ghBranch} onChange={(e) => setGhBranch(e.target.value)} placeholder="default branch" />
            </div>
            <div className="field">
              <label>Path file</label>
              <input type="text" value={ghPath} onChange={(e) => setGhPath(e.target.value)} />
            </div>
          </div>

          <div className="field">
            <label>Commit message (opsional)</label>
            <input type="text" value={ghMessage} onChange={(e) => setGhMessage(e.target.value)} placeholder="auto-generated" />
          </div>

          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Menyimpan..." : "Save ke GitHub"}
          </button>

          {saveError && <div className="alert error" style={{ marginTop: 12 }}>{saveError}</div>}
          {saveResult && (
            <div className="alert success" style={{ marginTop: 12 }}>
              Berhasil disimpan.{" "}
              {saveResult.htmlUrl && (
                <a href={saveResult.htmlUrl} target="_blank" rel="noreferrer">
                  Lihat file di GitHub →
                </a>
              )}
            </div>
          )}
        </div>
      )}

      <p className="footer-note">
        Kyzen.id Plugin Generator · provider AI yang dipakai cuma scraping endpoint gratisan pihak ketiga — bisa berubah/down sewaktu-waktu tanpa pemberitahuan, makanya squad mode penting buat fallback.
      </p>
    </main>
  );
}
