export const getQueryString = (
	availableParams: string[],
	params: URLSearchParams,
): string[] =>
	availableParams.map((param) => {
		if (params.has(param)) {
			return `${param}=${params.get(param)}`;
		}
		return '';
	});

/**
 * @deprecated This should be removed after https://github.com/SigNoz/engineering-pod/issues/5322 is done
 */
export const buildNavUrl = (key: string, queryString: string[]): string => {
	if (key.includes('?')) {
		const extra = queryString.filter(Boolean).join('&');
		return extra ? `${key}&${extra}` : key;
	}
	return `${key}?${queryString.join('&')}`;
};
