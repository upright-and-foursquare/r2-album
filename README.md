# R2 图床管理系统

基于 Next.js 16 和 Cloudflare R2 的图片上传与管理应用。元数据直接存储在 R2 对象中，无需数据库。

## 功能

- **图片上传**：拖拽/多选上传，预签名 URL 直传 R2，XHR 实时进度
- **图片管理**：列表浏览、搜索、排序、批量删除、复制链接、详情面板
- **图片预览**：瀑布流随机展示、无限滚动、灯箱查看

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制示例配置并填写你的 R2 信息：

```bash
cp .env.local.example .env.local
```

| 变量 | 说明 |
|------|------|
| `R2_ACCOUNT_ID` | Cloudflare 账户 ID |
| `R2_ACCESS_KEY_ID` | R2 API 令牌 Access Key |
| `R2_SECRET_ACCESS_KEY` | R2 API 令牌 Secret Key |
| `R2_BUCKET_NAME` | 存储桶名称 |
| `R2_PUBLIC_URL` | 图片公开访问域名 |
| `R2_MAX_FILE_SIZE` | 最大文件大小（字节），默认 10MB |

### 3. 创建 R2 存储桶

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **R2 Object Storage** → **Create bucket**
3. 创建 API 令牌：**Manage R2 API Tokens** → 权限选择 Object Read & Write

### 4. 配置 CORS

在 R2 存储桶设置中添加 CORS 规则，允许浏览器直传。

**CORS 填的是「管理系统网页的来源」，不是 R2 地址。** 格式为 `协议://IP或主机:端口`，不能带路径。

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "http://123.45.67.89:3000"
    ],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

> 将 `123.45.67.89` 替换为你的公网 IP，`3000` 替换为实际端口。`http` 与 `https`、不同端口均视为不同来源，需分别添加。

### 5. 配置公开访问

图片需要通过公开 URL 访问，有两种方式：

**方式 A：R2 公开访问（开发/测试）**

1. 存储桶 → **Settings** → **Public access** → 启用
2. 复制提供的 `https://pub-xxx.r2.dev` 地址
3. 设置 `R2_PUBLIC_URL=https://pub-xxx.r2.dev`

**方式 B：自定义域名（推荐生产环境）**

1. 存储桶 → **Settings** → **Custom Domains** → 添加域名
2. 按提示配置 DNS CNAME 记录
3. 设置 `R2_PUBLIC_URL=https://images.your-domain.com`

### 6. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

## 对象键格式

```
images/{yyyy}/{MM}/{uuid}-{sanitizedFilename}
```

示例：`images/2026/06/a1b2c3d4-...-photo.jpg`

## 自定义元数据

上传时自动写入以下 S3 元数据：

| 元数据键 | 说明 |
|----------|------|
| `x-amz-meta-original-filename` | 原始文件名 |
| `x-amz-meta-width` | 图片宽度（像素） |
| `x-amz-meta-height` | 图片高度（像素） |

## 支持格式

JPEG、PNG、WebP、GIF、AVIF（默认最大 10MB）

## 页面路由

| 路由 | 功能 |
|------|------|
| `/` | 首页，三个功能模块入口 |
| `/upload` | 图片上传 |
| `/manage` | 图片管理 |
| `/gallery` | 瀑布流预览 |

## 构建部署

```bash
npm run build
npm start
```

默认监听 `3000` 端口，可通过环境变量指定：

```bash
PORT=3000 npm start
```

### 公网 IP 部署（无域名）

管理系统用 IP 访问、图片用 R2 自带地址，**不需要为项目单独申请域名**。

| 配置项 | 填什么 | 示例 |
|--------|--------|------|
| 用户访问管理系统 | 服务器公网 IP + 端口 | `http://123.45.67.89:3000` |
| R2 CORS `AllowedOrigins` | 与浏览器地址栏 Origin 完全一致 | `http://123.45.67.89:3000` |
| `R2_PUBLIC_URL` | R2 控制台启用的 `r2.dev` 地址 | `https://pub-xxx.r2.dev` |

**步骤：**

1. 服务器上配置 `.env.local`（R2 凭证 + `R2_PUBLIC_URL=https://pub-xxx.r2.dev`）
2. R2 存储桶 → Settings → **Public Development URL** → Enable，复制 `pub-xxx.r2.dev` 地址
3. R2 CORS 的 `AllowedOrigins` 加入 `http://你的公网IP:端口`
4. 服务器防火墙/安全组放行对应端口（如 3000）
5. `npm run build && npm start`

**`.env.local` 示例（IP 部署）：**

```env
R2_ACCOUNT_ID=xxxxxxxx
R2_ACCESS_KEY_ID=xxxxxxxx
R2_SECRET_ACCESS_KEY=xxxxxxxx
R2_BUCKET_NAME=my-images
R2_PUBLIC_URL=https://pub-abc123.r2.dev
R2_MAX_FILE_SIZE=10485760
```

**注意：**

- 管理系统走 `http://IP:端口`，图片链接走 `https://pub-xxx.r2.dev/...`，两者可以不同
- 无域名时无法为管理系统配置 HTTPS（需域名 + 证书）；R2 图片地址本身仍是 HTTPS
- `r2.dev` 有速率限制，适合个人/小规模使用；流量大时再考虑为 R2 绑定域名
- 若上传报 CORS 错误，检查浏览器 Network 面板中请求的 `Origin` 是否与 CORS 配置完全一致

部署到 Vercel 等平台时，在环境变量中配置上述 R2 相关变量，并确保 CORS 包含生产访问来源。

## 技术栈

- Next.js 16 + TypeScript
- Tailwind CSS + shadcn/ui
- Cloudflare R2（S3 兼容 API）
- @aws-sdk/client-s3 + s3-request-presigner
- react-masonry-css
