import { OPERATORS } from 'constants/queryBuilder';

export const separateSearchValue = (
	value: string,
): [string, string, string[]] => {
	const [key, operator, ...result] = value.split(' ');
	if (operator === OPERATORS.IN || operator === OPERATORS.NIN) {
		return [key, operator, result];
	}
	return [key, operator, Array(result.join(' '))];
};
