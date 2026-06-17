import { NextResponse } from "next/server";
import { generate } from "../../../lib/squad.js";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body request bukan JSON valid" }, { status: 400 });
  }

  const { type, description, flags, mode, providerId, exclude } = body || {};

  if (type !== "plugin" && type !== "case") {
    return NextResponse.json({ ok: false, error: "type harus 'plugin' atau 'case'" }, { status: 400 });
  }

  try {
    const result = await generate({ type, description, flags, mode, providerId, exclude });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message || "Terjadi kesalahan internal" }, { status: 500 });
  }
}
