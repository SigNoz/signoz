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

// Composite identity for a column. Disambiguates same-name fields across
// different fieldContexts (e.g. resource.service.name vs attribute.service.name).
// Falls back to bare name when context is missing.
export const buildCompositeKey = (name: string, context?: string): string =>
	context ? `${context}.${name}` : name;
