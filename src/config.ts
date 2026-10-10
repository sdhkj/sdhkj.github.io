import siteConfigData from "./site-config.json";
import type {
	ExpressiveCodeConfig,
	LicenseConfig,
	NavBarConfig,
	ProfileConfig,
	SiteConfig,
} from "./types/config";
import { LinkPreset } from "./types/config";

/*
 * 面向访客、经常要改的站点信息集中在 ./site-config.json，
 * 可以在博客后台 /admin 的「站点设置」里直接编辑（见 public/admin/config.yml 的 settings）。
 *
 * 这里只保留需要写代码/带类型约束的字段：lang、banner、toc、favicon、license、expressiveCode。
 * 改完 src/site-config.json 后本地跑 `pnpm dev` 或 `pnpm build` 即可生效。
 */

export const siteConfig: SiteConfig = {
	title: siteConfigData.title,
	subtitle: siteConfigData.subtitle,
	lang: "zh_CN", // Language code, e.g. 'en', 'zh_CN', 'ja', etc.
	themeColor: {
		hue: siteConfigData.themeColorHue, // Default hue for the theme color, from 0 to 360. e.g. red: 0, teal: 200, cyan: 250, pink: 345
		fixed: false, // Hide the theme color picker for visitors
	},
	banner: {
		enable: false,
		src: "assets/images/demo-banner.png", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
		position: "center", // Equivalent to object-position, only supports 'top', 'center', 'bottom'. 'center' by default
		credit: {
			enable: false, // Display the credit text of the banner image
			text: "", // Credit text to be displayed
			url: "", // (Optional) URL link to the original artwork or artist's page
		},
	},
	toc: {
		enable: true, // Display the table of contents on the right side of the post
		depth: 2, // Maximum heading depth to show in the table, from 1 to 3
	},
	favicon: [
		// Leave this array empty to use the default favicon
		// {
		//   src: '/favicon/icon.png',    // Path of the favicon, relative to the /public directory
		//   theme: 'light',              // (Optional) Either 'light' or 'dark', set only if you have different favicons for light and dark mode
		//   sizes: '32x32',              // (Optional) Size of the favicon, set only if you have favicons of different sizes
		// }
	],
};

export const navBarConfig: NavBarConfig = {
	links: [
		LinkPreset.Home,
		LinkPreset.Archive,
		LinkPreset.About,
		{
			name: "GitHub",
			url: siteConfigData.githubUrl, // Internal links should not include the base path, as it is automatically added
			external: true, // Show an external link icon and will open in a new tab
		},
	],
};

export const profileConfig: ProfileConfig = {
	// 头像：相对 /src 的路径（会被 Astro 图片管线处理），以 "/" 开头则是 /public 下的路径，
	// 也可以直接写 http(s) 外链。
	avatar: siteConfigData.avatar,
	name: siteConfigData.authorName, // 侧栏名字、页脚版权名、meta author
	bio: siteConfigData.bio,
	links: [
		{
			name: "GitHub",
			icon: "fa6-brands:github",
			url: siteConfigData.githubUrl,
		},
	],
};

export const licenseConfig: LicenseConfig = {
	enable: true,
	name: "CC BY-NC-SA 4.0",
	url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};

export const expressiveCodeConfig: ExpressiveCodeConfig = {
	// Note: Some styles (such as background color) are being overridden, see the astro.config.mjs file.
	// Please select a dark theme, as this blog theme currently only supports dark background color
	theme: "github-dark",
};
