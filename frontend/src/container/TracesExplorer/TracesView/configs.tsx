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
 * POC: hardcoded Trace View column registry.
 * Mirrors the AI O11y TDD whitelist — backend returns all columns; FE only
 * toggles visibility client-side (no selectFields). Extra keys render blank
 * until the AI query-range response lands.
 */
export const TRACE_VIEW_COLUMN_REGISTRY: TelemetryFieldKey[] = [
	{ name: 'service.name', fieldContext: 'resource', fieldDataType: 'string' },
	{ name: 'name', fieldContext: 'span', fieldDataType: 'string' },
	{ name: 'duration_nano', fieldContext: 'span', fieldDataType: 'int64' },
	{ name: 'span_count', fieldContext: 'trace', fieldDataType: 'int64' },
	{ name: 'trace_id', fieldContext: 'span', fieldDataType: 'string' },
	// gen_ai-scoped (filterable / orderable once AI API lands)
	{ name: 'input_tokens', fieldContext: 'trace', fieldDataType: 'int64' },
	{ name: 'output_tokens', fieldContext: 'trace', fieldDataType: 'int64' },
	{ name: 'total_tokens', fieldContext: 'trace', fieldDataType: 'int64' },
	{ name: 'llm_call_count', fieldContext: 'trace', fieldDataType: 'int64' },
	{ name: 'tool_call_count', fieldContext: 'trace', fieldDataType: 'int64' },
	{ name: 'distinct_tool_count', fieldContext: 'trace', fieldDataType: 'int64' },
	{ name: 'estimated_cost_usd', fieldContext: 'trace', fieldDataType: 'float64' },
	{ name: 'max_llm_latency_ns', fieldContext: 'trace', fieldDataType: 'int64' },
	{ name: 'last_activity_time', fieldContext: 'trace', fieldDataType: 'int64' },
	// display-only
	{ name: 'start_time', fieldContext: 'trace', fieldDataType: 'int64' },
	{ name: 'end_time', fieldContext: 'trace', fieldDataType: 'int64' },
	{ name: 'trace_duration_nano', fieldContext: 'trace', fieldDataType: 'int64' },
	{ name: 'error_count', fieldContext: 'trace', fieldDataType: 'int64' },
	{ name: 'root_span_name', fieldContext: 'trace', fieldDataType: 'string' },
	{ name: 'input', fieldContext: 'trace', fieldDataType: 'string' },
	{ name: 'output', fieldContext: 'trace', fieldDataType: 'string' },
];

export const DEFAULT_TRACE_VIEW_COLUMNS: string[] = [
	'service.name',
	'name',
	'duration_nano',
	'span_count',
	'trace_id',
];

const COLUMN_TITLE_MAP: Record<string, string> = {
	'service.name': 'Root Service Name',
	name: 'Root Operation Name',
	duration_nano: 'Root Duration (in ms)',
	span_count: 'No of Spans',
	trace_id: 'TraceID',
	input_tokens: 'Input Tokens',
	output_tokens: 'Output Tokens',
	total_tokens: 'Total Tokens',
	llm_call_count: 'LLM Calls',
	tool_call_count: 'Tool Calls',
	distinct_tool_count: 'Distinct Tools',
	estimated_cost_usd: 'Est. Cost (USD)',
	max_llm_latency_ns: 'Max LLM Latency',
	last_activity_time: 'Last Activity',
	start_time: 'Start Time',
	end_time: 'End Time',
	trace_duration_nano: 'Trace Duration',
	error_count: 'Errors',
	root_span_name: 'Root Span Name',
	input: 'Input',
	output: 'Output',
};

function renderCellValue(name: string, value: unknown): JSX.Element {
	if (value === undefined || value === null || value === '') {
		return <Typography>—</Typography>;
	}

	if (name === 'duration_nano' || name === 'trace_duration_nano') {
		return <Typography>{getMs(String(value))}ms</Typography>;
	}

	if (name === 'trace_id') {
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

	return <Typography>{String(value)}</Typography>;
}

/** Build antd columns for the currently visible registry keys. */
export function getTraceViewColumns(
	visibleKeys: string[],
): ColumnsType<ListItem['data']> {
	const keySet = new Set(visibleKeys);

	return TRACE_VIEW_COLUMN_REGISTRY.filter((field) => keySet.has(field.name)).map(
		(field) => ({
			title: COLUMN_TITLE_MAP[field.name] ?? field.name,
			dataIndex: field.name,
			key: field.name,
			render: (value: unknown): JSX.Element => renderCellValue(field.name, value),
		}),
	);
}

/** @deprecated Prefer getTraceViewColumns(visibleKeys) — kept for import compat. */
export const columns: ColumnsType<ListItem['data']> = getTraceViewColumns(
	DEFAULT_TRACE_VIEW_COLUMNS,
);
