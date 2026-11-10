import { CUSTOM_INK } from './presets';

interface Channels {
	r: number;
	g: number;
	b: number;
	a: number;
}

const HEX_PATTERN = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

export function isHexColor(color: string): boolean {
	return HEX_PATTERN.test(color);
}

/**
 * Splits `#rgb`, `#rgba`, `#rrggbb` and `#rrggbbaa` — shorthand digits double,
 * and a form without an alpha channel is opaque. `undefined` for anything else.
 */
export function parseHex(color: string): Channels | undefined {
	if (!isHexColor(color)) {
		return undefined;
	}
	const hex = color.slice(1);
	const short = hex.length <= 4;
	const step = short ? 1 : 2;
	const channel = (index: number): number => {
		const digits = hex.slice(index * step, index * step + step);
		return parseInt(short ? digits + digits : digits, 16);
	};
	return {
		r: channel(0),
		g: channel(1),
		b: channel(2),
		a: hex.length === 4 || hex.length === 8 ? channel(3) / 255 : 1,
	};
}

/** The uppercase 6-digit form used as the preset lookup key. */
export function normalizeHex(color: string): string | undefined {
	const channels = parseHex(color);
	if (!channels) {
		return undefined;
	}
	const pad = (value: number): string =>
		value.toString(16).padStart(2, '0').toUpperCase();
	return `#${pad(channels.r)}${pad(channels.g)}${pad(channels.b)}`;
}

/** The colour at a given alpha; the source's own alpha is ignored. */
export function rgbaFromHex(color: string, alpha: number): string | undefined {
	const channels = parseHex(color);
	if (!channels) {
		return undefined;
	}
	return `rgba(${channels.r}, ${channels.g}, ${channels.b}, ${alpha})`;
}

/** WCAG 2.1 relative luminance; alpha is ignored. */
export function relativeLuminance(color: string): number {
	const channels = parseHex(color);
	if (!channels) {
		return 0;
	}
	const linear = ([channels.r, channels.g, channels.b] as const).map((value) => {
		const srgb = value / 255;
		return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

/** WCAG 2.1 contrast ratio, 1 to 21. */
export function contrastRatio(foreground: string, background: string): number {
	const a = relativeLuminance(foreground);
	const b = relativeLuminance(background);
	return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export const MIN_CONTRAST_RATIO = 4.5;

/** Whichever fixed ink contrasts further, so a custom colour needs none of its own. */
export function inkForSurface(surface: string): string {
	return contrastRatio(CUSTOM_INK.light, surface) >=
		contrastRatio(CUSTOM_INK.dark, surface)
		? CUSTOM_INK.light
		: CUSTOM_INK.dark;
}

export function meetsContrast(surface: string, ink: string): boolean {
	return contrastRatio(ink, surface) >= MIN_CONTRAST_RATIO;
}
