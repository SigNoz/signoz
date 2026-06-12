import { Link } from 'react-router-dom';
import type { TableColumnsType as ColumnsType } from 'antd';
import { Badge } from '@signozhq/ui/badge';
import { Typography } from '@signozhq/ui/typography';
import { TelemetryFieldKey } from 'api/v5/v5';
import TanStackTable from 'components/TanStackTableView';
import type { TableColumnDef } from 'components/TanStackTableView/types';
import { getTraceLink } from 'components/Traces/TableView/getTraceLink';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import { buildCompositeKey } from 'container/OptionsMenu/utils';
import { getMs } from 'container/Trace/Filters/Panel/PanelBody/Duration/util';
import { TimestampInput } from 'hooks/useTimezoneFormatter/useTimezoneFormatter';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import LineClampedText from 'periscope/components/LineClampedText/LineClampedText';
import { ILog } from 'types/api/logs/log';
import { QueryDataV3 } from 'types/api/widgets/getQuery';

// `BlockLink`, `getListColumns`, `transformDataWithDate` are kept for legacy
// antd consumers. `getTraceLink` is shared with the TanStack ListView, which
// otherwise uses `make*Col` / `SpanRow` / `transformSpanRows`.

// ---------------------------------------------------------------------------
// Legacy antd consumers
// ---------------------------------------------------------------------------

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

// Re-export for legacy antd consumers (TracesTableComponent, EntityTraces) that
// import from this path. New code should import from
// `components/Traces/TableView/getTraceLink`.

function stringifyCellValue(value: unknown): string {
	if (value == null) {
		return '';
	}
	if (typeof value === 'string') {
		return value;
	}
	if (typeof value === 'number' || typeof value === 'boolean') {
		return String(value);
	}
	return JSON.stringify(value);
}

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

// ---------------------------------------------------------------------------
// TanStack ListView (current)
// ---------------------------------------------------------------------------

// Span row shape for the trace list view. Known intrinsic fields explicit; the
// rest of the row comes from user-selected dynamic columns (selectColumns), hence
// the Record intersection. `timestamp` is added by transformSpanRows from the
// API's wrapping ListItem.timestamp (data itself omits it).
export type SpanRow = {
	trace_id: string;
	span_id: string;
	timestamp: string;
} & Record<string, unknown>;

export const transformSpanRows = (data: QueryDataV3[]): SpanRow[] => {
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
	}) as unknown as SpanRow[];
};

// Field-name allowlists that drive signal-specific cell rendering (kept from the
// pre-TanStack getListColumns). Both legacy camelCase + snake_case variants are
// listed because the API has shipped both over time.
const STATUS_FIELD_NAMES = new Set([
	'httpMethod',
	'http_method',
	'responseStatusCode',
	'response_status_code',
]);
const DURATION_FIELD_NAMES = new Set(['durationNano', 'duration_nano']);

type TimestampFormatter = (
	input: TimestampInput,
	format?: string,
) => string | number;

export function makeTimestampCol(
	formatTimezoneAdjustedTimestamp: TimestampFormatter,
): TableColumnDef<SpanRow> {
	return {
		id: buildCompositeKey('timestamp', 'span'),
		header: 'Timestamp',
		accessorFn: (row): unknown => row.timestamp,
		// Pinned left as a visual anchor during horizontal scroll. Trade-off: the
		// sticky-positioning + cell `overflow: hidden` in TanStackTable.module.scss
		// makes the right-edge resize handle effectively unhittable for pinned
		// columns — accepted.
		pin: 'left',
		canBeHidden: false,
		enableRemove: false,
		width: { default: 170, min: 170 },
		cell: ({ value }): JSX.Element => {
			const ts = value as string | number;
			const formatted =
				typeof ts === 'string'
					? formatTimezoneAdjustedTimestamp(ts, DATE_TIME_FORMATS.ISO_DATETIME_MS)
					: formatTimezoneAdjustedTimestamp(
							ts / 1e6,
							DATE_TIME_FORMATS.ISO_DATETIME_MS,
						);
			return <TanStackTable.Text>{String(formatted)}</TanStackTable.Text>;
		},
	};
}

export function makeListFieldCol(
	f: TelemetryFieldKey,
): TableColumnDef<SpanRow> {
	return {
		id: buildCompositeKey(f.name, f.fieldContext, f.fieldDataType),
		header: f.name,
		accessorFn: (row): unknown => row[f.name],
		enableRemove: true,
		width: { min: 192 },
		cell: ({ value }): JSX.Element => {
			if (value === '' || value == null) {
				return <TanStackTable.Text data-testid={f.name}>N/A</TanStackTable.Text>;
			}
			const text = stringifyCellValue(value);
			if (STATUS_FIELD_NAMES.has(f.name)) {
				return (
					<Badge data-testid={f.name} color="sakura" variant="outline">
						{text}
					</Badge>
				);
			}
			if (DURATION_FIELD_NAMES.has(f.name)) {
				return (
					<TanStackTable.Text data-testid={f.name}>
						{getMs(text)}
						ms
					</TanStackTable.Text>
				);
			}
			return <TanStackTable.Text data-testid={f.name}>{text}</TanStackTable.Text>;
		},
	};
}
