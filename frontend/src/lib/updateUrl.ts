const updateUrl = (
	routes: string,
	variables: string,
	value: string,
): string => {
	return routes.replace(variables, value);
};

export default updateUrl;
