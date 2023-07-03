import { SelectProps } from 'antd';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

export const getOptionsFromKeys = (
	keys: BaseAutocompleteData[],
): SelectProps['options'] =>
	keys.map(({ id, key }) => ({
		label: key,
		value: id,
	}));

export const getInitialColumns = (
	initialColumnTitles: string[],
	attributeKeys: BaseAutocompleteData[],
): BaseAutocompleteData[] =>
	initialColumnTitles.reduce((acc, title) => {
		const initialColumn = attributeKeys.find(({ key }) => title === key);

		if (!initialColumn) return acc;

		return [...acc, initialColumn];
	}, [] as BaseAutocompleteData[]);
