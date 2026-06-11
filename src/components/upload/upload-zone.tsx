"use client";

import { useCallback, useRef, useState } from "react";
import { CheckCircle2, FileImage, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";

import { FolderPicker } from "@/components/manage/folder-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  formatFileSize,
  generateUuid,
  readImageDimensions,
  validateImageFile,
} from "@/lib/image-utils";
import type { PresignResponse, UploadFileItem } from "@/types/image";
import { cn } from "@/lib/utils";

function uploadWithProgress(
  file: File,
  presign: PresignResponse,
  onProgress: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", presign.uploadUrl, true);

    for (const [key, value] of Object.entries(presign.headers)) {
      xhr.setRequestHeader(key, value);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(
          new Error(
            xhr.status === 403
              ? "上传被拒绝 (403)，请检查 R2 API 令牌权限"
              : `上传失败 (${xhr.status})`
          )
        );
      }
    };

    xhr.onerror = () =>
      reject(
        new Error(
          "直传 R2 失败，通常是 CORS 未配置。请在 R2 存储桶 CORS 中加入当前访问来源（如 http://localhost:3000 或 http://公网IP:端口）"
        )
      );
    xhr.send(file);
  });
}

export function UploadZone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<UploadFileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [targetFolder, setTargetFolder] = useState("");

  const addFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newItems: UploadFileItem[] = [];

    for (const file of fileArray) {
      const validation = validateImageFile(
        file.name,
        file.type,
        file.size
      );
      if (!validation.valid) {
        toast.error(`${file.name}: ${validation.error}`);
        continue;
      }
      newItems.push({
        id: generateUuid(),
        file,
        status: "pending",
        progress: 0,
      });
    }

    if (newItems.length > 0) {
      setItems((prev) => [...prev, ...newItems]);
    }
  }, []);

  const uploadFile = async (item: UploadFileItem) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, status: "uploading", progress: 0 } : i
      )
    );

    try {
      let width: number | undefined;
      let height: number | undefined;
      try {
        const dimensions = await readImageDimensions(item.file);
        width = dimensions.width;
        height = dimensions.height;
      } catch {
        // dimensions optional
      }

      const presignRes = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: item.file.name,
          contentType: item.file.type,
          size: item.file.size,
          width,
          height,
          folder: targetFolder,
        }),
      });

      if (!presignRes.ok) {
        const data = await presignRes.json();
        throw new Error(data.error ?? "获取上传地址失败");
      }

      const presign = (await presignRes.json()) as PresignResponse;

      await uploadWithProgress(item.file, presign, (progress) => {
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, progress } : i))
        );
      });

      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                status: "success",
                progress: 100,
                key: presign.key,
                publicUrl: presign.publicUrl,
              }
            : i
        )
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "上传失败";
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, status: "error", error: message }
            : i
        )
      );
    }
  };

  const uploadAll = async () => {
    const pending = items.filter(
      (i) => i.status === "pending" || i.status === "error"
    );
    if (pending.length === 0) {
      toast.info("没有待上传的文件");
      return;
    }

    let successCount = 0;
    for (const item of pending) {
      await uploadFile(item);
      successCount++;
    }

    toast.success(`上传完成，共处理 ${successCount} 个文件`);
  };

  const clearCompleted = () => {
    setItems((prev) => prev.filter((i) => i.status !== "success"));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const pendingCount = items.filter(
    (i) => i.status === "pending" || i.status === "error"
  ).length;

  return (
    <div className="space-y-6">
      <Card className="surface-card border-border/60 shadow-none">
        <CardHeader className="border-b bg-muted/20 pb-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">选择文件</CardTitle>
              <p className="text-sm text-muted-foreground">
                拖拽或点击选择图片，支持批量上传
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border bg-background/80 px-3 py-2">
              <span className="text-sm text-muted-foreground">上传到</span>
              <FolderPicker
                value={targetFolder}
                onValueChange={setTargetFolder}
                className="h-9 w-56 bg-background"
                placeholder="选择文件夹"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div
            role="button"
            tabIndex={0}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                inputRef.current?.click();
              }
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-12 transition-all duration-200",
              isDragging
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border/80 bg-muted/20 hover:border-primary/40 hover:bg-muted/40"
            )}
          >
            <Upload className="size-10 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">拖拽图片到此处，或点击选择文件</p>
              <p className="mt-1 text-sm text-muted-foreground">
                支持 JPEG、PNG、WebP、GIF、AVIF，最大 10MB
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) {
                  addFiles(e.target.files);
                  e.target.value = "";
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      {items.length > 0 && (
        <Card className="surface-card border-border/60 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20 pb-5">
            <CardTitle className="text-lg">上传队列 ({items.length})</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="h-9"
                onClick={clearCompleted}
                disabled={!items.some((i) => i.status === "success")}
              >
                清除已完成
              </Button>
              <Button className="h-9" onClick={uploadAll} disabled={pendingCount === 0}>
                全部上传 ({pendingCount})
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-6">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-xl border bg-muted/15 p-4 transition-colors hover:bg-muted/25"
              >
                <FileImage className="size-8 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">
                      {item.file.name}
                    </p>
                    <Badge variant="secondary" className="shrink-0">
                      {formatFileSize(item.file.size)}
                    </Badge>
                    {item.status === "success" && (
                      <CheckCircle2 className="size-4 shrink-0 text-green-600" />
                    )}
                    {item.status === "error" && (
                      <XCircle className="size-4 shrink-0 text-destructive" />
                    )}
                  </div>
                  {item.status === "uploading" && (
                    <Progress value={item.progress} className="mt-2 h-1.5" />
                  )}
                  {item.status === "error" && item.error && (
                    <p className="mt-1 text-xs text-destructive">{item.error}</p>
                  )}
                  {item.status === "success" && item.publicUrl && (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {item.publicUrl}
                    </p>
                  )}
                </div>
                {(item.status === "pending" || item.status === "error") && (
                  <Button className="h-9" onClick={() => uploadFile(item)}>
                    上传
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
