const convertObjectIntoParams = (
	props: Record<any, any>,
	stringify = false,
) => {
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
