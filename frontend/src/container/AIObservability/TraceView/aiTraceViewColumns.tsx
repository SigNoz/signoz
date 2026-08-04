import { Typography } from '@signozhq/ui/typography';
import { LOCALSTORAGE } from 'constants/localStorage';
import {
	BASE_TRACE_VIEW_COLUMNS,
	renderTraceDurationCell,
	TraceViewColumn,
} from 'container/TracesExplorer/TracesView/configs';
import { TraceViewColumnSelection } from 'container/TracesExplorer/TracesView/useTraceViewColumns';

function isBlank(value: unknown): boolean {
	return value === undefined || value === null || value === '';
}

function renderCountCell(value: unknown): JSX.Element {
	if (isBlank(value)) {
		return <Typography>—</Typography>;
	}
	const count = Number(value);
	return (
		<Typography>
			{Number.isFinite(count) ? count.toLocaleString() : String(value)}
		</Typography>
	);
}

function renderCostCell(value: unknown): JSX.Element {
	if (isBlank(value)) {
		return <Typography>—</Typography>;
	}
	const cost = Number(value);
	return (
		<Typography>
			{Number.isFinite(cost) ? `$${cost.toFixed(4)}` : String(value)}
		</Typography>
	);
}

/**
 * Trace-level gen_ai aggregates. The query-range response does not carry these
 * yet, so they render as em dashes until the AI trace API lands — visible but
 * empty is intentional, it lets the column set be reviewed ahead of the data.
 */
const AI_ONLY_COLUMNS: TraceViewColumn[] = [
	{
		field: {
			name: 'input_tokens',
			fieldContext: 'trace',
			fieldDataType: 'int64',
		},
		title: 'Input Tokens',
		render: renderCountCell,
	},
	{
		field: {
			name: 'output_tokens',
			fieldContext: 'trace',
			fieldDataType: 'int64',
		},
		title: 'Output Tokens',
		render: renderCountCell,
	},
	{
		field: {
			name: 'total_tokens',
			fieldContext: 'trace',
			fieldDataType: 'int64',
		},
		title: 'Total Tokens',
		render: renderCountCell,
	},
	{
		field: {
			name: 'llm_call_count',
			fieldContext: 'trace',
			fieldDataType: 'int64',
		},
		title: 'LLM Calls',
		render: renderCountCell,
	},
	{
		field: {
			name: 'tool_call_count',
			fieldContext: 'trace',
			fieldDataType: 'int64',
		},
		title: 'Tool Calls',
		render: renderCountCell,
	},
	{
		field: {
			name: 'distinct_tool_count',
			fieldContext: 'trace',
			fieldDataType: 'int64',
		},
		title: 'Distinct Tools',
		render: renderCountCell,
	},
	{
		field: {
			name: 'estimated_cost_usd',
			fieldContext: 'trace',
			fieldDataType: 'float64',
		},
		title: 'Est. Cost (USD)',
		render: renderCostCell,
	},
	{
		field: {
			name: 'max_llm_latency_ns',
			fieldContext: 'trace',
			fieldDataType: 'int64',
		},
		title: 'Max LLM Latency',
		render: renderTraceDurationCell,
	},
	{
		field: {
			name: 'last_activity_time',
			fieldContext: 'trace',
			fieldDataType: 'int64',
		},
		title: 'Last Activity',
	},
	{
		field: { name: 'start_time', fieldContext: 'trace', fieldDataType: 'int64' },
		title: 'Start Time',
	},
	{
		field: { name: 'end_time', fieldContext: 'trace', fieldDataType: 'int64' },
		title: 'End Time',
	},
	{
		field: {
			name: 'trace_duration_nano',
			fieldContext: 'trace',
			fieldDataType: 'int64',
		},
		title: 'Trace Duration',
		render: renderTraceDurationCell,
	},
	{
		field: { name: 'error_count', fieldContext: 'trace', fieldDataType: 'int64' },
		title: 'Errors',
		render: renderCountCell,
	},
	{
		field: {
			name: 'root_span_name',
			fieldContext: 'trace',
			fieldDataType: 'string',
		},
		title: 'Root Span Name',
	},
	{
		field: { name: 'input', fieldContext: 'trace', fieldDataType: 'string' },
		title: 'Input',
	},
	{
		field: { name: 'output', fieldContext: 'trace', fieldDataType: 'string' },
		title: 'Output',
	},
];

export const AI_TRACE_VIEW_COLUMNS: TraceViewColumn[] = [
	...BASE_TRACE_VIEW_COLUMNS,
	...AI_ONLY_COLUMNS,
];

/**
 * Hand this to `<TracesView columnSelection={…} />` to get the AI column set
 * plus the Options → Edit columns picker. Module-level so its identity is
 * stable across renders.
 */
export const AI_TRACE_VIEW_COLUMN_SELECTION: TraceViewColumnSelection = {
	columns: AI_TRACE_VIEW_COLUMNS,
	storageKey: LOCALSTORAGE.AI_TRACE_VIEW_COLUMNS,
	defaultVisible: BASE_TRACE_VIEW_COLUMNS.map((column) => column.field.name),
};
