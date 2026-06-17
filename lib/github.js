const API_BASE = "https://api.github.com";

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "kyzen-id-plugin-gen",
  };
}

// Ambil isi file dari repo. Return { exists:false } kalau 404, throw kalau error lain (auth, dll)
export async function getFile({ token, owner, repo, path, branch }) {
  const url = `${API_BASE}/repos/${owner}/${repo}/contents/${encodeURI(path)}${branch ? `?ref=${branch}` : ""}`;
  const res = await fetch(url, { headers: authHeaders(token) });

  if (res.status === 404) return { exists: false };

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(json?.message || `GitHub GET gagal (${res.status})`);
  }

  if (Array.isArray(json)) {
    throw new Error(`Path '${path}' adalah folder, bukan file`);
  }

  const content = Buffer.from(json.content, "base64").toString("utf-8");
  return { exists: true, sha: json.sha, content };
}

// Create atau update file (kalau sha dikasih = update, kalau gak = create baru)
export async function putFile({ token, owner, repo, path, branch, content, message, sha }) {
  const url = `${API_BASE}/repos/${owner}/${repo}/contents/${encodeURI(path)}`;

  const body = {
    message,
    content: Buffer.from(content, "utf-8").toString("base64"),
    branch,
  };
  if (sha) body.sha = sha;

  const res = await fetch(url, {
    method: "PUT",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(json?.message || `GitHub PUT gagal (${res.status})`);
  }

  return { htmlUrl: json.content?.html_url, commitUrl: json.commit?.html_url, sha: json.content?.sha };
}

export async function checkRepoAccess({ token, owner, repo }) {
  const res = await fetch(`${API_BASE}/repos/${owner}/${repo}`, { headers: authHeaders(token) });
  if (res.status === 404) throw new Error("Repo tidak ditemukan atau token gak punya akses");
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new Error(json?.message || `Gagal akses repo (${res.status})`);
  }
  const json = await res.json();
  return { defaultBranch: json.default_branch };
}
