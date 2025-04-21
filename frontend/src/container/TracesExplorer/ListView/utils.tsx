import { Tag, Typography } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import ROUTES from 'constants/routes';
import { getMs } from 'container/Trace/Filters/Panel/PanelBody/Duration/util';
import { formUrlParams } from 'container/TraceDetail/utils';
import { TimestampInput } from 'hooks/useTimezoneFormatter/useTimezoneFormatter';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import LineClampedText from 'periscope/components/LineClampedText/LineClampedText';
import { Link } from 'react-router-dom';
import { ILog } from 'types/api/logs/log';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { QueryDataV3 } from 'types/api/widgets/getQuery';

export function BlockLink({
	children,
	to,
	openInNewTab,
}: {
	children: React.ReactNode;
	to: string;
	openInNewTab: boolean;
}): any {
	// Display block to make the whole cell clickable
	return (
		<Link
			to={to}
			style={{ display: 'block' }}
			target={openInNewTab ? '_blank' : '_self'}
		>
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
	formatTimezoneAdjustedTimestamp: (
		input: TimestampInput,
		format?: string,
	) => string | number,
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
						? formatTimezoneAdjustedTimestamp(
								value,
								DATE_TIME_FORMATS.ISO_DATETIME_MS,
						  )
						: formatTimezoneAdjustedTimestamp(
								value / 1e6,
								DATE_TIME_FORMATS.ISO_DATETIME_MS,
						  );
				return (
					<BlockLink to={getTraceLink(item)} openInNewTab={false}>
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
						<BlockLink to={getTraceLink(item)} openInNewTab={false}>
							<Typography data-testid={key}>N/A</Typography>
						</BlockLink>
					);
				}

				if (key === 'httpMethod' || key === 'responseStatusCode') {
					return (
						<BlockLink to={getTraceLink(item)} openInNewTab={false}>
							<Tag data-testid={key} color="magenta">
								{value}
							</Tag>
						</BlockLink>
					);
				}

				if (key === 'durationNano' || key === 'duration_nano') {
					return (
						<BlockLink to={getTraceLink(item)} openInNewTab={false}>
							<Typography data-testid={key}>{getMs(value)}ms</Typography>
						</BlockLink>
					);
				}

				return (
					<BlockLink to={getTraceLink(item)} openInNewTab={false}>
						<Typography data-testid={key}>
							<LineClampedText text={value} lines={3} />
						</Typography>
					</BlockLink>
				);
			},
			responsive: ['md'],
		})) || [];

	return [...initialColumns, ...columns];
};
