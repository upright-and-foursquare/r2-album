"use client";

import { useEffect, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FolderItem } from "@/types/image";
import { cn } from "@/lib/utils";

export const ROOT_FOLDER_VALUE = "__root__";

type FolderPickerProps = {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export function FolderPicker({
  value,
  onValueChange,
  placeholder = "选择目标文件夹",
  className,
}: FolderPickerProps) {
  const selectValue = value || ROOT_FOLDER_VALUE;
  const handleChange = (next: string | null) => {
    if (!next) return;
    onValueChange(next === ROOT_FOLDER_VALUE ? "" : next);
  };
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/folders")
      .then((res) => res.json())
      .then((data: { folders?: FolderItem[] }) => {
        setFolders(data.folders ?? []);
      })
      .catch(() => setFolders([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Select value={selectValue} onValueChange={handleChange} disabled={loading}>
      <SelectTrigger className={cn("h-9", className)}>
        <SelectValue placeholder={loading ? "加载文件夹..." : placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ROOT_FOLDER_VALUE}>根目录</SelectItem>
        {folders.map((folder) => (
          <SelectItem key={folder.path} value={folder.path}>
            {folder.path}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
