import { CONTEXT_LINK_FIELDS } from 'container/NewWidget/RightContainer/ContextLinks/constants';
import { resolveTexts } from 'hooks/dashboard/useContextVariables';
import { ContextLinkProps } from 'types/api/dashboard/getAll';
import { v4 as uuid } from 'uuid';

interface UrlParam {
	key: string;
	value: string;
}

interface ProcessedContextLink {
	id: string;
	label: string;
	url: string;
}

const getInitialValues = (
	contextLink: ContextLinkProps | null,
): Record<string, string> => ({
	[CONTEXT_LINK_FIELDS.ID]: contextLink?.id || uuid(),
	[CONTEXT_LINK_FIELDS.LABEL]: contextLink?.label || '',
	[CONTEXT_LINK_FIELDS.URL]: contextLink?.url || '',
});

const getUrlParams = (url: string): UrlParam[] => {
	const [, queryString] = url.split('?');

	if (!queryString) {
		return [];
	}

	const paramPairs = queryString.split('&');
	const params: UrlParam[] = [];

	paramPairs.forEach((pair) => {
		const [key, value] = pair.split('=');
		if (key) {
			const decodedKey = decodeURIComponent(key);
			const decodedValue = decodeURIComponent(value || '');

			// Double decode the value for display
			let displayValue = decodedValue;
			try {
				// Try to double decode if it looks like it was double encoded
				const doubleDecoded = decodeURIComponent(decodedValue);
				// Check if double decoding produced a different result
				if (doubleDecoded !== decodedValue) {
					displayValue = doubleDecoded;
				}
			} catch {
				// If double decoding fails, use single decoded value
				displayValue = decodedValue;
			}

			params.push({
				key: decodedKey,
				value: displayValue,
			});
		}
	});

	return params;
};

const updateUrlWithParams = (url: string, params: UrlParam[]): string => {
	// Get base URL without query parameters
	const [baseUrl] = url.split('?');

	// Create query parameter string from current parameters
	const validParams = params.filter((param) => param.key.trim() !== '');
	const queryString = validParams
		.map(
			(param) =>
				`${encodeURIComponent(param.key.trim())}=${encodeURIComponent(
					param.value,
				)}`,
		)
		.join('&');

	// Construct final URL
	return queryString ? `${baseUrl}?${queryString}` : baseUrl;
};

// Utility function to process context links with variable resolution and URL encoding
const processContextLinks = (
	contextLinks: ContextLinkProps[],
	processedVariables: Record<string, string>,
	maxLength?: number,
): ProcessedContextLink[] => {
	// Extract all labels and URLs for batch processing
	const labels = contextLinks.map(({ label }) => label);
	const urls = contextLinks.map(({ url }) => {
		// First decode the URL safely (handle double encoding)
		let decodedUrl = decodeURIComponent(url);

		// Try to double decode if it looks like it was double encoded
		try {
			const doubleDecoded = decodeURIComponent(decodedUrl);
			// Check if double decoding produced a different result
			if (doubleDecoded !== decodedUrl) {
				decodedUrl = doubleDecoded;
			}
		} catch {
			// If double decoding fails, use single decoded value
			// decodedUrl remains as is
		}

		return decodedUrl;
	});

	// Resolve variables in labels and URLs
	const resolvedLabels = resolveTexts({
		texts: labels,
		processedVariables,
		maxLength,
	});

	const resolvedUrls = resolveTexts({
		texts: urls,
		processedVariables,
		// No maxLength for URLs as they need to be complete
	});

	// Re-encode the resolved URLs to ensure proper URL formatting
	const finalUrls = resolvedUrls.fullTexts.map((url) => {
		if (typeof url !== 'string') return url;

		// Parse the URL and re-encode parameter values
		const [baseUrl, queryString] = url.split('?');
		if (!queryString) return url;

		const encodedParams = queryString
			.split('&')
			.map((param) => {
				const [key, value] = param.split('=');
				if (!key) return param;
				return `${encodeURIComponent(key)}=${encodeURIComponent(value || '')}`;
			})
			.join('&');

		return `${baseUrl}?${encodedParams}`;
	});

	// Return processed context links
	return contextLinks.map((link, index) => ({
		id: link.id,
		label: resolvedLabels.fullTexts[index] as string,
		url: finalUrls[index] as string,
	}));
};

export {
	getInitialValues,
	getUrlParams,
	processContextLinks,
	updateUrlWithParams,
};
