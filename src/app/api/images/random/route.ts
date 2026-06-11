import { NextResponse } from "next/server";

import { getRandomImages } from "@/lib/r2";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const count = Number.parseInt(searchParams.get("count") ?? "12", 10);
    const prefix = searchParams.get("prefix") ?? undefined;

    const images = await getRandomImages(
      Number.isNaN(count) ? 12 : count,
      prefix
    );

    return NextResponse.json({ images });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "获取随机图片失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
