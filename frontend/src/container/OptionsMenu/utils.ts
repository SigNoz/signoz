import { SelectProps } from 'antd';
import { TelemetryFieldKey } from 'api/v5/v5';

export const getOptionsFromKeys = (
	keys: TelemetryFieldKey[],
	selectedKeys: (string | undefined)[],
): SelectProps['options'] => {
	const options = keys.map(({ name }) => ({
		label: name,
		value: name,
	}));

	return options.filter(
		({ value }) => !selectedKeys.find((key) => key === value),
	);
};

export const buildCompositeKey = (
	name: string,
	context?: string,
	dataType?: string,
): string => {
	const withContext = context ? `${context}:${name}` : name;
	return dataType ? `${withContext}:${dataType}` : withContext;
};
