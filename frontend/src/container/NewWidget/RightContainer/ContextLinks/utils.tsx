import { CONTEXT_LINK_FIELDS } from 'container/NewWidget/RightContainer/ContextLinks/constants';
import { ContextLinkProps } from 'types/api/dashboard/getAll';
import { v4 as uuid } from 'uuid';

interface UrlParam {
	key: string;
	value: string;
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

export { getInitialValues, getUrlParams, updateUrlWithParams };
