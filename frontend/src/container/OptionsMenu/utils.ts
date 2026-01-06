import { SelectProps } from 'antd';
import { TelemetryFieldKey } from 'api/v5/v5';

export const buildAttributeKey = (k: TelemetryFieldKey): string =>
	`${k?.name || ''}::${k?.fieldContext || ''}::${k?.fieldDataType || ''}`;

export const getOptionsFromKeys = (
	keys: TelemetryFieldKey[],
	selectedKeys: string[],
): SelectProps['options'] => {
	const options = keys.map((k) => ({
		label: k.name,
		value: buildAttributeKey(k),
	}));

	return options.filter(
		({ value }) => !selectedKeys.find((key) => key === value),
	);
};

export const parseAttributeKey = (
	key: string,
): {
	name: string;
	fieldContext: string;
	fieldDataType: string;
} => {
	const [name = '', fieldContext = '', fieldDataType = ''] = key.split('::');
	return { name, fieldContext, fieldDataType };
};
