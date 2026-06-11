import { NextResponse } from "next/server";

import { validateImageFile } from "@/lib/image-utils";
import { generatePresignedUploadUrl } from "@/lib/r2";
import type { PresignRequest } from "@/types/image";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PresignRequest;

    const validation = validateImageFile(
      body.filename,
      body.contentType,
      body.size
    );

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const presign = await generatePresignedUploadUrl(
      body.filename,
      body.contentType,
      body.width,
      body.height,
      body.folder ?? ""
    );

    return NextResponse.json(presign);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "生成预签名 URL 失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
