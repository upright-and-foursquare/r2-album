import { NextResponse } from "next/server";

import { moveImage } from "@/lib/r2";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      keys?: string[];
      targetFolder?: string;
    };

    if (!body.keys?.length) {
      return NextResponse.json({ error: "请选择要移动的图片" }, { status: 400 });
    }

    const targetFolder = body.targetFolder ?? "";
    const moved = [];

    for (const key of body.keys) {
      const image = await moveImage(key, targetFolder);
      moved.push(image);
    }

    return NextResponse.json({ images: moved });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "移动图片失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
