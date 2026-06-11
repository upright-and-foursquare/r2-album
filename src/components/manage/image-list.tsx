"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Copy,
  ExternalLink,
  Folder,
  FolderInput,
  FolderPlus,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { FolderPicker } from "@/components/manage/folder-picker";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "@/components/ui/toolbar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatFileSize, getFolderName } from "@/lib/image-utils";
import { cn } from "@/lib/utils";
import type { BrowseResponse, FolderItem, ImageRecord } from "@/types/image";

type SortField = "lastModified" | "size" | "originalFilename";
type SortOrder = "asc" | "desc";

const ROOT_PATH = "";

function encodeKeyForApi(key: string): string {
  return key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function encodeFolderForApi(path: string): string {
  if (!path) return "";
  return path
    .replace(/\/$/, "")
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function buildBreadcrumbs(path: string): { label: string; path: string }[] {
  const crumbs = [{ label: "根目录", path: ROOT_PATH }];
  if (!path) return crumbs;

  const segments = path.replace(/\/$/, "").split("/").filter(Boolean);
  let current = "";
  for (const segment of segments) {
    current = `${current}${segment}/`;
    crumbs.push({ label: segment, path: current });
  }
  return crumbs;
}

export function ImageList() {
  const [currentPath, setCurrentPath] = useState(ROOT_PATH);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("lastModified");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailImage, setDetailImage] = useState<ImageRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string[] | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<FolderItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveTargetFolder, setMoveTargetFolder] = useState(ROOT_PATH);
  const [moving, setMoving] = useState(false);

  const fetchBrowse = useCallback(async (path: string, nextCursor?: string) => {
    const isLoadMore = Boolean(nextCursor);
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const params = new URLSearchParams({ limit: "50", path });
      if (nextCursor) params.set("cursor", nextCursor);

      const res = await fetch(`/api/browse?${params}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "加载失败");
      }

      const data = (await res.json()) as BrowseResponse;

      setFolders((prev) => (isLoadMore ? prev : data.folders));
      setImages((prev) =>
        isLoadMore ? [...prev, ...data.images] : data.images
      );
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载失败");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const navigateToPath = useCallback(
    (path: string) => {
      setCurrentPath(path);
      setSelected(new Set());
      void fetchBrowse(path);
    },
    [fetchBrowse]
  );

  useEffect(() => {
    queueMicrotask(() => {
      void fetchBrowse(ROOT_PATH);
    });
  }, [fetchBrowse]);

  const breadcrumbs = useMemo(
    () => buildBreadcrumbs(currentPath),
    [currentPath]
  );

  const filteredImages = useMemo(() => {
    const query = search.trim().toLowerCase();
    let result = images;

    if (query) {
      result = result.filter(
        (img) =>
          img.originalFilename.toLowerCase().includes(query) ||
          img.key.toLowerCase().includes(query)
      );
    }

    return [...result].sort((a, b) => {
      let cmp = 0;
      if (sortField === "lastModified") {
        cmp =
          new Date(a.lastModified).getTime() -
          new Date(b.lastModified).getTime();
      } else if (sortField === "size") {
        cmp = a.size - b.size;
      } else {
        cmp = a.originalFilename.localeCompare(b.originalFilename, "zh-CN");
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [images, search, sortField, sortOrder]);

  const filteredFolders = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return folders;
    return folders.filter((folder) =>
      folder.name.toLowerCase().includes(query)
    );
  }, [folders, search]);

  const allSelected =
    filteredImages.length > 0 &&
    filteredImages.every((img) => selected.has(img.key));

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredImages.map((img) => img.key)));
    }
  };

  const toggleOne = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("链接已复制");
    } catch {
      toast.error("复制失败");
    }
  };

  const handleDelete = async (keys: string[]) => {
    setDeleting(true);
    let successCount = 0;

    for (const key of keys) {
      try {
        const res = await fetch(`/api/images/${encodeKeyForApi(key)}`, {
          method: "DELETE",
        });
        if (res.ok) successCount++;
      } catch {
        // continue
      }
    }

    setImages((prev) => prev.filter((img) => !keys.includes(img.key)));
    setSelected((prev) => {
      const next = new Set(prev);
      keys.forEach((k) => next.delete(k));
      return next;
    });
    setDeleteTarget(null);
    setDeleting(false);

    if (successCount === keys.length) {
      toast.success(`已删除 ${successCount} 张图片`);
    } else {
      toast.warning(`删除完成：成功 ${successCount}，失败 ${keys.length - successCount}`);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error("请输入文件夹名称");
      return;
    }

    setCreatingFolder(true);
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFolderName,
          parent: currentPath,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "创建失败");
      }

      toast.success(`文件夹「${data.name}」已创建`);
      setCreateFolderOpen(false);
      setNewFolderName("");
      fetchBrowse(currentPath);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "创建失败");
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleDeleteFolder = async (folder: FolderItem) => {
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/folders/${encodeFolderForApi(folder.path)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "删除失败");
      }

      toast.success(`已删除文件夹及其 ${data.deletedCount} 个对象`);
      setDeleteFolderTarget(null);
      fetchBrowse(currentPath);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  };

  const handleMove = async () => {
    const keys = [...selected];
    if (keys.length === 0) return;

    setMoving(true);
    try {
      const res = await fetch("/api/images/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keys,
          targetFolder: moveTargetFolder,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "移动失败");
      }

      toast.success(`已移动 ${keys.length} 张图片`);
      setMoveOpen(false);
      setSelected(new Set());
      fetchBrowse(currentPath);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "移动失败");
    } finally {
      setMoving(false);
    }
  };

  const isEmpty = !loading && filteredFolders.length === 0 && filteredImages.length === 0;

  const itemCount = filteredFolders.length + filteredImages.length;

  return (
    <div className="space-y-4">
      <Card className="surface-card overflow-hidden border-border/60 shadow-none">
        <CardHeader className="space-y-4 border-b bg-muted/20 pb-5">
          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-background/80 px-3 py-2 text-sm text-muted-foreground">
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.path} className="flex items-center gap-1">
                {index > 0 && <ChevronRight className="size-3.5 opacity-60" />}
                <button
                  type="button"
                  onClick={() => navigateToPath(crumb.path)}
                  className={cn(
                    "rounded-md px-2 py-1 transition-colors",
                    crumb.path === currentPath
                      ? "bg-primary/10 font-medium text-foreground"
                      : "hover:bg-muted hover:text-foreground"
                  )}
                >
                  {crumb.label}
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">
                {currentPath ? getFolderName(currentPath) : "全部资源"}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {loading ? "加载中..." : `当前目录共 ${itemCount} 项`}
                {selected.size > 0 ? ` · 已选 ${selected.size} 张图片` : ""}
              </p>
            </div>

            <Toolbar className="w-full lg:w-auto">
              <ToolbarGroup>
                <div className="relative">
                  <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="搜索当前目录..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 w-full min-w-44 bg-background pl-9 sm:w-52"
                  />
                </div>
                <Select
                  value={sortField}
                  onValueChange={(v) => setSortField(v as SortField)}
                >
                  <SelectTrigger className="h-9 w-36 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lastModified">上传时间</SelectItem>
                    <SelectItem value="size">文件大小</SelectItem>
                    <SelectItem value="originalFilename">文件名</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-9 shrink-0 bg-background"
                  onClick={() =>
                    setSortOrder((o) => (o === "asc" ? "desc" : "asc"))
                  }
                >
                  {sortOrder === "asc" ? (
                    <ArrowUp className="size-4" />
                  ) : (
                    <ArrowDown className="size-4" />
                  )}
                </Button>
              </ToolbarGroup>

              <ToolbarSeparator />

              <ToolbarGroup>
                <Button
                  variant="outline"
                  className="h-9 bg-background"
                  onClick={() => setCreateFolderOpen(true)}
                >
                  <FolderPlus className="size-4" />
                  新建文件夹
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-9 bg-background"
                  onClick={() => fetchBrowse(currentPath)}
                >
                  <RefreshCw className="size-4" />
                </Button>
              </ToolbarGroup>

              {selected.size > 0 && (
                <>
                  <ToolbarSeparator />
                  <ToolbarGroup>
                    <Button
                      variant="outline"
                      className="h-9 bg-background"
                      onClick={() => setMoveOpen(true)}
                    >
                      <FolderInput className="size-4" />
                      移动 ({selected.size})
                    </Button>
                    <Button
                      variant="destructive"
                      className="h-9"
                      onClick={() => setDeleteTarget([...selected])}
                    >
                      <Trash2 className="size-4" />
                      删除 ({selected.size})
                    </Button>
                  </ToolbarGroup>
                </>
              )}
            </Toolbar>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <Folder className="size-10 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                {search ? "当前目录没有匹配内容" : "当前目录为空"}
              </p>
              <Button
                variant="outline"
                className="h-9"
                onClick={() => setCreateFolderOpen(true)}
              >
                <FolderPlus className="size-4" />
                新建文件夹
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    {filteredImages.length > 0 && (
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleAll}
                      />
                    )}
                  </TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead>大小</TableHead>
                  <TableHead>尺寸</TableHead>
                  <TableHead>修改时间</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFolders.map((folder) => (
                  <TableRow key={folder.path} className="hover:bg-muted/40">
                    <TableCell />
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => navigateToPath(folder.path)}
                        className="flex items-center gap-2 text-left hover:underline"
                      >
                        <Folder className="size-4 text-amber-500" />
                        <span className="font-medium">{folder.name}</span>
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">文件夹</Badge>
                    </TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon-sm">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => navigateToPath(folder.path)}
                          >
                            打开
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteFolderTarget(folder)}
                          >
                            <Trash2 className="size-4" />
                            删除文件夹
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}

                {filteredImages.map((image) => (
                  <TableRow key={image.key} className="hover:bg-muted/40">
                    <TableCell>
                      <Checkbox
                        checked={selected.has(image.key)}
                        onCheckedChange={() => toggleOne(image.key)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setDetailImage(image)}
                          className="block size-10 overflow-hidden rounded-md border"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={image.url}
                            alt={image.originalFilename}
                            className="size-full object-cover"
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDetailImage(image)}
                          className="max-w-[200px] truncate text-left text-sm hover:underline"
                        >
                          {image.originalFilename}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>{formatFileSize(image.size)}</TableCell>
                    <TableCell>
                      {image.width && image.height
                        ? `${image.width}×${image.height}`
                        : "-"}
                    </TableCell>
                    <TableCell>{formatDate(image.lastModified)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon-sm">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => copyUrl(image.url)}
                          >
                            <Copy className="size-4" />
                            复制链接
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => window.open(image.url, "_blank")}
                          >
                            <ExternalLink className="size-4" />
                            打开原图
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteTarget([image.key])}
                          >
                            <Trash2 className="size-4" />
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {hasMore && !loading && (
            <div className="flex justify-center border-t px-6 py-4">
              <Button
                variant="outline"
                className="h-9"
                onClick={() => cursor && fetchBrowse(currentPath, cursor)}
                disabled={loadingMore}
              >
                {loadingMore && <Loader2 className="size-4 animate-spin" />}
                加载更多
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建文件夹</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              将在「{currentPath ? getFolderName(currentPath) : "根目录"}」下创建
            </p>
            <Input
              placeholder="文件夹名称"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="h-9"
              onClick={() => setCreateFolderOpen(false)}
              disabled={creatingFolder}
            >
              取消
            </Button>
            <Button className="h-9" onClick={handleCreateFolder} disabled={creatingFolder}>
              {creatingFolder && <Loader2 className="size-4 animate-spin" />}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>移动图片</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              将 {selected.size} 张图片移动到：
            </p>
            <FolderPicker
              value={moveTargetFolder}
              onValueChange={setMoveTargetFolder}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="h-9" onClick={() => setMoveOpen(false)} disabled={moving}>
              取消
            </Button>
            <Button className="h-9" onClick={handleMove} disabled={moving}>
              {moving && <Loader2 className="size-4 animate-spin" />}
              移动
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet
        open={Boolean(detailImage)}
        onOpenChange={(open) => !open && setDetailImage(null)}
      >
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          {detailImage && (
            <>
              <SheetHeader className="border-b px-6 py-5 pr-14">
                <SheetTitle className="truncate pr-2 text-base">
                  {detailImage.originalFilename}
                </SheetTitle>
                <SheetDescription>
                  {formatFileSize(detailImage.size)}
                  {detailImage.width && detailImage.height
                    ? ` · ${detailImage.width} × ${detailImage.height}`
                    : ""}
                  {" · "}
                  {formatDate(detailImage.lastModified)}
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                <div className="overflow-hidden rounded-xl border bg-muted/30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={detailImage.url}
                    alt={detailImage.originalFilename}
                    className="max-h-72 w-full object-contain"
                  />
                </div>

                <div className="grid gap-3 text-sm">
                  {[
                    ["文件类型", <Badge key="type" variant="secondary">{detailImage.contentType}</Badge>],
                    ["图片尺寸", detailImage.width && detailImage.height ? `${detailImage.width} × ${detailImage.height}` : "未知"],
                    ["文件大小", formatFileSize(detailImage.size)],
                    ["修改时间", formatDate(detailImage.lastModified)],
                  ].map(([label, value]) => (
                    <div
                      key={String(label)}
                      className="flex items-center justify-between gap-4 rounded-lg border bg-muted/20 px-4 py-3"
                    >
                      <span className="shrink-0 text-muted-foreground">{label}</span>
                      <span className="text-right font-medium">{value}</span>
                    </div>
                  ))}

                  <div className="space-y-2 rounded-lg border bg-muted/20 px-4 py-3">
                    <span className="text-muted-foreground">对象键</span>
                    <p className="break-all font-mono text-xs leading-relaxed">
                      {detailImage.key}
                    </p>
                  </div>

                  <div className="space-y-2 rounded-lg border bg-muted/20 px-4 py-3">
                    <span className="text-muted-foreground">公开链接</span>
                    <p className="break-all text-xs leading-relaxed text-foreground/90">
                      {detailImage.url}
                    </p>
                  </div>
                </div>
              </div>

              <SheetFooter className="flex-row gap-2 border-t px-6 py-4">
                <Button
                  className="h-9 flex-1"
                  onClick={() => copyUrl(detailImage.url)}
                >
                  <Copy className="size-4" />
                  复制链接
                </Button>
                <Button
                  variant="outline"
                  className="h-9"
                  onClick={() => window.open(detailImage.url, "_blank")}
                >
                  <ExternalLink className="size-4" />
                  打开原图
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除 {deleteTarget?.length ?? 0} 张图片吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              {deleting && <Loader2 className="size-4 animate-spin" />}
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(deleteFolderTarget)}
        onOpenChange={(open) => !open && setDeleteFolderTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除文件夹</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除文件夹「{deleteFolderTarget?.name}」及其所有内容吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={() =>
                deleteFolderTarget && handleDeleteFolder(deleteFolderTarget)
              }
            >
              {deleting && <Loader2 className="size-4 animate-spin" />}
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
