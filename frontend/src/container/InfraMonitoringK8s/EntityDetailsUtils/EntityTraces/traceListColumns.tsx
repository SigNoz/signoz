import { TableColumnsType as ColumnsType, Tag } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { getMs } from 'container/Trace/Filters/Panel/PanelBody/Duration/util';
import {
	BlockLink,
	getTraceLink,
} from 'container/TracesExplorer/ListView/utils';
import dayjs from 'dayjs';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

const keyToLabelMap: Record<string, string> = {
	timestamp: 'Timestamp',
	serviceName: 'Service Name',
	name: 'Name',
	durationNano: 'Duration',
	httpMethod: 'HTTP Method',
	responseStatusCode: 'Status Code',
	spanID: 'Span ID',
	traceID: 'Trace ID',
};

const keyAliases: Record<string, string[]> = {
	serviceName: ['serviceName', 'service.name', 'service_name'],
	durationNano: ['durationNano', 'duration.nano', 'duration_nano'],
	httpMethod: ['httpMethod', 'http.method', 'http_method'],
	responseStatusCode: [
		'response_status_code',
		'response.status.code',
		'responseStatusCode',
	],
	spanID: ['spanID', 'span.id', 'span_id'],
	traceID: ['traceID', 'trace.id', 'trace_id'],
};

const getPrimaryKey = (key: string): string => {
	for (const [primaryKey, aliases] of Object.entries(keyAliases)) {
		if (aliases.includes(key)) {
			return primaryKey;
		}
	}
	return key;
};

const getValueForKey = (data: Record<string, any>, key: string): any => {
	const primaryKey = getPrimaryKey(key);
	const aliases = keyAliases[primaryKey];
	if (aliases) {
		for (const alias of aliases) {
			if (data[alias] !== undefined) {
				return data[alias];
			}
		}
	}
	return data[key];
};

export const getTraceListColumns = (
	selectedColumns: BaseAutocompleteData[],
): ColumnsType<RowData> => {
	const columns: ColumnsType<RowData> =
		selectedColumns.map(({ dataType, key, type }) => ({
			title: keyToLabelMap[getPrimaryKey(key)],
			dataIndex: key,
			key: `${key}-${dataType}-${type}`,
			width: 145,
			render: (value, item): JSX.Element => {
				const itemData = item.data as any;
				const primaryKey = getPrimaryKey(key);

				if (primaryKey === 'timestamp') {
					const date =
						typeof value === 'string'
							? dayjs(value).format(DATE_TIME_FORMATS.ISO_DATETIME_MS)
							: dayjs(value / 1e6).format(DATE_TIME_FORMATS.ISO_DATETIME_MS);

					return (
						<BlockLink to={getTraceLink(itemData)} openInNewTab>
							<Typography.Text>{date}</Typography.Text>
						</BlockLink>
					);
				}

				if (value === '') {
					return (
						<BlockLink to={getTraceLink(itemData)} openInNewTab>
							<Typography data-testid={key}>N/A</Typography>
						</BlockLink>
					);
				}

				if (primaryKey === 'httpMethod' || primaryKey === 'responseStatusCode') {
					return (
						<BlockLink to={getTraceLink(itemData)} openInNewTab>
							<Tag data-testid={key} color="magenta">
								{getValueForKey(itemData, key)}
							</Tag>
						</BlockLink>
					);
				}

				if (primaryKey === 'durationNano') {
					const durationNano = getValueForKey(itemData, key);

					return (
						<BlockLink to={getTraceLink(itemData)} openInNewTab>
							<Typography data-testid={key}>{getMs(durationNano)}ms</Typography>
						</BlockLink>
					);
				}

				return (
					<BlockLink to={getTraceLink(itemData)} openInNewTab>
						<Typography data-testid={key}>{getValueForKey(itemData, key)}</Typography>
					</BlockLink>
				);
			},
			responsive: ['md'],
		})) || [];

	return columns;
};
