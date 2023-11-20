import { OPERATORS } from 'constants/queryBuilder';
import { Having } from 'types/api/queryBuilder/queryBuilderData';

export const transformHavingToStringValue = (having: Having[]): string[] => {
	const result: string[] = having.map((item) => {
		const operator = Object.entries(OPERATORS).find(([key]) => key === item.op);
		const value = Array.isArray(item.value) ? item.value.join(', ') : item.value;

		return `${item.columnName} ${operator ? operator[1] : ''} ${value}`;
	});

	return result;
};

export const transformFromStringToHaving = (havingStr: string): Having => {
	const [columnName, op, ...values] = havingStr.split(' ');

	const operator = Object.entries(OPERATORS).find(([, value]) => value === op);

	const currentValue = values.reduce<number[]>((acc, strNum) => {
		const num = parseFloat(strNum);
		if (Number.isNaN(num)) {
			return acc;
		}

		return [...acc, num];
	}, []);

	return {
		columnName,
		op: operator ? operator[0] : '',
		value: currentValue.length > 1 ? currentValue : currentValue[0],
	};
};
