const createQueryParams = (params: { [x: string]: string }): string =>
	Object.keys(params)
		.map((k) => `${k}=${encodeURI(params[k])}`)
		.join('&');

export default createQueryParams;
