import { SelectProps } from 'antd';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

export const getOptionsFromKeys = (
	keys: BaseAutocompleteData[],
	selectedKeys: (string | undefined)[],
): SelectProps['options'] => {
	const options = keys.map(({ id, key }) => ({
		label: key,
		value: id,
	}));

	return options.filter(
		({ value }) => !selectedKeys.find((key) => key === value),
	);
};

export const getInitialColumns = (
	initialColumnTitles: string[],
	attributeKeys: BaseAutocompleteData[],
): BaseAutocompleteData[] =>
	initialColumnTitles.reduce((acc, title) => {
		const initialColumn = attributeKeys.find(({ key }) => title === key);

		if (!initialColumn) return acc;

		return [...acc, initialColumn];
	}, [] as BaseAutocompleteData[]);
