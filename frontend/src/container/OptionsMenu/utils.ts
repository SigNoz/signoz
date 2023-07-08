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
