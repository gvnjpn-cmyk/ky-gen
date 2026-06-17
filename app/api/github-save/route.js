import { NextResponse } from "next/server";
import { getFile, putFile, checkRepoAccess } from "../../../lib/github.js";
import { extractCaseNames } from "../../../lib/validate.js";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

const END_MARKER = "// END CODE";

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body request bukan JSON valid" }, { status: 400 });
  }

  const { token, owner, repo, branch, type, path, content, message } = body || {};

  if (!token || !owner || !repo || !path) {
    return NextResponse.json({ ok: false, error: "token, owner, repo, dan path wajib diisi" }, { status: 400 });
  }
  if (!content || !content.trim()) {
    return NextResponse.json({ ok: false, error: "content kosong" }, { status: 400 });
  }

  try {
    let resolvedBranch = branch;
    if (!resolvedBranch) {
      const repoInfo = await checkRepoAccess({ token, owner, repo });
      resolvedBranch = repoInfo.defaultBranch;
    }

    if (type === "case") {
      const file = await getFile({ token, owner, repo, path, branch: resolvedBranch });

      if (!file.exists) {
        return NextResponse.json(
          { ok: false, error: `File '${path}' tidak ditemukan di repo. Pastikan path-nya benar (default: case.js).` },
          { status: 404 }
        );
      }

      if (!file.content.includes(END_MARKER)) {
        return NextResponse.json(
          { ok: false, error: `Marker '${END_MARKER}' tidak ditemukan di '${path}'. Pastikan formatnya sama seperti base project.` },
          { status: 422 }
        );
      }

      const newNames = extractCaseNames(content);
      const existingNames = extractCaseNames(file.content);
      const duplicates = newNames.filter((n) => existingNames.includes(n));

      if (duplicates.length) {
        return NextResponse.json(
          { ok: false, error: `Case '${duplicates.join(", ")}' sudah ada di '${path}'. Hapus dulu atau ganti nama.` },
          { status: 409 }
        );
      }

      const updatedContent = file.content.replace(END_MARKER, `\n${content}\n\n${END_MARKER}`);

      const result = await putFile({
        token,
        owner,
        repo,
        branch: resolvedBranch,
        path,
        content: updatedContent,
        sha: file.sha,
        message: message || `feat: tambah case ${newNames.join(", ")} via plugin generator`,
      });

      return NextResponse.json({ ok: true, ...result });
    }

    // type === 'plugin' -> create atau overwrite file plugin langsung
    const existing = await getFile({ token, owner, repo, path, branch: resolvedBranch }).catch(() => ({ exists: false }));

    const result = await putFile({
      token,
      owner,
      repo,
      branch: resolvedBranch,
      path,
      content,
      sha: existing.exists ? existing.sha : undefined,
      message: message || `feat: tambah plugin ${path} via plugin generator`,
    });

    return NextResponse.json({ ok: true, overwritten: existing.exists, ...result });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message || "Gagal menyimpan ke GitHub" }, { status: 500 });
  }
}
