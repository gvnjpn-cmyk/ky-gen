import { NextResponse } from "next/server";
import { PROVIDER_LIST } from "../../../lib/providers/index.js";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json({ providers: PROVIDER_LIST });
}
