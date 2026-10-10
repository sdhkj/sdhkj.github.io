# Cloudflare Worker：Sveltia CMS 的 GitHub OAuth 中转

这个目录是给 Sveltia CMS 做 OAuth 中转的 Cloudflare Worker，用来让 `https://sdhkj.github.io/admin/`
上的编辑器能「Sign In with GitHub」。

- `src/index.js`：逐字来自 [sveltia/sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth) 的 `src/index.js`（MIT），只多了一个说明用的注释头。无第三方依赖。
- `wrangler.toml`：部署配置（Worker 名称、`compatibility_date`、`ALLOWED_DOMAINS`）。
- `package.json`：只声明 `wrangler` 作为 devDependency。

> **它不是必须的。** 如果你只是想自己一个人写博客，可以直接在 CMS 登录页用
> 「Sign In with Token」+ 一个 GitHub fine-grained PAT（Contents: Read and write）登录，
> 同时把根目录 `public/admin/config.yml` 里的 `backend.base_url` 注释掉。
> 只有需要让**非技术用户 / 多人**用 GitHub 账号登录时，才值得部署这个 Worker。

## 部署步骤

```powershell
# 0. 进入本目录并安装 wrangler
cd E:\project\codeProject\ds_blog\worker
pnpm install
npx wrangler login          # 浏览器授权 Cloudflare 账号

# 1. 先确定 Worker 地址
#    wrangler.toml 里 name = "sveltia-cms-auth"
#    -> https://sveltia-cms-auth.<你的 workers.dev 子域>.workers.dev

# 2. 到 https://github.com/settings/applications/new 注册 OAuth App
#    Authorization callback URL 必须是：https://sveltia-cms-auth.<子域>.workers.dev/callback
#    记下 Client ID，并生成 Client Secret

# 3. 写入密钥（不要写进 wrangler.toml）
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET

# 4. 部署
npx wrangler deploy
```

部署完成后，把打印出来的 Worker 地址填回根目录的 `public/admin/config.yml`：

```yaml
backend:
  name: github
  repo: sdhkj/sdhkj.github.io
  branch: main
  base_url: https://sveltia-cms-auth.<你的子域>.workers.dev
```

然后 `git add public/admin/config.yml && git commit && git push`。

## 环境变量

| 变量 | 必需 | 说明 |
| --- | --- | --- |
| `GITHUB_CLIENT_ID` | ✅ | GitHub OAuth App 的 Client ID，用 `wrangler secret put` 写入 |
| `GITHUB_CLIENT_SECRET` | ✅ | GitHub OAuth App 的 Client Secret，用 `wrangler secret put` 写入 |
| `GITHUB_HOSTNAME` | ❌ | 仅在 GitHub Enterprise Server 时需要，默认 `github.com` |
| `ALLOWED_DOMAINS` | 建议 | 逗号分隔的域名白名单（支持 `*.example.com` 通配），既防盗用也防止别站拿到 token。已写在 `wrangler.toml` 的 `[vars]` 中 |

`ALLOWED_DOMAINS` 里保留 `cms.netlify.com` 的原因：Sveltia 从 `localhost` 发起登录时，
上报的 `site_id` 是 `cms.netlify.com`（上游 `auth.js` 的行为），要本地调试 OAuth 登录就得带上它。

## 本地调试

```powershell
npx wrangler dev            # 默认 http://localhost:8787
```

把 `config.yml` 的 `base_url` 临时改成 `http://localhost:8787` 即可调试。

## 请求路径

| 路径 | 作用 |
| --- | --- |
| `GET /auth`（别名 `/oauth/authorize`） | 生成 CSRF state 写进 cookie，302 到 GitHub 授权页 |
| `GET /callback`（别名 `/oauth/redirect`） | 校验 state，用 `code` 换 `access_token`，postMessage 给 CMS 窗口 |

其他路径返回 404。

## 许可证

MIT，许可证副本见同目录 [LICENSE.txt](./LICENSE.txt)。
上游仓库：<https://github.com/sveltia/sveltia-cms-auth>
