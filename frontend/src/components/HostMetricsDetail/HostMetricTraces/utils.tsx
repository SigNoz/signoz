import { Tag, Typography } from 'antd';
import { ColumnsType } from 'antd/es/table';
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
};

export const getListColumns = (
	selectedColumns: BaseAutocompleteData[],
): ColumnsType<RowData> => {
	const columns: ColumnsType<RowData> =
		selectedColumns.map(({ dataType, key, type }) => ({
			title: keyToLabelMap[key],
			dataIndex: key,
			key: `${key}-${dataType}-${type}`,
			width: 145,
			render: (value, item): JSX.Element => {
				const itemData = item.data as any;

				if (key === 'timestamp') {
					const date =
						typeof value === 'string'
							? dayjs(value).format(DATE_TIME_FORMATS.ISO_DATETIME_MS)
							: dayjs(value / 1e6).format(DATE_TIME_FORMATS.ISO_DATETIME_MS);

					return (
						<BlockLink to={getTraceLink(item)} openInNewTab>
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

				if (key === 'httpMethod' || key === 'responseStatusCode') {
					return (
						<BlockLink to={getTraceLink(itemData)} openInNewTab>
							<Tag data-testid={key} color="magenta">
								{itemData[key]}
							</Tag>
						</BlockLink>
					);
				}

				if (key === 'durationNano') {
					const durationNano = itemData[key];

					return (
						<BlockLink to={getTraceLink(item)} openInNewTab>
							<Typography data-testid={key}>{getMs(durationNano)}ms</Typography>
						</BlockLink>
					);
				}

				return (
					<BlockLink to={getTraceLink(itemData)} openInNewTab>
						<Typography data-testid={key}>{itemData[key]}</Typography>
					</BlockLink>
				);
			},
			responsive: ['md'],
		})) || [];

	return columns;
};
