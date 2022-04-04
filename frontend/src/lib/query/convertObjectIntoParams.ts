const convertObjectIntoParams = (
	props: Record<string, unknown>,
	stringify = false,
): string => {
	return Object.keys(props)
		.map(
			(e) =>
				`${e}=${
					stringify ? encodeURIComponent(JSON.stringify(props[e])) : props[e]
				}`,
		)
		.join('&');
};

export default convertObjectIntoParams;
