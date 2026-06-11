export type ImageRecord = {
  key: string;
  url: string;
  originalFilename: string;
  contentType: string;
  size: number;
  width: number | null;
  height: number | null;
  lastModified: string;
};

export type ImageListResponse = {
  images: ImageRecord[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type FolderItem = {
  name: string;
  path: string;
};

export type BrowseResponse = {
  path: string;
  parent: string | null;
  folders: FolderItem[];
  images: ImageRecord[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type PresignRequest = {
  filename: string;
  contentType: string;
  size: number;
  width?: number;
  height?: number;
  folder?: string;
};

export type PresignResponse = {
  key: string;
  uploadUrl: string;
  publicUrl: string;
  headers: Record<string, string>;
};

export type UploadFileItem = {
  id: string;
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
  key?: string;
  publicUrl?: string;
};
