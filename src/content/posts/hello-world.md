---
title: 博客开张：Astro + Fuwari + Sveltia CMS By 蓝色大肥鱼
published: 2026-10-10
description: 本站的技术选型与使用说明——Astro + Fuwari 负责渲染，Sveltia CMS 负责在线写作，GitHub Actions 负责自动发布。
tags:
  - Astro
  - Fuwari
  - Sveltia CMS
category: 随笔
draft: false
lang: zh_CN
---

折腾了几天，博客终于开张了。这篇文章既是第一篇内容，也算一份「使用说明」，方便以后忘了怎么写。

## 这个博客是怎么搭的

三件事：

1. [**Astro**](https://astro.build/) —— 静态站点生成器。构建时把所有页面渲染成纯 HTML，没有服务端，所以能免费托管在 GitHub Pages 上，速度也快。
2. [**Fuwari**](https://github.com/saicaca/fuwari) —— 一套 Astro 博客主题（MIT 协议），提供了现在看到的这套布局：卡片式首页、归档页、深浅色切换、主题色、文章目录、基于 Pagefind 的全文搜索。我只做了一点定制。
3. [**Sveltia CMS**](https://sveltiacms.app/) —— 网页版编辑器。它直接读写 GitHub 仓库里的 Markdown 文件，不需要数据库，也不需要服务器。也就是说：\*\*内容本质上就是 Git 仓库里的一堆 `.md` 文件\*\*，CMS 只是一个方便的界面。

发布流程是一条直线：

```plain
在 /admin 写完 → 保存 → CMS 提交到 GitHub 仓库 → GitHub Actions 构建 → GitHub Pages 上线
```

## 怎么在 /admin 写文章

写作入口是 <https://sdhkj.github.io/admin/>，手机上也能用。

1. 打开 `/admin`，用 GitHub 账号登录（或者用 Personal Access Token 登录）。
2. 左侧选择**「文章」**集合，点右上角的 **New 文章**。
3. 填写表单：
    - **标题**：会显示在列表和文章页顶部
    - **发布日期**：注意格式是 `YYYY-MM-DD`
    - **摘要**：列表页和搜索引擎用，尽量写一句完整的话
    - **封面图**：可以先留空，之后再加
    - **标签 / 分类**：标签可以有多个，分类一般一个
    - **草稿**：勾上就不会出现在首页和归档里
    - **正文**：Markdown 编辑器，支持工具栏、粘贴图片、代码块
4. 点 **Save**（或 Publish）。

侧栏里还能改**文件名（Slug）**——它决定了文章的网址，比如文件名 `hello-world` 对应的地址就是：

```plain
https://sdhkj.github.io/posts/hello-world/
```

> 建议用英文短横线做文件名，中文标题也可以，但网址里会出现百分号编码，不太好看。

## 保存之后多久能看到

**大约 1～3 分钟。**

保存成功后 CMS 会把文件提交到仓库的 `main` 分支，这会触发 GitHub Actions 里的 `Deploy to GitHub Pages` 工作流：

- 安装依赖 + 构建站点：约 40～90 秒
- 上传并发布到 GitHub Pages：约 20～40 秒

想确认进度可以打开仓库的 **Actions** 标签页看工作流状态；如果超过 5 分钟还没更新，通常是构建失败了，点进去看日志。

不想等的话，也可以直接在仓库里改 `.md` 文件，效果一样。

## 图片：先能用，以后再换图床

现在在编辑器里插入图片，会保存到仓库的 `public/images/` 目录下（也就是和博客源码放在同一个 Git 仓库里）。

这样做的好处是零成本、零配置；坏处是：

- 图片会和源码一起进 Git 历史，仓库体积越来越大，克隆变慢
- GitHub Pages 对单文件大小和流量都有软限制，不适合当图床

所以图片**先用着，等文章多了、图变大了再换图床**（对象存储 + CDN，或者 Cloudflare R2、）。换成图床之后，Markdown 里的图片地址直接替换成外链即可，不需要改任何代码。

另外，**封面图**（frontmatter 里的 `image` 字段）既可以用 `/images/xxx.png` 这种仓库内的路径，也可以之后换成图床的外链。

## 站点信息也在后台改

站名、签名、头像、主题色、页脚版权名这些，不需要改代码——后台的**「站点设置」**集合对应仓库里的 `src/site-config.json`，改完保存、等一次部署就生效。

## 接下来

先把想写的东西写出来。至于博客本身的折腾——主题微调、评论系统、图床、RSS 之类，慢慢来。

***
