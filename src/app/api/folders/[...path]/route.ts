import { NextResponse } from "next/server";

import { deleteFolder } from "@/lib/r2";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

function resolvePath(segments: string[]): string {
  const decoded = segments.map((segment) => decodeURIComponent(segment)).join("/");
  return decoded.endsWith("/") ? decoded : `${decoded}/`;
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { path: pathSegments } = await context.params;
    const path = resolvePath(pathSegments);
    const deletedCount = await deleteFolder(path);

    return NextResponse.json({
      success: true,
      deletedCount,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "删除文件夹失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
