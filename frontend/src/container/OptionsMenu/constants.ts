import { TelemetryFieldKey } from 'api/v5/v5';

import { FontSize, OptionsQuery } from './types';

export const URL_OPTIONS = 'options';

export const defaultOptionsQuery: OptionsQuery = {
	selectColumns: [],
	maxLines: 2,
	format: 'raw',
	fontSize: FontSize.SMALL,
};

export const defaultLogsSelectedColumns: TelemetryFieldKey[] = [
	{
		name: 'timestamp',
		signal: 'logs',
		fieldContext: 'log',
		fieldDataType: '',
		isIndexed: false,
	},
	{
		name: 'body',
		signal: 'logs',
		fieldContext: 'log',
		fieldDataType: '',
		isIndexed: false,
	},
];

export const defaultTraceSelectedColumns: TelemetryFieldKey[] = [
	{
		name: 'service.name',
		signal: 'traces',
		fieldContext: 'resource',
		fieldDataType: 'string',
	},
	{
		name: 'name',
		signal: 'traces',
		fieldContext: 'span',
		fieldDataType: 'string',
	},
	{
		name: 'duration_nano',
		signal: 'traces',
		fieldContext: 'span',
		fieldDataType: '',
	},
	{
		name: 'http_method',
		signal: 'traces',
		fieldContext: 'span',
		fieldDataType: '',
	},
	{
		name: 'response_status_code',
		signal: 'traces',
		fieldContext: 'span',
		fieldDataType: '',
	},
];
