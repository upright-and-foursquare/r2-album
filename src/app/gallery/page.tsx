import { MasonryGrid } from "@/components/gallery/masonry-grid";
import { PageHeader } from "@/components/layout/page-header";

export default function GalleryPage() {
  return (
    <div>
      <PageHeader
        title="图片预览"
        description="瀑布流随机浏览图库，滚动加载更多内容"
      />
      <MasonryGrid />
    </div>
  );
}
