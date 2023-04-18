import { OPERATORS } from 'constants/queryBuilder';
import { Having } from 'types/api/queryBuilder/queryBuilderData';

export const transformHavingToStringValue = (having: Having[]): string[] => {
	const result: string[] = having.map((item) => {
		const operator = Object.entries(OPERATORS).find(([key]) => key === item.op);

		return `${item.columnName} ${operator ? operator[1] : ''} ${item.value.join(
			' ',
		)}`;
	});

	return result;
};

export const transformFromStringToHaving = (havingStr: string): Having => {
	const [columnName, op, ...value] = havingStr.split(' ');

	const operator = Object.entries(OPERATORS).find(([, value]) => value === op);

	return { columnName, op: operator ? operator[0] : '', value };
};
