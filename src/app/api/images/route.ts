import { NextResponse } from "next/server";

import { listImages } from "@/lib/r2";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number.parseInt(searchParams.get("limit") ?? "20", 10);
    const cursor = searchParams.get("cursor") ?? undefined;
    const prefix = searchParams.get("prefix") ?? undefined;

    const result = await listImages({
      limit: Number.isNaN(limit) ? 20 : limit,
      cursor,
      prefix,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "获取图片列表失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
