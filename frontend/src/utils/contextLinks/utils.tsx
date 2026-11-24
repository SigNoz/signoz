import { resolveTexts } from 'hooks/dashboard/useContextVariables';
import { ContextLinkProps } from 'types/api/widgets/widget';

interface ProcessedContextLink {
	id: string;
	label: string;
	url: string;
}

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
		if (typeof url !== 'string') {
			return url;
		}

		try {
			// 1. Get the URL and extract base URL and query string
			const [baseUrl, queryString] = url.split('?');
			// Resolve variables in base URL.
			const resolvedBaseUrlResult = resolveTexts({
				texts: [baseUrl],
				processedVariables,
			});
			const resolvedBaseUrl = resolvedBaseUrlResult.fullTexts[0];

			if (!queryString) {
				return resolvedBaseUrl;
			}

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

export { processContextLinks };
