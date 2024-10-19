import { Tag, Typography } from 'antd';
import { ColumnsType } from 'antd/es/table';
import ROUTES from 'constants/routes';
import { getMs } from 'container/Trace/Filters/Panel/PanelBody/Duration/util';
import { formUrlParams } from 'container/TraceDetail/utils';
import dayjs from 'dayjs';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { Link } from 'react-router-dom';
import { ILog } from 'types/api/logs/log';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { QueryDataV3 } from 'types/api/widgets/getQuery';

function BlockLink({
	children,
	to,
}: {
	children: React.ReactNode;
	to: string;
}): any {
	// Display block to make the whole cell clickable
	return (
		<Link to={to} style={{ display: 'block' }}>
			{children}
		</Link>
	);
}

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
): ColumnsType<RowData> => {
	const initialColumns: ColumnsType<RowData> = [
		{
			dataIndex: 'date',
			key: 'date',
			title: 'Timestamp',
			width: 145,
			render: (value, item): JSX.Element => {
				const date =
					typeof value === 'string'
						? dayjs(value).format('YYYY-MM-DD HH:mm:ss.SSS')
						: dayjs(value / 1e6).format('YYYY-MM-DD HH:mm:ss.SSS');
				return (
					<BlockLink to={getTraceLink(item)}>
						<Typography.Text>{date}</Typography.Text>
					</BlockLink>
				);
			},
		},
	];

	const columns: ColumnsType<RowData> =
		selectedColumns.map(({ dataType, key, type }) => ({
			title: key,
			dataIndex: key,
			key: `${key}-${dataType}-${type}`,
			width: 145,
			render: (value, item): JSX.Element => {
				if (value === '') {
					return (
						<BlockLink to={getTraceLink(item)}>
							<Typography data-testid={key}>N/A</Typography>
						</BlockLink>
					);
				}

				if (key === 'httpMethod' || key === 'responseStatusCode') {
					return (
						<BlockLink to={getTraceLink(item)}>
							<Tag data-testid={key} color="magenta">
								{value}
							</Tag>
						</BlockLink>
					);
				}

				if (key === 'durationNano') {
					return (
						<BlockLink to={getTraceLink(item)}>
							<Typography data-testid={key}>{getMs(value)}ms</Typography>
						</BlockLink>
					);
				}

				return (
					<BlockLink to={getTraceLink(item)}>
						<Typography data-testid={key}>{value}</Typography>
					</BlockLink>
				);
			},
			responsive: ['md'],
		})) || [];

	return [...initialColumns, ...columns];
};
