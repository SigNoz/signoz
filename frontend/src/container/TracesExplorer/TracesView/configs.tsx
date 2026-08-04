import { generatePath, Link } from 'react-router-dom';
import type { TableColumnsType as ColumnsType } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import ROUTES from 'constants/routes';
import { getMs } from 'container/Trace/Filters/Panel/PanelBody/Duration/util';
import { DEFAULT_PER_PAGE_OPTIONS } from 'hooks/queryPagination';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';
import { ListItem } from 'types/api/widgets/getQuery';

export const PER_PAGE_OPTIONS: number[] = [10, ...DEFAULT_PER_PAGE_OPTIONS];

/**
 * One Trace View column: the telemetry field it reads, its header, and how the
 * cell renders. Callers own their column sets — Trace View has no knowledge of
 * any particular product's columns.
 */
export interface TraceViewColumn {
	field: TelemetryFieldKey;
	title: string;
	/** Defaults to `renderTraceCellValue`. */
	render?: (value: unknown) => JSX.Element;
}

function isBlank(value: unknown): boolean {
	return value === undefined || value === null || value === '';
}

/** Fallback cell: em dash when empty, otherwise stringified. */
export function renderTraceCellValue(value: unknown): JSX.Element {
	if (isBlank(value)) {
		return <Typography>—</Typography>;
	}
	return <Typography>{String(value)}</Typography>;
}

/** Nanosecond duration rendered as milliseconds. */
export function renderTraceDurationCell(value: unknown): JSX.Element {
	if (isBlank(value)) {
		return <Typography>—</Typography>;
	}
	return <Typography>{getMs(String(value))}ms</Typography>;
}

function renderTraceIdCell(value: unknown): JSX.Element {
	if (isBlank(value)) {
		return <Typography>—</Typography>;
	}
	return (
		<Link
			to={generatePath(ROUTES.TRACE_DETAIL, {
				id: String(value),
			})}
			data-testid="trace-id"
		>
			{String(value)}
		</Link>
	);
}

/**
 * The root-span columns Trace View renders when the caller configures no
 * column selection. Matches the pre-selection behaviour exactly.
 */
export const BASE_TRACE_VIEW_COLUMNS: TraceViewColumn[] = [
	{
		field: {
			name: 'service.name',
			fieldContext: 'resource',
			fieldDataType: 'string',
		},
		title: 'Root Service Name',
	},
	{
		field: { name: 'name', fieldContext: 'span', fieldDataType: 'string' },
		title: 'Root Operation Name',
	},
	{
		field: {
			name: 'duration_nano',
			fieldContext: 'span',
			fieldDataType: 'int64',
		},
		title: 'Root Duration (in ms)',
		render: renderTraceDurationCell,
	},
	{
		field: { name: 'span_count', fieldContext: 'trace', fieldDataType: 'int64' },
		title: 'No of Spans',
	},
	{
		field: { name: 'trace_id', fieldContext: 'span', fieldDataType: 'string' },
		title: 'TraceID',
		render: renderTraceIdCell,
	},
];

/** Build antd columns, preserving the order given. */
export function buildTraceViewColumns(
	columns: TraceViewColumn[],
): ColumnsType<ListItem['data']> {
	return columns.map(({ field, title, render }) => ({
		title,
		dataIndex: field.name,
		key: field.name,
		render: (value: unknown): JSX.Element =>
			(render ?? renderTraceCellValue)(value),
	}));
}
