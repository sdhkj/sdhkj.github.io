#!/usr/bin/env node
/**
 * 从一张源图生成站点 favicon（4 个尺寸，自动处理透明底）。
 *
 * 用法：
 *   node scripts/make-favicons.mjs <源图路径> [--keep-white]
 *   node scripts/make-favicons.mjs public/favicon/冰淇淋.png
 *
 * 做什么：
 * - 输出到 public/favicon/<源图文件名去掉扩展名>/，文件名 favicon-32/128/180/192.png，
 *   由 src/config.ts 的 siteConfig.favicon 引用（改完记得同步那里的路径）。
 * - 如果源图**不是**透明底（四角是白色不透明），会自动把"与边缘相连的白底"变透明
 *   （flood fill，插画内部的白不会挖空）；已经是透明底的就直接裁留白。
 * - 加 --keep-white 可强制保留白底。
 *
 * public/favicon/ 下原有的 favicon-light-*.png / favicon-dark-*.png 不会被改动，随时可回退。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const KEEP_WHITE = process.argv.includes("--keep-white");
const SOURCE = path.resolve(args[0] ?? path.join(root, "public", "favicon", "house.png"));
const OUT_DIR = path.join(root, "public", "favicon", path.basename(SOURCE, path.extname(SOURCE)));
const SIZES = [32, 128, 180, 192];

/** 把与图像边缘连通、且接近白色的像素设为透明（插画内部的白保持不透明） */
async function removeBackground(input) {
	const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
	const { width: w, height: h, channels: ch } = info;
	const isNearWhite = (r, g, b) => r >= 244 && g >= 244 && b >= 244;
	const visited = new Uint8Array(w * h);
	const queue = [];

	const push = (x, y) => {
		if (x < 0 || y < 0 || x >= w || y >= h) return;
		const p = y * w + x;
		if (visited[p]) return;
		const i = p * ch;
		if (!isNearWhite(data[i], data[i + 1], data[i + 2])) return;
		visited[p] = 1;
		queue.push(p);
	};
	for (let x = 0; x < w; x++) {
		push(x, 0);
		push(x, h - 1);
	}
	for (let y = 0; y < h; y++) {
		push(0, y);
		push(w - 1, y);
	}
	for (let head = 0; head < queue.length; head++) {
		const p = queue[head];
		const x = p % w;
		const y = (p - x) / w;
		push(x + 1, y);
		push(x - 1, y);
		push(x, y + 1);
		push(x, y - 1);
	}

	let cleared = 0;
	for (let p = 0; p < visited.length; p++) {
		if (!visited[p]) continue;
		const i = p * ch;
		const minDistance = Math.min(255 - data[i], 255 - data[i + 1], 255 - data[i + 2]);
		const alpha = Math.max(0, Math.min(255, Math.round(minDistance * 3)));
		if (alpha <= 8) {
			data[i + 3] = 0;
			cleared++;
		} else {
			const a = alpha / 255;
			const unpremultiply = (v) => Math.max(0, Math.min(255, Math.round((v - 255 * (1 - a)) / a)));
			data[i] = unpremultiply(data[i]);
			data[i + 1] = unpremultiply(data[i + 1]);
			data[i + 2] = unpremultiply(data[i + 2]);
			data[i + 3] = alpha;
		}
	}
	const buffer = await sharp(data, { raw: { width: w, height: h, channels: ch } }).png().toBuffer();
	return { buffer, cleared, total: w * h };
}

/** 判断四角是否都是不透明白（= 白底图），用来决定要不要抠底 */
async function hasOpaqueWhiteCorners(file) {
	const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
	const { width: w, height: h, channels: ch } = info;
	const corners = [
		[0, 0],
		[w - 1, 0],
		[0, h - 1],
		[w - 1, h - 1],
	];
	return corners.every(([x, y]) => {
		const i = (y * w + x) * ch;
		return data[i] >= 244 && data[i + 1] >= 244 && data[i + 2] >= 244 && data[i + 3] > 200;
	});
}

if (!fs.existsSync(SOURCE)) {
	console.error(`源图不存在: ${SOURCE}`);
	process.exit(1);
}

await fs.promises.mkdir(OUT_DIR, { recursive: true });
const meta = await sharp(SOURCE).metadata();
if (meta.width !== meta.height) {
	console.warn(`[warn] 源图不是正方形（${meta.width}x${meta.height}），将按 contain 居中缩放`);
}
console.log(`源图: ${path.relative(root, SOURCE)} ${meta.width}x${meta.height} alpha=${meta.hasAlpha}`);

let source = SOURCE;
const whiteBackground = !KEEP_WHITE && (await hasOpaqueWhiteCorners(SOURCE));
if (KEEP_WHITE) {
	console.log("[mode] --keep-white：保留白底");
} else if (whiteBackground) {
	const { buffer, cleared, total } = await removeBackground(SOURCE);
	const tmp = path.join(OUT_DIR, ".source-transparent.png");
	await fs.promises.writeFile(tmp, buffer);
	source = tmp;
	console.log(`[mode] 检测到白底 → 透明化，清除背景像素 ${cleared}/${total}（${((100 * cleared) / total).toFixed(1)}%）`);
} else {
	console.log("[mode] 源图已是透明底，跳过抠底");
}

for (const size of SIZES) {
	const out = path.join(OUT_DIR, `favicon-${size}.png`);
	await sharp(source)
		.trim({ background: { r: 255, g: 255, b: 255, alpha: 0 }, threshold: 1 })
		.resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
		.png({ compressionLevel: 9 })
		.toFile(out);
	const m = await sharp(out).metadata();
	console.log(
		`wrote ${path.relative(root, out)} ${m.width}x${m.height} (${(await fs.promises.stat(out)).size} bytes, alpha=${m.hasAlpha})`,
	);
}

if (source !== SOURCE) await fs.promises.rm(source, { force: true });
console.log(`完成。请确认 src/config.ts 的 siteConfig.favicon 指向 /favicon/${path.basename(OUT_DIR)}/`);
