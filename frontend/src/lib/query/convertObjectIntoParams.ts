const convertObjectIntoParams = (props: Record<any, any>) => {
	return Object.keys(props)
		.map((e) => `${e}=${props[e]}`)
		.join('&');
};

export default convertObjectIntoParams;
