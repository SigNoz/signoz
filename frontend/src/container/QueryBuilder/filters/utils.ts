import { HAVING_FILTER_REGEXP } from 'constants/regExp';
import { HavingForm } from 'types/api/queryBuilder/queryBuilderData';

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
