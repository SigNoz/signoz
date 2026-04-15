/**
 * Reads the <base href> injected by the backend at serve time (or by
 * createHtmlPlugin in dev). Returns '/' if no <base> tag is present,
 * which matches root-path deployments with no backend injection.
 *
 * Called once at module init — result is stable for the page lifetime.
 * Exported for testing; consumers should use getBasePath().
 */
export function readBasePath(): string {
	if (typeof document === 'undefined') {
		return '/';
	}
	return document.querySelector('base')?.getAttribute('href') ?? '/';
}

/** @internal Use getBasePath() in application code. */
export const basePath: string = readBasePath();

export function getBasePath(): string {
	return basePath;
}
