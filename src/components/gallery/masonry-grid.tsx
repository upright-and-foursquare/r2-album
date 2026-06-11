"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import Masonry from "react-masonry-css";
import { Copy, Loader2, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { ImageRecord } from "@/types/image";

const BREAKPOINTS = {
  default: 4,
  1280: 3,
  768: 2,
  480: 1,
};

const GRID_IMAGE_SIZES =
  "(max-width: 480px) 100vw, (max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw";

function getAspectRatio(image: ImageRecord): string {
  if (image.width && image.height) {
    return `${image.width} / ${image.height}`;
  }
  return "3 / 4";
}

export function MasonryGrid() {
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<ImageRecord | null>(null);
  const seenKeys = useRef(new Set<string>());
  const sentinelRef = useRef<HTMLDivElement>(null);
  const fetchIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const initialLoadDoneRef = useRef(false);

  const fetchRandom = useCallback(async (append = false) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const fetchId = ++fetchIdRef.current;

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await fetch("/api/images/random?count=16", {
        signal: controller.signal,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "加载失败");
      }

      const data = (await res.json()) as { images: ImageRecord[] };

      if (fetchId !== fetchIdRef.current) return;

      if (append) {
        const unique = data.images.filter((img) => {
          if (seenKeys.current.has(img.key)) return false;
          seenKeys.current.add(img.key);
          return true;
        });
        if (unique.length > 0) {
          setImages((prev) => [...prev, ...unique]);
        }
      } else {
        seenKeys.current = new Set(data.images.map((img) => img.key));
        setImages(data.images);
        initialLoadDoneRef.current = true;
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      toast.error(error instanceof Error ? error.message : "加载失败");
    } finally {
      if (fetchId === fetchIdRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    initialLoadDoneRef.current = false;
    queueMicrotask(() => {
      void fetchRandom();
    });

    return () => {
      abortRef.current?.abort();
    };
  }, [fetchRandom]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || loading || !initialLoadDoneRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0]?.isIntersecting &&
          !loading &&
          !loadingMore &&
          initialLoadDoneRef.current
        ) {
          fetchRandom(true);
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchRandom, loading, loadingMore, images.length]);

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("链接已复制");
    } catch {
      toast.error("复制失败");
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-3/4 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="surface-card flex flex-col items-center gap-4 px-6 py-16 text-center">
        <p className="text-muted-foreground">暂无图片，请先上传一些图片</p>
        <Button variant="outline" className="h-9" onClick={() => fetchRandom()}>
          <RefreshCw className="size-4" />
          刷新
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="surface-card mb-5 flex items-center justify-between px-4 py-3">
        <p className="text-sm text-muted-foreground">
          随机展示 <span className="font-medium text-foreground">{images.length}</span> 张图片，滚动加载更多
        </p>
        <Button variant="outline" className="h-9" onClick={() => fetchRandom()}>
          <RefreshCw className="size-4" />
          换一批
        </Button>
      </div>

      <Masonry
        breakpointCols={BREAKPOINTS}
        className="flex w-auto gap-4"
        columnClassName="flex flex-col gap-4"
      >
        {images.map((image) => (
          <button
            key={image.key}
            type="button"
            onClick={() => setLightboxImage(image)}
            className="group relative w-full overflow-hidden rounded-xl border border-border/70 bg-muted/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div
              className="relative w-full"
              style={{ aspectRatio: getAspectRatio(image) }}
            >
              <Image
                src={image.url}
                alt={image.originalFilename}
                fill
                sizes={GRID_IMAGE_SIZES}
                quality={75}
                className="object-cover transition-transform group-hover:scale-105"
              />
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
              <p className="truncate text-xs text-white">
                {image.originalFilename}
              </p>
            </div>
          </button>
        ))}
      </Masonry>

      <div ref={sentinelRef} className="flex justify-center py-8">
        {loadingMore && <Loader2 className="size-6 animate-spin text-muted-foreground" />}
      </div>

      <Dialog
        open={Boolean(lightboxImage)}
        onOpenChange={(open) => !open && setLightboxImage(null)}
      >
        <DialogContent
          showCloseButton={false}
          className="w-full max-w-[calc(100%-2rem)] overflow-hidden p-0 sm:max-w-4xl"
        >
          {lightboxImage && (
            <>
              <DialogTitle className="sr-only">
                {lightboxImage.originalFilename}
              </DialogTitle>
              <div className="relative min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 z-10 bg-black/50 text-white hover:bg-black/70"
                  onClick={() => setLightboxImage(null)}
                >
                  <X className="size-4" />
                </Button>
                <div className="relative h-[80vh] w-full min-w-0 overflow-hidden bg-black/5">
                  <Image
                    src={lightboxImage.url}
                    alt={lightboxImage.originalFilename}
                    fill
                    sizes="(max-width: 896px) 100vw, 896px"
                    quality={85}
                    priority
                    className="object-contain"
                  />
                </div>
                <div className="flex items-center justify-between border-t p-4">
                  <p className="truncate text-sm font-medium">
                    {lightboxImage.originalFilename}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyUrl(lightboxImage.url)}
                  >
                    <Copy className="size-4" />
                    复制链接
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
