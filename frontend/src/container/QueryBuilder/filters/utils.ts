import { AttributeValuesMap } from 'components/ClientSideQBSearch/ClientSideQBSearch';
import { HAVING_FILTER_REGEXP } from 'constants/regExp';
import { IOption } from 'hooks/useResourceAttribute/types';
import uniqWith from 'lodash-es/unionWith';
import { parse } from 'papaparse';
import { HavingForm } from 'types/api/queryBuilder/queryBuilderData';

import { ORDERBY_FILTERS } from './OrderByFilter/config';
import {
	orderByValueDelimiter,
	splitOrderByFromString,
} from './OrderByFilter/utils';
import { getRemoveOrderFromValue } from './QueryBuilderSearch/utils';

export const handleKeyDownLimitFilter: React.KeyboardEventHandler<HTMLInputElement> = (
	event,
): void => {
	const keyCode = event.keyCode || event.which;
	const isBackspace = keyCode === 8;
	const isNumeric =
		(keyCode >= 48 && keyCode <= 57) || (keyCode >= 96 && keyCode <= 105);

	if (!isNumeric && !isBackspace) {
		event.preventDefault();
	}
};

export const getHavingObject = (currentSearch: string): HavingForm => {
	const textArr = currentSearch.split(' ');
	const [columnName = '', op = '', ...value] = textArr;

	return { columnName, op, value };
};

export const isValidHavingValue = (search: string): boolean => {
	const values = getHavingObject(search).value.join(' ');

	if (values) {
		return HAVING_FILTER_REGEXP.test(values);
	}

	return true;
};

export const getUniqueOrderByValues = (values: IOption[]): IOption[] => {
	const modifiedValues = values.map((item) => {
		const match = parse(item.value, { delimiter: orderByValueDelimiter });
		if (!match) return { label: item.label, value: item.value };
		// eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/no-unused-vars
		const [_, order] = match.data.flat() as string[];
		if (order)
			return {
				label: item.label,
				value: item.value,
			};

		return {
			label: `${item.value} ${ORDERBY_FILTERS.ASC}`,
			value: `${item.value}${orderByValueDelimiter}${ORDERBY_FILTERS.ASC}`,
		};
	});

	return uniqWith(
		modifiedValues,
		(current, next) =>
			getRemoveOrderFromValue(current.value) ===
			getRemoveOrderFromValue(next.value),
	);
};

export const getValidOrderByResult = (result: IOption[]): IOption[] =>
	result.reduce<IOption[]>((acc, item) => {
		if (item.value === ORDERBY_FILTERS.ASC || item.value === ORDERBY_FILTERS.DESC)
			return acc;

		if (
			item.value.includes(ORDERBY_FILTERS.ASC) ||
			item.value.includes(ORDERBY_FILTERS.DESC)
		) {
			const splittedOrderBy = splitOrderByFromString(item.value);

			if (splittedOrderBy) {
				acc.push({
					label: `${splittedOrderBy.columnName} ${splittedOrderBy.order}`,
					value: `${splittedOrderBy.columnName}${orderByValueDelimiter}${splittedOrderBy.order}`,
				});

				return acc;
			}
		}

		acc.push(item);

		return acc;
	}, []);

export const transformKeyValuesToAttributeValuesMap = (
	attributeValuesMap: Record<string, string[] | number[] | boolean[]>,
): AttributeValuesMap =>
	Object.fromEntries(
		Object.entries(attributeValuesMap || {}).map(([key, values]) => [
			key,
			{
				stringAttributeValues:
					typeof values[0] === 'string' ? (values as string[]) : [],
				numberAttributeValues:
					typeof values[0] === 'number' ? (values as number[]) : [],
				boolAttributeValues:
					typeof values[0] === 'boolean' ? (values as boolean[]) : [],
			},
		]),
	);
