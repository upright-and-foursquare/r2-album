import { PageHeader } from "@/components/layout/page-header";
import { UploadZone } from "@/components/upload/upload-zone";

export default function UploadPage() {
  return (
    <div>
      <PageHeader
        title="图片上传"
        description="支持拖拽与多选，通过预签名 URL 直传 Cloudflare R2"
      />
      <UploadZone />
    </div>
  );
}
