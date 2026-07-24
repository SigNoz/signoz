import { ICON_URLS, LOGO_URLS } from './iconAssets';

/** Prefix that marks a dashboard `image` as a reference to a bundled system icon. */
export const DASHBOARD_ICON_PATH_PREFIX = '/assets/Icons/';

/** Prefix for a bundled logo (JSON-only; logos are never shown in the picker). */
export const DASHBOARD_LOGO_PATH_PREFIX = '/assets/Logos/';

// Each path prefix maps a reference to the asset map it resolves against.
const PATH_LOOKUPS: { prefix: string; urls: Record<string, string> }[] = [
	{ prefix: DASHBOARD_ICON_PATH_PREFIX, urls: ICON_URLS },
	{ prefix: DASHBOARD_LOGO_PATH_PREFIX, urls: LOGO_URLS },
];

// The curated icons surfaced in the picker. Any other on-disk icon (e.g.
// `/assets/Icons/broom`) still resolves — this list is only what we show.
const SYSTEM_ICON_NAMES = [
	'eight-ball',
	'siren',
	'avocado',
	'bagel',
	'basketball',
	'carousel-horse',
	'cookie',
	'circus-tent',
	'crane',
	'dartboard',
	'drum',
	'bow',
	'cheese',
	'orange',
	'ninja',
	'fries',
	'hamburger',
	'headphones',
	'motorcycle',
	'police-car',
];

/** Logical icon paths for the picker, in display order. */
export const SYSTEM_ICON_PATHS: string[] = SYSTEM_ICON_NAMES.map(
	(name) => `${DASHBOARD_ICON_PATH_PREFIX}${name}`,
);

/** Fallback used when a dashboard's `image` is empty or unrecognized. */
export const DEFAULT_DASHBOARD_ICON_PATH = `${DASHBOARD_ICON_PATH_PREFIX}eight-ball`;

// A base64 image data URI is the only free-form value we render, and only via
// <img> (which never executes embedded SVG scripts). Everything else is rejected.
const BASE64_IMAGE_REGEX =
	/^data:image\/(?:png|jpe?g|gif|webp|avif|svg\+xml);base64,[a-z0-9+/]+={0,2}$/i;

/**
 * Resolves a dashboard `image` value to a usable <img> src. Only three shapes are
 * allowed — a system icon path (`/assets/Icons/<name>`), a logo path
 * (`/assets/Logos/<name>`), each resolving to any matching asset in that folder,
 * or a base64 image data URI — so arbitrary URLs or markup can never reach the
 * DOM. Anything else (and unknown asset names) falls back to the default icon.
 */
export function resolveDashboardImage(image?: string | null): string {
	const fallback = ICON_URLS['eight-ball'] ?? DEFAULT_DASHBOARD_ICON_PATH;
	if (!image) {
		return fallback;
	}
	const lookup = PATH_LOOKUPS.find(({ prefix }) => image.startsWith(prefix));
	if (lookup) {
		return lookup.urls[image.slice(lookup.prefix.length)] ?? fallback;
	}
	if (BASE64_IMAGE_REGEX.test(image)) {
		return image;
	}
	return fallback;
}
