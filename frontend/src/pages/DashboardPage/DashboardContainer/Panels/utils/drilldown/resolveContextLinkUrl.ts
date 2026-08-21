import { resolveTexts } from 'hooks/dashboard/useContextVariables';

// A literal `%` (e.g. `?name=95%`) isn't valid percent-encoding — fall back to the raw string.
function safeDecodeURIComponent(value: string): string {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

/**
 * Resolves `{{var}}` tokens in a context-link URL. V2-local rather than the shared V1
 * `processContextLinks`, which throws on a literal `%` and drops the whole URL to its template.
 */
export function resolveContextLinkUrl(
	url: string,
	processedVariables: Record<string, string>,
): string {
	const [baseUrl, queryString] = url.split('?');
	const resolvedBase = resolveTexts({ texts: [baseUrl], processedVariables })
		.fullTexts[0];

	if (!queryString) {
		return resolvedBase;
	}

	const resolvedQuery = Array.from(new URLSearchParams(queryString).entries())
		.map(([key, value]) => {
			// Decode twice for double-encoded values; safe so a bad `%` doesn't abort.
			const decoded = safeDecodeURIComponent(safeDecodeURIComponent(value));
			const resolvedValue = resolveTexts({
				texts: [decoded],
				processedVariables,
			}).fullTexts[0];
			return `${encodeURIComponent(key)}=${encodeURIComponent(resolvedValue)}`;
		})
		.join('&');

	return `${resolvedBase}?${resolvedQuery}`;
}
