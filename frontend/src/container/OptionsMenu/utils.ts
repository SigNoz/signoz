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

// Composite column id. Disambiguates same-name fields by `context` and `dataType`
// (e.g. attribute.http.status_code ships as both number and string). Each arg
// is appended only when truthy. `dataType` is optional — logs callers stay on
// the 2-arg form until parity lands.
export const buildCompositeKey = (
	name: string,
	context?: string,
	dataType?: string,
): string => {
	const withContext = context ? `${context}.${name}` : name;
	return dataType ? `${withContext}.${dataType}` : withContext;
};
