import { CONTEXT_LINK_FIELDS } from 'container/NewWidget/RightContainer/ContextLinks/constants';
import { resolveTexts } from 'hooks/dashboard/useContextVariables';
import { ContextLinkProps } from 'types/api/dashboard/getAll';
import { v4 as uuid } from 'uuid';

// Configuration for variable source types
export const VARIABLE_SOURCE_CONFIG = {
	TIMESTAMP: {
		label: 'Global timestamp',
	},
	QUERY: {
		label: 'Query variable',
	},
	GLOBAL: {
		label: 'Global variable',
	},
	DASHBOARD: {
		label: 'Dashboard variable',
	},
} as const;

interface ContextVariable {
	name: string;
	source?: string;
}

interface TransformedVariable {
	name: string;
	source: string;
}

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

/**
 * Transforms context variables into the format expected by VariablesDropdown
 * @param variables - Array of context variables from useContextVariables
 * @returns Array of transformed variables with proper source descriptions
 */
export const transformContextVariables = (
	variables: ContextVariable[],
): TransformedVariable[] => {
	const groupedVars: { [key: string]: TransformedVariable[] } = {};

	// Process variables array from useContextVariables
	variables.forEach((variable) => {
		let source = VARIABLE_SOURCE_CONFIG.DASHBOARD.label as string; // Default to dashboard

		// Check if it's a timestamp variable (special case - use name-based detection)
		if (variable.name.toLowerCase().includes('timestamp')) {
			source = VARIABLE_SOURCE_CONFIG.TIMESTAMP.label;
		}
		// Use the actual source property from the variable
		else if (variable.source === 'global') {
			source = VARIABLE_SOURCE_CONFIG.GLOBAL.label;
		} else if (variable.source === 'custom') {
			source = VARIABLE_SOURCE_CONFIG.QUERY.label;
		} else if (variable.source === 'dashboard') {
			source = VARIABLE_SOURCE_CONFIG.DASHBOARD.label;
		}

		// Group variables by source
		if (!groupedVars[source]) {
			groupedVars[source] = [];
		}

		groupedVars[source].push({
			name: variable.name,
			source,
		});
	});

	// Flatten the grouped variables to maintain source grouping order
	const allVars: TransformedVariable[] = [];

	// Add variables in the order we want them to appear
	const sourceOrder = [
		VARIABLE_SOURCE_CONFIG.TIMESTAMP.label,
		VARIABLE_SOURCE_CONFIG.GLOBAL.label,
		VARIABLE_SOURCE_CONFIG.QUERY.label,
		VARIABLE_SOURCE_CONFIG.DASHBOARD.label,
	];

	sourceOrder.forEach((source) => {
		if (groupedVars[source]) {
			allVars.push(...groupedVars[source]);
		}
	});

	return allVars;
};

export {
	getInitialValues,
	getUrlParams,
	processContextLinks,
	updateUrlWithParams,
};
