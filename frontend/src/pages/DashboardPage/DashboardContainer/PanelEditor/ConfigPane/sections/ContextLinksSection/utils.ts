import type { UrlParam } from './types';

// A link URL must be absolute (http/https), root-relative (`/path`), or start with a
// leading `{{var}}/` segment (a variable that resolves to a host/path at click-time).
const CONTEXT_LINK_URL_PATTERN = /^(https?:\/\/|\/|{{.*}}\/)/;

/**
 * Whether the URL is well-formed for a context link. Empty is treated as valid so the
 * editor doesn't nag while a row is still being filled in — emptiness is a separate concern.
 */
export function isValidContextLinkUrl(url: string): boolean {
	if (!url) {
		return true;
	}
	return CONTEXT_LINK_URL_PATTERN.test(url);
}

/** Inserts `variable` into `current` at `cursorPosition`, or appends when it's unknown. */
export function insertVariableAtCursor(
	current: string,
	variable: string,
	cursorPosition?: number,
): string {
	if (cursorPosition === undefined) {
		return current + variable;
	}
	return (
		current.slice(0, cursorPosition) + variable + current.slice(cursorPosition)
	);
}

// Users can type raw `%` into the URL field (e.g. `?q=95%`), which is not valid
// percent-encoding — treat undecodable input as literal text instead of throwing.
function safeDecodeURIComponent(value: string): string {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

// Values may be double-encoded on the wire, so decode twice; a second decode is a
// no-op once nothing is left to unescape, leaving single-encoded values intact.
function decodeForDisplay(value: string): string {
	return safeDecodeURIComponent(safeDecodeURIComponent(value));
}

/** Parses the `?a=b&c=d` query string of a URL into decoded key/value rows. */
export function getUrlParams(url: string): UrlParam[] {
	const [, queryString] = url.split('?');
	if (!queryString) {
		return [];
	}

	const params: UrlParam[] = [];
	queryString.split('&').forEach((pair) => {
		const [key, value] = pair.split('=');
		if (key) {
			params.push({
				key: safeDecodeURIComponent(key),
				value: decodeForDisplay(value || ''),
			});
		}
	});
	return params;
}

/** Rewrites `url`'s query string from `params`, dropping rows with an empty key. */
export function updateUrlWithParams(url: string, params: UrlParam[]): string {
	const [baseUrl] = url.split('?');
	const queryString = params
		.filter((param) => param.key.trim() !== '')
		.map(
			(param) =>
				`${encodeURIComponent(param.key.trim())}=${encodeURIComponent(
					param.value,
				)}`,
		)
		.join('&');

	return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}
