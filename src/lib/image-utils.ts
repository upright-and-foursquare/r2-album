const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

const ALLOWED_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "avif",
]);

export function isImageKey(key: string): boolean {
  if (!key || key.endsWith("/")) return false;
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  return ALLOWED_EXTENSIONS.has(ext);
}

export function getListPrefix(): string | undefined {
  const prefix = process.env.R2_LIST_PREFIX?.trim();
  if (!prefix) return undefined;
  return prefix;
}

export function getMaxFileSize(): number {
  const envValue = process.env.R2_MAX_FILE_SIZE;
  if (envValue) {
    const parsed = Number.parseInt(envValue, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 10 * 1024 * 1024;
}

export function isAllowedImageType(contentType: string, filename: string): boolean {
  if (ALLOWED_TYPES.has(contentType)) {
    return true;
  }
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return ALLOWED_EXTENSIONS.has(ext);
}

export function validateImageFile(
  filename: string,
  contentType: string,
  size: number
): { valid: boolean; error?: string } {
  if (!filename.trim()) {
    return { valid: false, error: "文件名不能为空" };
  }
  if (!isAllowedImageType(contentType, filename)) {
    return {
      valid: false,
      error: "仅支持 JPEG、PNG、WebP、GIF、AVIF 格式",
    };
  }
  const maxSize = getMaxFileSize();
  if (size <= 0 || size > maxSize) {
    return {
      valid: false,
      error: `文件大小不能超过 ${formatFileSize(maxSize)}`,
    };
  }
  return { valid: true };
}

export function sanitizeFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? "image";
  const sanitized = base
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  if (!sanitized || sanitized === ".") {
    return "image.jpg";
  }
  return sanitized;
}

export function sanitizeFolderName(name: string): string {
  const trimmed = name.trim().replace(/[/\\]+/g, "");
  const sanitized = trimmed
    .replace(/\.\.+/g, "")
    .replace(/[^\w.\-\u4e00-\u9fff]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!sanitized || sanitized === ".") {
    throw new Error("文件夹名称无效");
  }
  return sanitized;
}

export function normalizeFolderPath(path: string): string {
  const trimmed = path.trim().replace(/^\/+|\/+$/g, "");
  if (!trimmed) return "";
  if (trimmed.includes("..")) {
    throw new Error("文件夹路径无效");
  }
  return `${trimmed.split("/").filter(Boolean).join("/")}/`;
}

export function getParentFolderPath(path: string): string | null {
  const normalized = normalizeFolderPath(path);
  if (!normalized) return null;
  const segments = normalized.slice(0, -1).split("/").filter(Boolean);
  if (segments.length <= 1) return "";
  return `${segments.slice(0, -1).join("/")}/`;
}

export function getFolderName(path: string): string {
  const normalized = normalizeFolderPath(path);
  if (!normalized) return "根目录";
  const segments = normalized.slice(0, -1).split("/").filter(Boolean);
  return segments[segments.length - 1] ?? "根目录";
}

export function generateObjectKey(filename: string, folder = ""): string {
  const uuid = crypto.randomUUID();
  const sanitized = sanitizeFilename(filename);
  const prefix = folder ? normalizeFolderPath(folder) : "";
  return `${prefix}${uuid}-${sanitized}`;
}

export function buildPublicUrl(key: string): string {
  const baseUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  if (!baseUrl) {
    throw new Error("R2_PUBLIC_URL is not configured");
  }
  const encodedKey = key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${baseUrl}/${encodedKey}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function readImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("无法读取图片尺寸"));
    };
    img.src = url;
  });
}

export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
