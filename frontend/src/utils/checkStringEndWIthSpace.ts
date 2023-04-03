export const checkStringEndWIthSpace = (str: string): boolean => {
	const endSpace = / $/;
	return endSpace.test(str);
};
