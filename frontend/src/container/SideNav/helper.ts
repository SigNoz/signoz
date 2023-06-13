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
