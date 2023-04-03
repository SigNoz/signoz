export const separateSearchValue = (
	value: string,
): [string, string, string[]] => {
	const separatedString = value.split(' ');
	const [key, operator, ...result] = separatedString;
	return [key, operator, result];
};
