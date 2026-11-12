import type { GlobalToken } from 'antd';

interface Rgba {
	r: number;
	g: number;
	b: number;
	a: number;
}

const HEX_PATTERN = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB_PATTERN =
	/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?\s*\)$/i;

/** Parses the hex and `rgb()`/`rgba()` forms antd emits for its tokens. */
export function parseColor(color: string): Rgba {
	const hex = HEX_PATTERN.exec(color.trim());
	if (hex) {
		const digits =
			hex[1].length <= 4 ? hex[1].replace(/./g, (digit) => digit + digit) : hex[1];
		const channel = (index: number): number =>
			parseInt(digits.slice(index * 2, index * 2 + 2), 16);
		return {
			r: channel(0),
			g: channel(1),
			b: channel(2),
			a: digits.length === 8 ? channel(3) / 255 : 1,
		};
	}
	const rgb = RGB_PATTERN.exec(color.trim());
	if (rgb) {
		return {
			r: Number(rgb[1]),
			g: Number(rgb[2]),
			b: Number(rgb[3]),
			a: rgb[4] === undefined ? 1 : Number(rgb[4]),
		};
	}
	throw new Error(`Unsupported antd token colour: ${color}`);
}

/** TinyColor's `onBackground`: the opaque colour `color` shows over `background`. */
export function blendOnBackground(color: string, background: string): string {
	const fg = parseColor(color);
	const bg = parseColor(background);
	const alpha = fg.a + bg.a * (1 - fg.a);
	const mix = (f: number, b: number): number =>
		Math.round((f * fg.a + b * bg.a * (1 - fg.a)) / alpha);
	return `#${[mix(fg.r, bg.r), mix(fg.g, bg.g), mix(fg.b, bg.b)]
		.map((channel) => channel.toString(16).padStart(2, '0'))
		.join('')}`;
}

/** HSL lightness, 0 to 1. */
export function getLightness(color: string): number {
	const { r, g, b } = parseColor(color);
	return (Math.max(r, g, b) + Math.min(r, g, b)) / 2 / 255;
}

/**
 * The antd tokens periscope components read, as CSS variables. Empty's values
 * repeat the derivations antd's Empty makes from the same tokens.
 */
export function getAntdThemeCssVariables(
	token: GlobalToken,
): Record<string, string> {
	return {
		'--antd-font-family': token.fontFamily,
		'--antd-font-size': `${token.fontSize}px`,
		'--antd-motion-duration-slow': token.motionDurationSlow,
		'--antd-color-link': token.colorLink,
		'--antd-color-link-hover': token.colorLinkHover,
		'--antd-color-link-active': token.colorLinkActive,
		'--antd-color-primary': token.colorPrimary,
		'--antd-color-text': token.colorText,
		'--antd-color-text-description': token.colorTextDescription,
		'--antd-color-text-disabled': token.colorTextDisabled,
		'--antd-color-split': token.colorSplit,
		'--antd-color-border': token.colorBorder,
		'--antd-color-bg-container': token.colorBgContainer,
		'--antd-color-bg-layout': token.colorBgLayout,
		'--antd-empty-image-opacity':
			getLightness(token.colorBgBase) < 0.5 ? '0.65' : '1',
		'--antd-empty-simple-border': blendOnBackground(
			token.colorFill,
			token.colorBgContainer,
		),
		'--antd-empty-simple-shadow': blendOnBackground(
			token.colorFillTertiary,
			token.colorBgContainer,
		),
		'--antd-empty-simple-content': blendOnBackground(
			token.colorFillQuaternary,
			token.colorBgContainer,
		),
	};
}
