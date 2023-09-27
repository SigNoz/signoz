import { IOption } from 'hooks/useResourceAttribute/types';
import { IBuilderFormula } from 'types/api/queryBuilder/queryBuilderData';

import { SIGNOZ_VALUE } from '../../OrderByFilter/constants';
import { orderByValueDelimiter } from '../../OrderByFilter/utils';

export const transformToOrderByStringValuesByFormula = (
	formula: IBuilderFormula,
): IOption[] => {
	const prepareSelectedValue: IOption[] =
		formula?.orderBy?.map((item) => {
			if (item.columnName === SIGNOZ_VALUE) {
				return {
					label: `${formula.expression} ${item.order}`,
					value: `${item.columnName}${orderByValueDelimiter}${item.order}`,
				};
			}

			return {
				label: `${item.columnName} ${item.order}`,
				value: `${item.columnName}${orderByValueDelimiter}${item.order}`,
			};
		}) || [];

	return prepareSelectedValue;
};
