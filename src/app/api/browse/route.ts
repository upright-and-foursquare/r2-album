import { NextResponse } from "next/server";

import { browseFolder } from "@/lib/r2";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path") ?? "";
    const limit = Number.parseInt(searchParams.get("limit") ?? "50", 10);
    const cursor = searchParams.get("cursor") ?? undefined;

    const result = await browseFolder({
      path,
      limit: Number.isNaN(limit) ? 50 : limit,
      cursor,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "浏览目录失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
