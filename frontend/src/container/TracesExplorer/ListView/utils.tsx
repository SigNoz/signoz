import { Link } from 'react-router-dom';
import type { TableColumnsType as ColumnsType } from 'antd';
import { Badge } from '@signozhq/ui/badge';
import { Typography } from '@signozhq/ui/typography';
import { TelemetryFieldKey } from 'api/v5/v5';
import type { TracesTableRow } from 'container/TracesExplorer/TracesTable/getFieldColumn';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import ROUTES from 'constants/routes';
import { buildCompositeKey } from 'container/OptionsMenu/utils';
import { getMs } from 'container/Trace/Filters/Panel/PanelBody/Duration/util';
import { formUrlParams } from 'container/TraceDetail/utils';
import { TimestampInput } from 'hooks/useTimezoneFormatter/useTimezoneFormatter';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import LineClampedText from 'periscope/components/LineClampedText/LineClampedText';
import { ILog } from 'types/api/logs/log';
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

export const getTraceLink = (record: Record<string, unknown>): string => {
	function readId(value: unknown): string {
		if (typeof value === 'string' || typeof value === 'number') {
			return String(value);
		}
		return '';
	}

	const traceId = readId(record.traceID) || readId(record.trace_id);
	const spanId = readId(record.spanID) || readId(record.span_id);

	return `${ROUTES.TRACE}/${traceId}${formUrlParams({
		spanId,
		levelUp: 0,
		levelDown: 0,
	})}`;
};

export const getListColumns = (
	selectedColumns: TelemetryFieldKey[],
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
		selectedColumns.map((props) => {
			const name = props?.name || (props as any)?.key;
			const fieldContext = props?.fieldContext || (props as any)?.type;
			return {
				title: name,
				dataIndex: name,
				key: buildCompositeKey(name, fieldContext),
				width: 145,
				render: (value, item): JSX.Element => {
					if (value === '') {
						return (
							<BlockLink to={getTraceLink(item)} openInNewTab={false}>
								<Typography data-testid={name}>N/A</Typography>
							</BlockLink>
						);
					}

					if (
						name === 'httpMethod' ||
						name === 'responseStatusCode' ||
						name === 'response_status_code' ||
						name === 'http_method'
					) {
						return (
							<BlockLink to={getTraceLink(item)} openInNewTab={false}>
								<Badge data-testid={name} color="sakura" variant="outline">
									{value}
								</Badge>
							</BlockLink>
						);
					}

					if (name === 'durationNano' || name === 'duration_nano') {
						return (
							<BlockLink to={getTraceLink(item)} openInNewTab={false}>
								<Typography data-testid={name}>{getMs(value)}ms</Typography>
							</BlockLink>
						);
					}

					return (
						<BlockLink to={getTraceLink(item)} openInNewTab={false}>
							<Typography data-testid={name}>
								<LineClampedText text={value} lines={3} />
							</Typography>
						</BlockLink>
					);
				},
				responsive: ['md'],
			};
		}) || [];

	return [...initialColumns, ...columns];
};

// Reshapes the query-range list payload into table rows. `id` mirrors span_id so
// TanStack sees genuine row changes on orderBy toggles instead of falling back to
// positional ids; `timestamp` is lifted from the wrapping ListItem.
export const transformSpanRows = (data: QueryDataV3[]): TracesTableRow[] => {
	const list = data[0]?.list;
	if (!list) {
		return [];
	}
	return list.map((item) => {
		const row = item.data as Record<string, unknown>;
		return {
			...row,
			timestamp: item.timestamp,
			id: row.span_id,
		};
	}) as TracesTableRow[];
};
