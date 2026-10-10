/**
 * 把 @sveltia/cms 的浏览器 bundle 同步到 public/admin/sveltia-cms.js，
 * 并把 bundle 内指向 cdn.jsdelivr.net 的字体 URL 重写成 public/admin/fonts/ 下的本地文件。
 *
 * 为什么要这么做：Sveltia 官方推荐从 unpkg/jsdelivr 加载脚本和字体，但这两个 CDN
 * 在国内网络下经常不可用（本机实测 cdn.jsdelivr.net 直接 SSL 失败），本地化后
 * /admin 页面完全不依赖外部 CDN。
 *
 * 用法：pnpm run sync:cms
 * 说明：bundle 里还有两类运行时可选资源仍走 CDN，缺失时会优雅降级，不影响编辑与保存：
 *   1. https://unpkg.com/@shikijs/{langs,themes} —— Markdown 编辑器里代码块的语法高亮；
 *   2. https://unpkg.com/@sveltia/ui/.../shiki-engine.js —— 同上。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceBundle = path.join(rootDir, "node_modules/@sveltia/cms/dist/sveltia-cms.js");
const adminDir = path.join(rootDir, "public/admin");
const targetBundle = path.join(adminDir, "sveltia-cms.js");
const fontsDir = path.join(adminDir, "fonts");

if (!fs.existsSync(sourceBundle)) {
	console.error(
		"[sync:cms] 找不到 node_modules/@sveltia/cms/dist/sveltia-cms.js，请先执行 `pnpm install`。已保留现有文件。",
	);
	process.exit(0);
}

fs.mkdirSync(adminDir, { recursive: true });

let code = fs.readFileSync(sourceBundle, "utf8");
const cdnUrls = code.match(/https:\/\/cdn\.jsdelivr\.net\/fontsource\/fonts\/[^"')\s]+\.woff2/g) ?? [];
const missingPackages = new Set();
let localizedFonts = 0;

// 形如 https://cdn.jsdelivr.net/fontsource/fonts/source-sans-3:vf@5.3.0/latin-wght-normal.woff2
//       https://cdn.jsdelivr.net/fontsource/fonts/noto-mono@5.3.0/latin-400-normal.woff2
const FONT_URL_RE =
	/https:\/\/cdn\.jsdelivr\.net\/fontsource\/fonts\/([^/"'@]+)(?:@[^/"']+)?\/([^/"']+\.woff2)/g;

fs.mkdirSync(fontsDir, { recursive: true });

code = code.replace(FONT_URL_RE, (url, fontId, fileName) => {
	// `:vf` 后缀表示可变字体，对应 @fontsource-variable/<name> 包
	const isVariable = fontId.endsWith(":vf");
	const baseName = isVariable ? fontId.slice(0, -3) : fontId;
	const packageName = isVariable
		? `@fontsource-variable/${baseName}`
		: `@fontsource/${baseName}`;
	const filesDir = path.join(rootDir, "node_modules", ...packageName.split("/"), "files");

	if (!fs.existsSync(filesDir)) {
		missingPackages.add(packageName);
		return url;
	}

	// CDN 上的文件名（如 latin-wght-normal.woff2）是 npm 包内文件名的后缀，
	// 加上包名/字体名做前缀后各包之间不会重名。
	const match = fs.readdirSync(filesDir).find((name) => name.endsWith(`-${fileName}`));

	if (!match) {
		missingPackages.add(packageName);
		return url;
	}

	fs.copyFileSync(path.join(filesDir, match), path.join(fontsDir, match));
	localizedFonts += 1;

	return `/admin/fonts/${match}`;
});

fs.writeFileSync(targetBundle, code, "utf8");

const size = (fs.statSync(targetBundle).size / 1024 / 1024).toFixed(2);
const remaining = code.match(/https:\/\/unpkg\.com\/@(?:shikijs|sveltia\/ui)[^"'`)\s]*/g) ?? [];

console.log(`[sync:cms] 已写入 public/admin/sveltia-cms.js（${size} MB）`);
console.log(
	`[sync:cms] 字体 URL：共 ${cdnUrls.length} 处，本地化 ${localizedFonts} 处，` +
		`仍指向 CDN ${cdnUrls.length - localizedFonts} 处`,
);
if (missingPackages.size) {
	console.warn(
		`[sync:cms] 缺少字体包（对应字体仍走 jsdelivr）：${[...missingPackages].join(", ")}\n` +
			`[sync:cms] 需要时执行：pnpm add -D ${[...missingPackages].join(" ")}`,
	);
}
console.log(
	`[sync:cms] 仍走 unpkg 的可选资源（代码块语法高亮，缺失时降级） ${remaining.length} 处`,
);
