import { isInNInOperator } from 'container/QueryBuilder/filters/QueryBuilderSearch/utils';

export const separateSearchValue = (
	value: string,
): [string, string, string[]] => {
	const separatedString = value.split(' ');
	const [key, operator, ...result] = separatedString;
	if (isInNInOperator(operator)) {
		return [key, operator, result];
	}
	return [key, operator, Array(result.join(' '))];
};
