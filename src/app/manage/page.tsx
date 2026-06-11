import { PageHeader } from "@/components/layout/page-header";
import { ImageList } from "@/components/manage/image-list";

export default function ManagePage() {
  return (
    <div>
      <PageHeader
        title="图片管理"
        description="按文件夹浏览资源，支持新建目录、移动与批量删除"
      />
      <ImageList />
    </div>
  );
}
