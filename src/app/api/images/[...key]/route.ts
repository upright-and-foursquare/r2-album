import { NextResponse } from "next/server";

import { deleteImage, getImageMetadata } from "@/lib/r2";

type RouteContext = {
  params: Promise<{ key: string[] }>;
};

function resolveKey(segments: string[]): string {
  return segments.map((segment) => decodeURIComponent(segment)).join("/");
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { key: keySegments } = await context.params;
    const key = resolveKey(keySegments);

    const image = await getImageMetadata(key);
    if (!image) {
      return NextResponse.json({ error: "图片不存在" }, { status: 404 });
    }

    return NextResponse.json(image);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "获取图片元数据失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { key: keySegments } = await context.params;
    const key = resolveKey(keySegments);

    const image = await getImageMetadata(key);
    if (!image) {
      return NextResponse.json({ error: "图片不存在" }, { status: 404 });
    }

    await deleteImage(key);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "删除图片失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
