export const ALLOWED_ASSET_EXTENSIONS = [
	'.svg',
	'.png',
	'.webp',
	'.jpg',
	'.jpeg',
	'.gif',
];

/**
 * Returns true if the string ends with an asset extension.
 * e.g. "/Icons/foo.svg" → true, "/Icons/foo.svg.bak" → false
 */
export function hasAssetExtension(str) {
	if (typeof str !== 'string') return false;
	return ALLOWED_ASSET_EXTENSIONS.some((ext) => str.endsWith(ext));
}

// Like hasAssetExtension but also matches mid-string with boundary check,
// e.g. "/foo.svg?v=1" → true, "/icons.svg-dir/" → true (- is non-alphanumeric boundary)
export function containsAssetExtension(str) {
	if (typeof str !== 'string') return false;
	return ALLOWED_ASSET_EXTENSIONS.some((ext) => {
		const idx = str.indexOf(ext);
		if (idx === -1) return false;
		const afterIdx = idx + ext.length;
		// Broad boundary (any non-alphanumeric) is intentional — the real guard against
		// false positives is the upstream conditions (isAbsolutePath, isRelativePublicDir, etc.)
		// that must pass before this is reached. "/icons.svg-dir/" → true (- is a boundary).
		return afterIdx >= str.length || /[^a-zA-Z0-9]/.test(str[afterIdx]);
	});
}

/**
 * Extracts the asset path from a CSS url() wrapper.
 * Handles single quotes, double quotes, unquoted, and whitespace variations.
 * e.g.
 *   "url('/Icons/foo.svg')" → "/Icons/foo.svg"
 *   "url( '../assets/bg.png' )" → "../assets/bg.png"
 *   "url(/Icons/foo.svg)" → "/Icons/foo.svg"
 * Returns null if the string is not a url() wrapper.
 */
export function extractUrlPath(str) {
	if (typeof str !== 'string') return null;
	// Match url( [whitespace] [quote?] path [quote?] [whitespace] )
	// Capture group: [^'")\s]+ matches path until quote, closing paren, or whitespace
	const match = str.match(/^url\(\s*['"]?([^'")\s]+)['"]?\s*\)$/);
	return match ? match[1] : null;
}

/**
 * Returns true if the string is an absolute path (starts with /).
 * Absolute paths in url() bypass <base href> and fail under any URL prefix.
 */
export function isAbsolutePath(str) {
	if (typeof str !== 'string') return false;
	return str.startsWith('/') && !str.startsWith('//');
}

/**
 * Returns true if the path imports from the public/ directory.
 * Relative imports into public/ cause asset duplication in dist/.
 */
export function isPublicRelative(str) {
	if (typeof str !== 'string') return false;
	return str.includes('/public/') || str.startsWith('public/');
}

/**
 * Returns true if the string is a relative reference into a known public-dir folder.
 * e.g. "Icons/foo.svg", `Logos/aws-dark.svg`, "Images/bg.png"
 * These bypass Vite's module pipeline even without a leading slash.
 */
export const PUBLIC_DIR_SEGMENTS = ['Icons/', 'Images/', 'Logos/', 'svgs/'];

export function isRelativePublicDir(str) {
	if (typeof str !== 'string') return false;
	return PUBLIC_DIR_SEGMENTS.some((seg) => str.startsWith(seg));
}

/**
 * Returns true if an asset import path is valid (goes through Vite's module pipeline).
 * Valid: @/assets/..., any relative path containing /assets/, or node_modules packages.
 * Invalid: absolute paths, public/ dir, or relative paths outside src/assets/.
 */
export function isValidAssetImport(str) {
	if (typeof str !== 'string') return false;
	if (str.startsWith('@/assets/')) return true;
	if (str.includes('/assets/')) return true;
	// Not starting with . or / means it's a node_modules package — always valid
	if (!str.startsWith('.') && !str.startsWith('/')) return true;
	return false;
}

/**
 * Returns true if the string is an external URL.
 * Used to avoid false positives on CDN/API URLs with asset extensions.
 */
export function isExternalUrl(str) {
	if (typeof str !== 'string') return false;
	return (
		str.startsWith('http://') ||
		str.startsWith('https://') ||
		str.startsWith('//')
	);
}
