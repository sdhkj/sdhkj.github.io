# sdhkj.github.io

个人博客，部署在 GitHub Pages 用户站：<https://sdhkj.github.io>

- 站点框架：[Astro](https://astro.build/) 5 + [Fuwari](https://github.com/saicaca/fuwari) 模板（MIT，LICENSE 原文保留在仓库根目录）
- 内容编辑器：[Sveltia CMS](https://sveltiacms.app/)（Netlify/Decap CMS 的现代替代品），脚本与字体已**本地化**，不依赖 unpkg/jsdelivr
- 部署：GitHub Actions → GitHub Pages
- 在线登录：自建 Cloudflare Worker 做 GitHub OAuth 中转（源码在 `worker/`，**可选**，见第 3.3 节的替代方案）

> 基于 [saicaca/fuwari](https://github.com/saicaca/fuwari) 模板搭建。原模板的 Vercel 配置（`vercel.json`）、上游自带的 `.github/`（workflow / issue 模板 / dependabot）以及多余的示例文章已清理，只保留 1 篇示例文章。

---

## 1. 环境要求

| 组件 | 要求 | 说明 |
| --- | --- | --- |
| Node.js | `18.20.8` / `^20.3.0` / `>=22.0.0` | 来自 `astro@5.13.10` 的 `engines` 字段。**推荐 Node 20 LTS 或 22 LTS，不要用 Node 21 这类奇数版本** |
| pnpm | `>=7.1.0` | `package.json` 里 `packageManager: pnpm@9.14.4`；仓库有 `preinstall: npx only-allow pnpm`，用 npm/yarn 装依赖会被拒绝 |
| Git | 任意较新版本 | 需要能直连 `github.com` |

检查本机版本：

```powershell
node -v
pnpm -v
```

> **网络提醒（重要）**：如果本机 git 全局配置了 `http.proxy` / `https.proxy` 指向一个不可用的代理（本机就是这种情况：`127.0.0.1:7890` 连接被 reset），所有 git 网络操作都要临时绕过它 —— **不要改全局配置**：
>
> ```powershell
> git -c http.proxy= -c https.proxy= <子命令>
> ```

---

## 2. 本地开发

```powershell
pnpm install                     # 首次安装依赖
pnpm dev                         # 开发服务器，默认 http://localhost:4321
pnpm build                       # 构建到 dist/（含 pagefind 全文搜索索引）
pnpm preview                     # 预览构建结果
pnpm new-post -- my-first-post   # 按 Fuwari 的 frontmatter 模板新建一篇文章
pnpm sync:cms                    # 把 @sveltia/cms 的脚本/字体同步到 public/admin/
```

`pnpm build` 会自动先执行 `prebuild` → `pnpm sync:cms`，所以 CI 里不需要额外步骤。

---

## 3. 内容管理（Sveltia CMS）

后台入口：<https://sdhkj.github.io/admin/>（本地为 <http://localhost:4321/admin/index.html>）。

相关文件：

| 文件 | 作用 |
| --- | --- |
| `public/admin/index.html` | CMS 页面，引用本地脚本 `/admin/sveltia-cms.js` |
| `public/admin/config.yml` | CMS 配置：后端、集合、字段定义（**字段与 Fuwari schema 严格对齐**） |
| `public/admin/sveltia-cms.js` | 由 `pnpm sync:cms` 从 `node_modules/@sveltia/cms/dist/` 复制并本地化，已提交进仓库 |
| `public/admin/fonts/` | 从 CDN 改写为本地路径的字体/图标字体（Source Sans 3、Noto Mono、Material Symbols） |
| `scripts/sync-sveltia-cms.mjs` | 完成上面两步的脚本 |

### 3.1 字段与 Fuwari schema 的对应关系

CMS 字段直接对应 `src/content/config.ts` 里的 Zod schema，**改任何一边都要同步另一边**，否则编辑器保存出来的 md 会让 `pnpm build` 报错：

| frontmatter | 类型 | CMS 字段 |
| --- | --- | --- |
| `title` | `string`（必填） | 标题，`string` |
| `published` | `Date`（必填） | 发布日期，`datetime` + `date_format: YYYY-MM-DD` + `time_format: false` + `format: YYYY-MM-DD`，写出 `published: 2023-09-09` 这种**不带引号**的纯量 |
| `updated` | `Date`（可选） | 更新日期，同上；留空时**不写入** frontmatter |
| `description` | `string`（可选） | 摘要 |
| `image` | `string`（可选） | 封面图，上传后写 `/images/xxx.png` |
| `tags` | `string[]`（可选） | 标签，`list` |
| `category` | `string \| null`（可选） | 分类 |
| `draft` | `boolean`（可选） | 草稿，`boolean` |
| `lang` | `string`（可选） | 语言，如 `zh_CN` |
| 正文 | — | `name: body` + `widget: markdown`（Sveltia 默认把 `body` 当正文，不写进 frontmatter） |

几个**必须保留**的配置，删了会构建失败或体验变差：

- `output.omit_empty_optional_fields: true` —— 否则留空的 `updated` 会被写成 `updated: ''`，而 `z.date()` 不接受空字符串，Astro 构建直接报错。
- `media_folder: public/images` + `public_folder: /images` —— Fuwari 对以 `/` 开头的 `image` 走 public 路径（见 `src/components/misc/ImageWrapper.astro`），所以封面图必须落到 `public/images/`。
- `slug.encoding: unicode` —— 保留中文文件名；改成 `ascii` 会让纯中文标题被清空并退化成随机 UUID。
- 集合的 `path: "{{slug}}"` + `extension: md` —— 文件落在 `src/content/posts/<文件名>.md`，站点 URL 是 `/posts/<文件名>/`（`trailingSlash: always`）。

### 3.2 本地写作（不需要 Cloudflare、不需要 OAuth）

Sveltia CMS **不再使用** Decap 的 `local_backend` 代理：`local_backend` 在 Sveltia 源码里被标记为 unsupported 并会被忽略（打开后台只会看到一条提示），它现在的做法是浏览器的 File System Access API：

1. 确保项目目录已经 `git init`（Sveltia 靠 `.git` 目录判断这是仓库根目录）：

   ```powershell
   git rev-parse --is-inside-work-tree   # 应输出 true
   ```

2. 启动开发服务器：

   ```powershell
   pnpm dev
   ```

3. 用 **Chrome / Edge / Brave 等 Chromium 内核浏览器**（Firefox、Safari 不支持该 API）打开：

   ```
   http://localhost:4321/admin/index.html
   ```

4. 点击 **“Work with Local Repository”**，在目录选择框里选中项目根目录 `E:\project\codeProject\ds_blog`。
5. 正常编辑内容，改动会**直接写入本地文件**（Sveltia 只做文件读写，不做任何 Git 操作）。
6. 回到终端用 git 检查、提交、推送：

   ```powershell
   git status
   git diff
   git add -A
   git commit -m "post: 新文章"
   git -c http.proxy= -c https.proxy= push
   ```

> `public/admin/config.yml` 里的 `local_backend: true` 是为兼容 Decap 配置习惯保留的，实际不生效；真正生效的是上面这个按钮。

### 3.3 在线写作（登录 GitHub，需要 Worker 或 Token）

`public/admin/config.yml` 里的 `backend.base_url` 现在是占位符：

```yaml
base_url: https://REPLACE-ME.workers.dev
```

两种处理方式，**二选一**：

**方案 A（推荐，多人/非技术用户友好）：部署 Cloudflare Worker**，见第 5 节，然后把 `base_url` 替换成真实地址。

**方案 B（最省事，个人博客足够）：用 GitHub Personal Access Token 登录，把 `base_url` 注释掉。**

```yaml
backend:
  name: github
  repo: sdhkj/sdhkj.github.io
  branch: main
  # base_url: https://REPLACE-ME.workers.dev   # 用 Token 登录时注释掉这一行
```

然后在 <https://sdhkj.github.io/admin/> 的登录页点 **“Sign In with Token”**，按提示生成 fine-grained PAT（**Contents: Read and write**；若使用 Editorial Workflow，另需 **Pull requests: Read and write**），粘贴即可。Token 存在浏览器 localStorage 中。

> 注意：只要 `base_url` 还留着 `REPLACE-ME` 占位符，OAuth 方式就无法登录。请务必按上面二选一处理。

---

## 4. 部署到 GitHub Pages（完整步骤）

### 步骤 1：创建 GitHub 仓库

仓库名**必须**是 `sdhkj.github.io`（GitHub Pages “用户站”的命名规则，只有这样站点才发布在根域名 `https://sdhkj.github.io/` 下）。

在 <https://github.com/new>：

- Repository name: `sdhkj.github.io`
- 可见性：Public（免费账号的 Pages 只对公开仓库开放；私有仓库发 Pages 需要 Pro）
- **不要**勾选 “Add a README file / .gitignore / license”（本地已有内容，勾了会冲突）

### 步骤 2：本地推送

```powershell
cd E:\project\codeProject\ds_blog

# 检查状态（本仓库已 git init，默认分支为 main）
git status
git branch --show-current   # 应输出 main

# 首次提交
git add -A
git commit -m "chore: 基于 Fuwari 初始化 Astro 博客并接入 Sveltia CMS"

# 关联远程仓库
git remote add origin https://github.com/sdhkj/sdhkj.github.io.git

# 推送：本机全局 git 配了一个坏代理（127.0.0.1:7890 连接被 reset），
# 所以必须这样临时绕过，不要改全局配置
git -c http.proxy= -c https.proxy= push -u origin main
```

若远端已有内容（比如建仓时勾了 README），先合并再推：

```powershell
git -c http.proxy= -c https.proxy= pull --rebase origin main
git -c http.proxy= -c https.proxy= push -u origin main
```

以后每次推送都用同样的写法：

```powershell
git add -A
git commit -m "post: 新文章"
git -c http.proxy= -c https.proxy= push
```

### 步骤 3：仓库 Settings → Pages → Source 选 GitHub Actions

1. 打开仓库 → **Settings** → 左侧 **Pages**
2. **Build and deployment** → **Source** 选择 **GitHub Actions**（不要选 “Deploy from a branch”）
3. 回到 **Actions** 标签页，能看到 `Deploy to GitHub Pages` 工作流（推送到 `main` 会自动触发，也可以在 Actions 页面手动 `Run workflow`）
4. 跑完后站点在 <https://sdhkj.github.io/>

工作流文件是 `.github/workflows/deploy.yml`：pnpm 缓存 + `pnpm install --frozen-lockfile` + `pnpm build`，再用 `actions/upload-pages-artifact` 上传 `dist/`、`actions/deploy-pages` 发布。

> 如果 Actions 报 `HttpError: Not Found` 或 “Get Pages site failed”，基本都是第 2 步的 Source 没选成 GitHub Actions。

### 步骤 4：配置 OAuth Worker 并替换 base_url

见第 5 节。核心一句话：部署完 Worker 后，把它的地址填回 `public/admin/config.yml` 的 `backend.base_url`，然后提交推送。

### 步骤 5：绑定自定义域名（可选）

1. 在域名服务商处添加 CNAME 记录：你的子域名 → `sdhkj.github.io`
2. 仓库 **Settings** → **Pages** → **Custom domain** 填入域名（例如 `blog.example.com`）并 Save
3. DNS 检查通过后勾选 **Enforce HTTPS**
4. 本站用 Actions 发布，GitHub **不会**自动生成 `CNAME` 文件，需要手动在 `public/CNAME` 放一份（内容就是那一行域名，如 `blog.example.com`），否则每次部署后自定义域会丢失
5. 自定义域生效后记得：
   - 把 `astro.config.mjs` 的 `site` 改成自定义域名（影响 RSS、sitemap、绝对链接）
   - 把新域名加进 Worker 的 `ALLOWED_DOMAINS`

---

## 5. 部署 Cloudflare Worker（GitHub OAuth 中转）

`sveltia-cms-auth`（MIT，源码已放在 `worker/`，只加了一个说明用的注释头，许可证副本为 `worker/LICENSE.txt`）是一个无依赖的 Cloudflare Worker，只做两件事：

- `GET /auth` → 302 跳转到 GitHub 授权页（带防 CSRF 的 state cookie）
- `GET /callback` → 用 `code` 换 `access_token`，再 postMessage 给 CMS 页面

### 5.1 准备

```powershell
cd E:\project\codeProject\ds_blog\worker
pnpm install            # 只装 wrangler
npx wrangler login      # 浏览器里授权 Cloudflare 账号
```

`worker/wrangler.toml` 里的 `name = "sveltia-cms-auth"` 决定最终地址：

```
https://sveltia-cms-auth.<你的 workers.dev 子域>.workers.dev
```

想换名字就改 `name`，然后把新地址填回 `public/admin/config.yml`。

### 5.2 创建 GitHub OAuth App

打开 <https://github.com/settings/applications/new>（想在组织下创建就去组织 Settings → Developer settings → OAuth Apps）：

| 字段 | 填写 |
| --- | --- |
| Application name | `Sveltia CMS Authenticator`（随便） |
| Homepage URL | `https://sdhkj.github.io/`（随便） |
| Authorization callback URL | `https://sveltia-cms-auth.<你的子域>.workers.dev/callback`（**必须是 Worker 地址 + `/callback`**） |

创建后记下 **Client ID**，点 **Generate a new client secret** 生成并复制 **Client Secret**（只显示一次）。

### 5.3 写入密钥并部署

```powershell
cd E:\project\codeProject\ds_blog\worker

npx wrangler secret put GITHUB_CLIENT_ID       # 粘贴 Client ID
npx wrangler secret put GITHUB_CLIENT_SECRET   # 粘贴 Client Secret

npx wrangler deploy
```

`wrangler deploy` 成功后会打印 Worker 地址，形如：

```
https://sveltia-cms-auth.<你的子域>.workers.dev
```

> 密钥**不要**写进 `wrangler.toml`。`ALLOWED_DOMAINS` 不是密钥，已经写在 `wrangler.toml` 的 `[vars]` 里，用于限制哪些站点可以使用你的 Worker（防盗用）：
> `sdhkj.github.io, cms.netlify.com, localhost` —— `cms.netlify.com` 是 Sveltia 从 localhost 登录时上报的 `site_id`，本地调试需要它。绑定自定义域名后记得把域名也加进去。

### 5.4 把 Worker 地址填回 CMS 配置

编辑 `public/admin/config.yml`：

```yaml
backend:
  name: github
  repo: sdhkj/sdhkj.github.io
  branch: main
  base_url: https://sveltia-cms-auth.<你的子域>.workers.dev   # ← 替换占位符，结尾不要带 /
```

提交推送：

```powershell
git add public/admin/config.yml
git commit -m "chore: 配置 Sveltia CMS OAuth Worker 地址"
git -c http.proxy= -c https.proxy= push
```

等 Actions 部署完，打开 <https://sdhkj.github.io/admin/> → **Sign In with GitHub**，保存会直接提交到 `main` 并触发重新部署。

### 5.5 本地调试 Worker（可选）

```powershell
cd worker
npx wrangler dev            # 默认 http://localhost:8787
```

调试时把 `base_url` 临时改成 `http://localhost:8787`。

---

## 6. 目录结构（本站关键文件）

```
.
├── astro.config.mjs            # site = https://sdhkj.github.io/, base = "/"
├── src/config.ts               # 站点标题、导航、个人信息、主题色
├── src/content/config.ts       # Fuwari 的 Zod schema（CMS 字段以它为准）
├── src/content/posts/          # 文章（只保留 1 篇示例：guide/index.md）
├── public/admin/index.html     # Sveltia CMS 页面
├── public/admin/config.yml     # Sveltia CMS 配置
├── public/admin/sveltia-cms.js # 本地化后的 CMS 脚本（由 pnpm sync:cms 生成，已提交）
├── public/admin/fonts/         # 本地化的 CMS 字体
├── public/images/              # CMS 上传的图片（media_folder）
├── scripts/sync-sveltia-cms.mjs
├── scripts/new-post.js         # 上游的新建文章脚本
├── worker/                     # Cloudflare Worker OAuth 中转（wrangler.toml + src/index.js + README）
└── .github/workflows/deploy.yml
```

---

## 7. 常见问题

**Q：`pnpm install` 报 `ERR_PNPM_SYMLINK_FAILED` 或 `spawn EPERM`？**
A：前者多见于 Windows 上的 symlink 权限问题（开启“开发者模式”，或把项目和 pnpm store 放到同一个盘）；后者是子进程创建被安全软件/沙箱拦了，用管理员终端重试。

**Q：`pnpm build` 报 `spawn EPERM`（栈里有 `optimizeSafeRealPathSync`）？**
A：这是 Vite 在 Windows 上探测网络驱动器时起的子进程被拦，不是代码问题。关闭安全软件/沙箱，或换到普通管理员终端重试。

**Q：`/admin/` 打开是空白页或 404？**
A：确认 `public/admin/index.html` 和 `public/admin/sveltia-cms.js` 都被提交了（脚本有 2.2 MB，别被忽略规则挡住）。构建产物里应有 `dist/admin/index.html` + `dist/admin/sveltia-cms.js`。

**Q：编辑器里代码块没有语法高亮？**
A：Sveltia 的代码高亮引擎是按需从 unpkg 拉取 `@shikijs/*` 的，国内网络可能失败；失败时降级为纯文本，不影响编辑和保存。主程序与字体已完全本地化。

**Q：中文标题生成的文件名是中文，能部署吗？**
A：可以。Git 和 GitHub Pages 都支持 UTF-8 文件名，URL 会被浏览器百分号编码。想用英文文件名，新建文章时改编辑器侧栏的 **Slug** 即可。

**Q：构建报 `published` 相关错误？**
A：检查 frontmatter 里 `published` 是否被写成了带引号的字符串（`published: '2023-09-09'`）。Fuwari 的 schema 是 `z.date()`，必须是**不带引号**的 `published: 2023-09-09`；CMS 的 `date_format`/`format` 已按这个要求配置。

---

## 8. 许可证与致谢

- 本仓库基于 [saicaca/fuwari](https://github.com/saicaca/fuwari)（MIT），原始 [LICENSE](./LICENSE) 已保留。
- `worker/` 下的源码来自 [sveltia/sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth)（MIT），许可证见 `worker/LICENSE.txt`。
- 编辑器为 [Sveltia CMS](https://github.com/sveltia/sveltia-cms)（MIT）。
