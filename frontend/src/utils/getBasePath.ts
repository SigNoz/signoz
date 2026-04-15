/**
 * Returns the base path for this SigNoz deployment by reading the
 * `<base href>` element injected into index.html by the Go backend at
 * serve time.
 *
 * Always returns a string ending with `/` (e.g. `/`, `/signoz/`).
 * Falls back to `/` when no `<base>` element is present so the app
 * behaves correctly in local Vite dev and unit-test environments.
 *
 * @internal — consume through `src/lib/history` and the axios interceptor;
 * do not read `<base>` directly anywhere else in the codebase.
 */
export function getBasePath(): string {
	const href = document.querySelector('base')?.getAttribute('href') ?? '/';
	// Trailing slash is required for relative asset resolution and API prefixing.
	return href.endsWith('/') ? href : `${href}/`;
}
