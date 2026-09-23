// Read once at module init — avoids a DOM query on every axios request.
const _basePath: string = ((): string => {
	const href = document.querySelector('base')?.getAttribute('href') ?? '/';
	return href.endsWith('/') ? href : `${href}/`;
})();

/** Returns the runtime base path — always trailing-slashed. e.g. "/" or "/signoz/" */
export function getBasePath(): string {
	return _basePath;
}

/**
 * Prepends the base path to an internal absolute path.
 * Idempotent and safe to call on any value.
 *
 *   withBasePath('/logs')         → '/signoz/logs'
 *   withBasePath('/signoz/logs')  → '/signoz/logs'  (already prefixed)
 *   withBasePath('https://x.com') → 'https://x.com' (external, passthrough)
 */
export function withBasePath(path: string): string {
	if (!path.startsWith('/')) {
		return path;
	}
	if (_basePath === '/') {
		return path;
	}
	if (path.startsWith(_basePath) || path === _basePath.slice(0, -1)) {
		return path;
	}
	return _basePath + path.slice(1);
}

/**
 * Inverse of withBasePath — turns a real browser pathname into an app path.
 * Idempotent and safe to call on any value.
 *
 *   stripBasePath('/signoz/logs') → '/logs'
 *   stripBasePath('/logs')        → '/logs'  (already stripped)
 *   stripBasePath('/signoz')      → '/'      (the base path itself)
 *
 * Needed once the router owns the basename: history@5 has no `basename` option,
 * so raw-history reads come back basename-included.
 */
export function stripBasePath(path: string): string {
	if (!path.startsWith('/')) {
		return path;
	}
	if (_basePath === '/') {
		return path;
	}
	if (path === _basePath || path === _basePath.slice(0, -1)) {
		return '/';
	}
	if (path.startsWith(_basePath)) {
		return path.slice(_basePath.length - 1);
	}
	return path;
}

/**
 * Full absolute URL — for copy-to-clipboard and window.open calls.
 * getAbsoluteUrl(ROUTES.LOGS_EXPLORER) → 'https://host/signoz/logs/logs-explorer'
 */
export function getAbsoluteUrl(path: string): string {
	// oxlint-disable-next-line signoz/no-raw-absolute-path
	return window.location.origin + withBasePath(path);
}

/**
 * Origin + base path without trailing slash — for sending to the backend
 * as frontendBaseUrl in invite / password-reset email flows.
 * getBaseUrl() → 'https://host/signoz'
 */
export function getBaseUrl(): string {
	// oxlint-disable-next-line signoz/no-raw-absolute-path
	const origin = window.location.origin;
	return origin + (_basePath === '/' ? '' : _basePath.slice(0, -1));
}
