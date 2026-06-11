import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  type _Object,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type {
  BrowseResponse,
  FolderItem,
  ImageListResponse,
  ImageRecord,
  PresignResponse,
} from "@/types/image";
import {
  buildPublicUrl,
  generateObjectKey,
  getListPrefix,
  getParentFolderPath,
  isImageKey,
  normalizeFolderPath,
} from "@/lib/image-utils";

let s3Client: S3Client | null = null;

function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error("R2 configuration is incomplete");
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
  };
}

export function getS3Client(): S3Client {
  if (!s3Client) {
    const { accountId, accessKeyId, secretAccessKey } = getR2Config();
    s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  return s3Client;
}

function objectToImageRecord(object: _Object): ImageRecord | null {
  if (!object.Key || !object.LastModified || !isImageKey(object.Key)) {
    return null;
  }

  let publicUrl: string;
  try {
    publicUrl = buildPublicUrl(object.Key);
  } catch {
    return null;
  }

  const filenamePart = object.Key.split("/").pop() ?? object.Key;
  const originalFilename = filenamePart.replace(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i,
    ""
  );

  return {
    key: object.Key,
    url: publicUrl,
    originalFilename,
    contentType: "image/jpeg",
    size: object.Size ?? 0,
    width: null,
    height: null,
    lastModified: object.LastModified.toISOString(),
  };
}

async function enrichImageRecord(record: ImageRecord): Promise<ImageRecord> {
  const client = getS3Client();
  const { bucketName } = getR2Config();

  try {
    const head = await client.send(
      new HeadObjectCommand({
        Bucket: bucketName,
        Key: record.key,
      })
    );

    const width = head.Metadata?.["width"]
      ? Number.parseInt(head.Metadata["width"], 10)
      : null;
    const height = head.Metadata?.["height"]
      ? Number.parseInt(head.Metadata["height"], 10)
      : null;

    return {
      ...record,
      originalFilename:
        head.Metadata?.["original-filename"] ?? record.originalFilename,
      contentType: head.ContentType ?? record.contentType,
      size: head.ContentLength ?? record.size,
      width: Number.isFinite(width) ? width : null,
      height: Number.isFinite(height) ? height : null,
      lastModified: (head.LastModified ?? new Date(record.lastModified)).toISOString(),
    };
  } catch {
    return record;
  }
}

function invalidateCaches() {
  randomImagesCache = null;
}

export async function generatePresignedUploadUrl(
  filename: string,
  contentType: string,
  width?: number,
  height?: number,
  folder = ""
): Promise<PresignResponse> {
  const client = getS3Client();
  const { bucketName } = getR2Config();
  const key = generateObjectKey(filename, folder);

  const metadata: Record<string, string> = {
    "original-filename": filename,
  };
  if (width) metadata.width = String(width);
  if (height) metadata.height = String(height);

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
    Metadata: metadata,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });

  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "x-amz-meta-original-filename": filename,
  };
  if (width) headers["x-amz-meta-width"] = String(width);
  if (height) headers["x-amz-meta-height"] = String(height);

  return {
    key,
    uploadUrl,
    publicUrl: buildPublicUrl(key),
    headers,
  };
}

export async function listImages(options: {
  limit?: number;
  cursor?: string;
  prefix?: string;
}): Promise<ImageListResponse> {
  const client = getS3Client();
  const { bucketName } = getR2Config();
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);

  const listPrefix = options.prefix ?? getListPrefix();
  const response = await client.send(
    new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: listPrefix || undefined,
      MaxKeys: limit,
      ContinuationToken: options.cursor || undefined,
    })
  );

  const images = (response.Contents ?? [])
    .map(objectToImageRecord)
    .filter((item): item is ImageRecord => item !== null);

  const enriched = await Promise.all(images.map(enrichImageRecord));

  return {
    images: enriched,
    nextCursor: response.NextContinuationToken ?? null,
    hasMore: Boolean(response.IsTruncated),
  };
}

export async function getImageMetadata(key: string): Promise<ImageRecord | null> {
  const client = getS3Client();
  const { bucketName } = getR2Config();

  try {
    const head = await client.send(
      new HeadObjectCommand({
        Bucket: bucketName,
        Key: key,
      })
    );

    let publicUrl: string;
    try {
      publicUrl = buildPublicUrl(key);
    } catch {
      return null;
    }

    const width = head.Metadata?.["width"]
      ? Number.parseInt(head.Metadata["width"], 10)
      : null;
    const height = head.Metadata?.["height"]
      ? Number.parseInt(head.Metadata["height"], 10)
      : null;

    return {
      key,
      url: publicUrl,
      originalFilename:
        head.Metadata?.["original-filename"] ??
        key.split("/").pop() ??
        key,
      contentType: head.ContentType ?? "application/octet-stream",
      size: head.ContentLength ?? 0,
      width: Number.isFinite(width) ? width : null,
      height: Number.isFinite(height) ? height : null,
      lastModified: (head.LastModified ?? new Date()).toISOString(),
    };
  } catch {
    return null;
  }
}

export async function deleteImage(key: string): Promise<void> {
  const client = getS3Client();
  const { bucketName } = getR2Config();

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    })
  );

  invalidateCaches();
}

async function listAllKeysUnderPrefix(prefix: string): Promise<string[]> {
  const client = getS3Client();
  const { bucketName } = getR2Config();
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );

    for (const object of response.Contents ?? []) {
      if (object.Key) keys.push(object.Key);
    }

    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return keys;
}

export async function browseFolder(options: {
  path?: string;
  limit?: number;
  cursor?: string;
}): Promise<BrowseResponse> {
  const client = getS3Client();
  const { bucketName } = getR2Config();
  const path = options.path ? normalizeFolderPath(options.path) : "";
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);

  const response = await client.send(
    new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: path || undefined,
      Delimiter: "/",
      MaxKeys: limit,
      ContinuationToken: options.cursor || undefined,
    })
  );

  const folders: FolderItem[] = (response.CommonPrefixes ?? [])
    .map((item) => item.Prefix)
    .filter((prefix): prefix is string => Boolean(prefix))
    .map((prefix) => ({
      name: prefix.slice(path.length).replace(/\/$/, ""),
      path: prefix,
    }));

  const images = (response.Contents ?? [])
    .map(objectToImageRecord)
    .filter((item): item is ImageRecord => item !== null);

  const enriched = await Promise.all(images.map(enrichImageRecord));

  return {
    path,
    parent: path === "" ? null : getParentFolderPath(path),
    folders,
    images: enriched,
    nextCursor: response.NextContinuationToken ?? null,
    hasMore: Boolean(response.IsTruncated),
  };
}

export async function listAllFolders(): Promise<FolderItem[]> {
  const client = getS3Client();
  const { bucketName } = getR2Config();
  const folders: FolderItem[] = [];
  const queue = [""];
  const seen = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift() ?? "";
    if (seen.has(current)) continue;
    seen.add(current);

    let continuationToken: string | undefined;
    do {
      const response = await client.send(
        new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: current || undefined,
          Delimiter: "/",
          ContinuationToken: continuationToken,
        })
      );

      for (const item of response.CommonPrefixes ?? []) {
        if (!item.Prefix || seen.has(item.Prefix)) continue;
        folders.push({
          name: getFolderDisplayName(item.Prefix),
          path: item.Prefix,
        });
        queue.push(item.Prefix);
      }

      continuationToken = response.IsTruncated
        ? response.NextContinuationToken
        : undefined;
    } while (continuationToken);
  }

  return folders.sort((a, b) => a.path.localeCompare(b.path, "zh-CN"));
}

function getFolderDisplayName(path: string): string {
  const trimmed = path.replace(/\/$/, "");
  const segments = trimmed.split("/");
  return segments[segments.length - 1] ?? trimmed;
}

export async function createFolder(path: string): Promise<FolderItem> {
  const client = getS3Client();
  const { bucketName } = getR2Config();
  const normalized = normalizeFolderPath(path);

  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: normalized,
      Body: new Uint8Array(0),
    })
  );

  invalidateCaches();

  return {
    name: getFolderDisplayName(normalized),
    path: normalized,
  };
}

export async function deleteFolder(path: string): Promise<number> {
  const client = getS3Client();
  const { bucketName } = getR2Config();
  const normalized = normalizeFolderPath(path);
  const keys = await listAllKeysUnderPrefix(normalized);

  if (keys.length === 0) {
    return 0;
  }

  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    await client.send(
      new DeleteObjectsCommand({
        Bucket: bucketName,
        Delete: {
          Objects: batch.map((key) => ({ Key: key })),
        },
      })
    );
  }

  invalidateCaches();
  return keys.length;
}

function encodeCopySource(bucket: string, key: string): string {
  return `${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export async function moveImage(
  sourceKey: string,
  targetFolder: string
): Promise<ImageRecord> {
  const client = getS3Client();
  const { bucketName } = getR2Config();
  const filename = sourceKey.split("/").pop();
  if (!filename) {
    throw new Error("无效的对象键");
  }

  const prefix = targetFolder ? normalizeFolderPath(targetFolder) : "";
  const destKey = `${prefix}${filename}`;

  if (destKey === sourceKey) {
    const existing = await getImageMetadata(sourceKey);
    if (!existing) throw new Error("图片不存在");
    return existing;
  }

  const existingDest = await getImageMetadata(destKey);
  if (existingDest) {
    throw new Error("目标位置已存在同名文件");
  }

  const source = await getImageMetadata(sourceKey);
  if (!source) {
    throw new Error("图片不存在");
  }

  await client.send(
    new CopyObjectCommand({
      Bucket: bucketName,
      CopySource: encodeCopySource(bucketName, sourceKey),
      Key: destKey,
      MetadataDirective: "COPY",
    })
  );

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: sourceKey,
    })
  );
  invalidateCaches();

  const moved = await getImageMetadata(destKey);
  if (!moved) {
    throw new Error("移动后无法读取图片");
  }
  return moved;
}

type RandomImagesCache = {
  keys: string[];
  fetchedAt: number;
};

let randomImagesCache: RandomImagesCache | null = null;
const CACHE_TTL_MS = 60_000;

async function fetchAllImageKeys(prefix?: string): Promise<string[]> {
  const listPrefix = prefix ?? getListPrefix();
  const client = getS3Client();
  const { bucketName } = getR2Config();
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: listPrefix,
        ContinuationToken: continuationToken,
      })
    );

    for (const object of response.Contents ?? []) {
      if (object.Key && isImageKey(object.Key)) {
        keys.push(object.Key);
      }
    }

    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return keys;
}

export async function getRandomImages(
  count: number,
  prefix?: string
): Promise<ImageRecord[]> {
  const now = Date.now();

  if (
    !randomImagesCache ||
    now - randomImagesCache.fetchedAt > CACHE_TTL_MS
  ) {
    const keys = await fetchAllImageKeys(prefix);
    randomImagesCache = { keys, fetchedAt: now };
  }

  const { keys } = randomImagesCache;
  if (keys.length === 0) {
    return [];
  }

  const shuffled = [...keys].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));

  const records = await Promise.all(
    selected.map(async (key) => {
      const metadata = await getImageMetadata(key);
      if (metadata) return metadata;

      try {
        return {
          key,
          url: buildPublicUrl(key),
          originalFilename: key.split("/").pop() ?? key,
          contentType: "image/jpeg",
          size: 0,
          width: null,
          height: null,
          lastModified: new Date().toISOString(),
        } satisfies ImageRecord;
      } catch {
        return null;
      }
    })
  );

  return records.filter((item): item is ImageRecord => item !== null);
}
