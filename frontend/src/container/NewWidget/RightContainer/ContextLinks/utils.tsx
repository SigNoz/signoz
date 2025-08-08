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
	try {
		const [, queryString] = url.split('?');

		if (!queryString) {
			return [];
		}

		const paramPairs = queryString.split('&');
		const params: UrlParam[] = [];

		paramPairs.forEach((pair) => {
			try {
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
			} catch (paramError) {
				// Skip malformed parameters and continue processing
				console.warn('Failed to parse URL parameter:', pair, paramError);
			}
		});

		return params;
	} catch (error) {
		console.warn('Failed to parse URL parameters, returning empty array:', error);
		return [];
	}
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
	const urls = contextLinks.map(({ url }) => url);

	// Resolve variables in labels
	const resolvedLabels = resolveTexts({
		texts: labels,
		processedVariables,
		maxLength,
	});

	// Process URLs with proper encoding/decoding
	const finalUrls = urls.map((url) => {
		if (typeof url !== 'string') return url;

		try {
			// 1. Get the URL and extract base URL and query string
			const [baseUrl, queryString] = url.split('?');
			// Resolve variables in base URL.
			const resolvedBaseUrlResult = resolveTexts({
				texts: [baseUrl],
				processedVariables,
			});
			const resolvedBaseUrl = resolvedBaseUrlResult.fullTexts[0];

			if (!queryString) return resolvedBaseUrl;

			// 2. Extract all query params using URLSearchParams
			const searchParams = new URLSearchParams(queryString);
			const processedParams: Record<string, string> = {};

			// 3. Process each parameter
			Array.from(searchParams.entries()).forEach(([key, value]) => {
				// 4. Decode twice to handle double encoding
				let decodedValue = decodeURIComponent(value);
				try {
					const doubleDecoded = decodeURIComponent(decodedValue);
					// Check if double decoding produced a different result
					if (doubleDecoded !== decodedValue) {
						decodedValue = doubleDecoded;
					}
				} catch {
					// If double decoding fails, use single decoded value
				}

				// 5. Pass through resolve text for variable resolution
				const resolvedTextsResult = resolveTexts({
					texts: [decodedValue],
					processedVariables,
				});
				const resolvedValue = resolvedTextsResult.fullTexts[0];

				// 6. Encode the resolved value
				processedParams[key] = encodeURIComponent(resolvedValue);
			});

			// 7. Create new URL with processed parameters
			const newQueryString = Object.entries(processedParams)
				.map(([key, value]) => `${encodeURIComponent(key)}=${value}`)
				.join('&');

			return `${resolvedBaseUrl}?${newQueryString}`;
		} catch (error) {
			console.warn('Failed to process URL, using original URL:', error);
			return url;
		}
	});

	// Return processed context links
	return contextLinks.map((link, index) => ({
		id: link.id,
		label: resolvedLabels.fullTexts[index],
		url: finalUrls[index],
	}));
};

export {
	getInitialValues,
	getUrlParams,
	processContextLinks,
	updateUrlWithParams,
};
