import { NextResponse } from "next/server";

import { sanitizeFolderName } from "@/lib/image-utils";
import { createFolder, listAllFolders } from "@/lib/r2";

export async function GET() {
  try {
    const folders = await listAllFolders();
    return NextResponse.json({ folders });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "获取文件夹列表失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      parent?: string;
    };

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "文件夹名称不能为空" }, { status: 400 });
    }

    const folderName = sanitizeFolderName(body.name);
    const parent = body.parent?.trim() ?? "";
    const path = parent ? `${parent.replace(/\/?$/, "/")}${folderName}/` : `${folderName}/`;

    const folder = await createFolder(path);
    return NextResponse.json(folder);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "创建文件夹失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
