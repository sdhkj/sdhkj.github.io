/*
 * 浏览器兼容补丁 —— 必须在 sveltia-cms.js 之前加载。
 *
 * 背景（已用 source map + 本地复现证实）：
 *   Sveltia CMS 0.233.1 内置的 @sveltia/utils@0.12.3 在 getHash() 里调用了
 *   `new Uint8Array(digest).toHex()`，而 `Uint8Array.prototype.toHex()` 属于
 *   「Uint8Array to/from base64 and hex」提案（ES2026），只有 V8 13.6 / Chrome 140+
 *   等很新的引擎才自带；整个 2.2 MB 的 bundle 里没有任何 polyfill。
 *
 *   配置加载流程 initCmsConfig() 的最后一步是
 *     cmsConfigVersion.current = await getHash(stringify(config))
 *   这一步抛出的 TypeError 会被 init.js 的 catch 归到
 *     ex.name === 'Error' ? ex.message : _('config.error.unexpected')
 *   于是控制台只留下一个 TypeError（cause 为 undefined），界面则显示「意外错误」，
 *   整站进不了后台 —— 和配置内容无关。
 *
 * 本文件按提案语义补上这四个方法，只在原生缺失时定义，不覆盖原生实现：
 *   Uint8Array.prototype.toHex() / toBase64()
 *   Uint8Array.fromHex() / fromBase64()
 *
 * @see https://github.com/tc39/proposal-arraybuffer-base64
 */
(() => {
	const proto = Uint8Array.prototype;

	if (typeof proto.toHex !== "function") {
		Object.defineProperty(proto, "toHex", {
			value: function toHex() {
				let out = "";
				for (let i = 0; i < this.length; i += 1) {
					out += this[i].toString(16).padStart(2, "0");
				}
				return out;
			},
			writable: true,
			configurable: true,
		});
	}

	if (typeof Uint8Array.fromHex !== "function") {
		Object.defineProperty(Uint8Array, "fromHex", {
			value: function fromHex(string) {
				if (typeof string !== "string" || string.length % 2 !== 0 || /[^0-9a-fA-F]/.test(string)) {
					throw new SyntaxError("Invalid hex string");
				}

				const result = new Uint8Array(string.length / 2);
				for (let i = 0; i < result.length; i += 1) {
					result[i] = Number.parseInt(string.slice(i * 2, i * 2 + 2), 16);
				}
				return result;
			},
			writable: true,
			configurable: true,
		});
	}

	if (typeof proto.toBase64 !== "function") {
		Object.defineProperty(proto, "toBase64", {
			value: function toBase64(options = {}) {
				// 只支持默认字母表与默认 padding；Sveltia 目前不使用这两个方法，留着是为了同一族 API 齐全
				if (options.alphabet && options.alphabet !== "base64") {
					throw new TypeError("Unsupported alphabet");
				}

				let binary = "";
				for (let i = 0; i < this.length; i += 1) {
					binary += String.fromCharCode(this[i]);
				}

				const base64 = btoa(binary);

				return options.omitPadding ? base64.replace(/=+$/, "") : base64;
			},
			writable: true,
			configurable: true,
		});
	}

	if (typeof Uint8Array.fromBase64 !== "function") {
		Object.defineProperty(Uint8Array, "fromBase64", {
			value: function fromBase64(string) {
				const binary = atob(string);
				const result = new Uint8Array(binary.length);
				for (let i = 0; i < binary.length; i += 1) {
					result[i] = binary.charCodeAt(i);
				}
				return result;
			},
			writable: true,
			configurable: true,
		});
	}
})();
