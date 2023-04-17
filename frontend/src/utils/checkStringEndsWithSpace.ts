export const checkStringEndsWithSpace = (str: string): boolean => {
	const endSpace = / $/;
	return endSpace.test(str);
};
