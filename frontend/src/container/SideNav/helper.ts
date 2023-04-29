export const getQueryString = (
	avialableParams: string[],
	params: URLSearchParams,
): string[] =>
	avialableParams.map((param) => {
		if (params.has(param)) {
			return `${param}=${params.get(param)}`;
		}
		return '';
	});
