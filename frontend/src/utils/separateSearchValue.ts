import { OPERATORS } from 'constants/queryBuilder';

export const separateSearchValue = (
	value: string,
): [string, string, string[]] => {
	const separatedString = value.split(' ');
	const [key, operator, ...result] = separatedString;
	if (operator === OPERATORS.IN || operator === OPERATORS.NIN) {
		return [key, operator, result];
	}
	return [key, operator, Array(result.join(' '))];
};
