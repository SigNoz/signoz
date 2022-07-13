const createQueryParams = (params: { [x: string]: string | number }): string =>
	Object.keys(params)
		.map((k) => `${k}=${encodeURI(String(params[k]))}`)
		.join('&');

export default createQueryParams;
