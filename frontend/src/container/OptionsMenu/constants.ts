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
		fieldDataType: 'string',
		isIndexed: false,
		key: 'log.timestamp:string',
		displayName: 'Timestamp',
	},
	{
		name: 'body',
		signal: 'logs',
		fieldContext: 'log',
		fieldDataType: 'string',
		isIndexed: false,
		key: 'log.body:string',
		displayName: 'Body',
	},
];

export const defaultTraceSelectedColumns: TelemetryFieldKey[] = [
	{
		name: 'service.name',
		signal: 'traces',
		fieldContext: 'resource',
		fieldDataType: 'string',
		key: 'resource.service.name:string',
		displayName: 'Service Name',
	},
	{
		name: 'name',
		signal: 'traces',
		fieldContext: 'span',
		fieldDataType: 'string',
		key: 'span.name:string',
		displayName: 'Span Name',
	},
	{
		name: 'duration_nano',
		signal: 'traces',
		fieldContext: 'span',
		fieldDataType: 'number',
		key: 'span.duration_nano:number',
		displayName: 'Duration',
	},
	{
		name: 'http_method',
		signal: 'traces',
		fieldContext: 'span',
		fieldDataType: 'string',
		key: 'span.http_method:string',
		displayName: 'HTTP Method',
	},
	{
		name: 'response_status_code',
		signal: 'traces',
		fieldContext: 'span',
		fieldDataType: 'string',
		key: 'span.response_status_code:string',
		displayName: 'Status Code',
	},
	{
		name: 'timestamp',
		signal: 'traces',
		fieldContext: 'span',
		fieldDataType: 'string',
		key: 'span.timestamp:string',
		displayName: 'Timestamp',
	},
];
