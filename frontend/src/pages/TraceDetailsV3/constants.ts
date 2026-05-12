import { TelemetryFieldKey } from 'types/api/v5/queryRange';

export interface ColorByOption {
	field: TelemetryFieldKey;
	label: string;
}

export const COLOR_BY_OPTIONS: ColorByOption[] = [
	{
		field: {
			name: 'service.name',
			fieldContext: 'resource',
			fieldDataType: 'string',
		},
		label: 'Service',
	},
	{
		field: {
			name: 'service.namespace',
			fieldContext: 'resource',
			fieldDataType: 'string',
		},
		label: 'Namespace',
	},
	{
		field: {
			name: 'host.name',
			fieldContext: 'resource',
			fieldDataType: 'string',
		},
		label: 'Host',
	},
	{
		field: {
			name: 'k8s.node.name',
			fieldContext: 'resource',
			fieldDataType: 'string',
		},
		label: 'Node',
	},
	{
		field: {
			name: 'k8s.container.name',
			fieldContext: 'resource',
			fieldDataType: 'string',
		},
		label: 'Container',
	},
];

export const COLOR_BY_FIELDS: TelemetryFieldKey[] = COLOR_BY_OPTIONS.map(
	(o) => o.field,
);

export const DEFAULT_COLOR_BY_FIELD = COLOR_BY_FIELDS[0];
