import { Tag, Typography } from 'antd';
import { ColumnsType } from 'antd/es/table';
import ROUTES from 'constants/routes';
import { getMs } from 'container/Trace/Filters/Panel/PanelBody/Duration/util';
import { formUrlParams } from 'container/TraceDetail/utils';
import dayjs from 'dayjs';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { ILog } from 'types/api/logs/log';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { OrderByPayload } from 'types/api/queryBuilder/queryBuilderData';
import { QueryDataV3 } from 'types/api/widgets/getQuery';

export const transformDataWithDate = (
	data: QueryDataV3[],
): Omit<ILog, 'timestamp'>[] =>
	data[0]?.list?.map(({ data, timestamp }) => ({ ...data, date: timestamp })) ||
	[];

export const getTraceLink = (record: RowData): string =>
	`${ROUTES.TRACE}/${record.traceID}${formUrlParams({
		spanId: record.spanID,
		levelUp: 0,
		levelDown: 0,
	})}`;

export const getListColumns = (
	selectedColumns: BaseAutocompleteData[],
	orderByFromQuery?: OrderByPayload[],
): ColumnsType<RowData> => {
	const initialColumns: ColumnsType<RowData> = [
		{
			dataIndex: 'date',
			key: 'date',
			title: 'Timestamp',
			width: 145,
			render: (item): JSX.Element => {
				const date =
					typeof item === 'string'
						? dayjs(item).format('YYYY-MM-DD HH:mm:ss.SSS')
						: dayjs(item / 1e6).format('YYYY-MM-DD HH:mm:ss.SSS');
				return <Typography.Text>{date}</Typography.Text>;
			},
			sorter: true,
			sortOrder: (orderByFromQuery || [])?.map((order) => {
				console.log(order);
				if (order.columnName === 'timestamp') {
					return order.order === 'asc' ? 'ascend' : 'descend';
				}
				return undefined;
			})?.[0],
		},
	];

	const columns: ColumnsType<RowData> =
		// eslint-disable-next-line sonarjs/cognitive-complexity
		selectedColumns.map(({ dataType, key, type }) => ({
			title: key,
			dataIndex: key,
			key: `${key}-${dataType}-${type}`,
			width: 145,
			render: (value): JSX.Element => {
				if (value === '') {
					return <Typography data-testid={key}>N/A</Typography>;
				}

				if (key === 'httpMethod' || key === 'responseStatusCode') {
					return (
						<Tag data-testid={key} color="magenta">
							{value}
						</Tag>
					);
				}

				if (key === 'durationNano') {
					return <Typography data-testid={key}>{getMs(value)}ms</Typography>;
				}

				return <Typography data-testid={key}>{value}</Typography>;
			},
			responsive: ['md'],
			sorter: key === 'durationNano' ? true : undefined,
			sortOrder:
				key === 'durationNano'
					? (orderByFromQuery || [])?.map((order) => {
							console.log(order);
							if (order.columnName === 'durationNano') {
								return order.order === 'asc' ? 'ascend' : 'descend';
							}
							return undefined;
					  })?.[0]
					: undefined,
		})) || [];

	return [...initialColumns, ...columns];
};
