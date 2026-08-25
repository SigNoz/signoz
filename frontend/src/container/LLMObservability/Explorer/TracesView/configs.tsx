import type { ReactElement } from 'react';
import { generatePath, Link } from 'react-router-dom';
import TanStackTable from 'components/TanStackTableView';
import type { TableColumnDef } from 'components/TanStackTableView/types';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import ROUTES from 'constants/routes';
import { getMs } from 'container/Trace/Filters/Panel/PanelBody/Duration/util';
import { FormatTimezoneAdjustedTimestamp } from 'hooks/useTimezoneFormatter/useTimezoneFormatter';
import LineClampedText from 'periscope/components/LineClampedText/LineClampedText';

import { formatCellValue, TraceListRow } from '../tableUtils';

/** Always visible: it is the row's link to the trace. */
export const TRACE_ID_COLUMN_ID = 'trace_id';

const textCell = ({ value }: { value: unknown }): ReactElement => (
	<TanStackTable.Text>{formatCellValue(value)}</TanStackTable.Text>
);

const durationCell = ({ value }: { value: unknown }): ReactElement => (
	<TanStackTable.Text>
		{value === undefined || value === null
			? ''
			: `${getMs(formatCellValue(value))}ms`}
	</TanStackTable.Text>
);

const previewCell = ({ value }: { value: unknown }): ReactElement => (
	<LineClampedText text={formatCellValue(value)} lines={3} />
);

const traceIdCell = ({ value }: { value: unknown }): ReactElement => {
	const traceID = formatCellValue(value);
	if (!traceID) {
		return <TanStackTable.Text> </TanStackTable.Text>;
	}
	return (
		<Link
			to={generatePath(ROUTES.TRACE_DETAIL, { id: traceID })}
			data-testid="trace-id"
		>
			{traceID}
		</Link>
	);
};

/** Every column the trace list returns; ids and headers are the response keys verbatim. */
export const getTraceViewColumns = (
	formatTimezoneAdjustedTimestamp: FormatTimezoneAdjustedTimestamp,
): TableColumnDef<TraceListRow>[] => {
	const timestampCell = ({ value }: { value: unknown }): ReactElement => {
		if (value === undefined || value === null || value === '') {
			return <TanStackTable.Text> </TanStackTable.Text>;
		}
		return (
			<TanStackTable.Text>
				{formatTimezoneAdjustedTimestamp(
					value as string,
					DATE_TIME_FORMATS.ISO_DATETIME_MS,
				)}
			</TanStackTable.Text>
		);
	};

	return [
		{
			id: 'service.name',
			header: 'service.name',
			accessorFn: (row): unknown => row?.['service.name'],
			width: { min: 200 },
			cell: textCell,
		},
		{
			id: 'root_span_name',
			header: 'root_span_name',
			accessorFn: (row): unknown => row?.root_span_name,
			width: { min: 260 },
			cell: textCell,
		},
		{
			id: 'trace_duration_nano',
			header: 'trace_duration_nano',
			accessorFn: (row): unknown => row?.trace_duration_nano,
			width: { min: 170 },
			cell: durationCell,
		},
		{
			id: 'span_count',
			header: 'span_count',
			accessorFn: (row): unknown => row?.span_count,
			width: { min: 120 },
			cell: textCell,
		},
		{
			id: 'llm_call_count',
			header: 'llm_call_count',
			accessorFn: (row): unknown => row?.llm_call_count,
			width: { min: 120 },
			cell: textCell,
		},
		{
			id: 'total_tokens',
			header: 'total_tokens',
			accessorFn: (row): unknown => row?.total_tokens,
			width: { min: 130 },
			cell: textCell,
		},
		{
			id: 'estimated_total_cost',
			header: 'estimated_total_cost',
			accessorFn: (row): unknown => row?.estimated_total_cost,
			width: { min: 150 },
			cell: textCell,
		},
		{
			id: TRACE_ID_COLUMN_ID,
			header: 'trace_id',
			accessorFn: (row): unknown => row?.trace_id,
			enableRemove: false,
			width: { min: 290 },
			cell: traceIdCell,
		},
		{
			id: 'last_activity_time',
			header: 'last_activity_time',
			accessorFn: (row): unknown => row?.last_activity_time,
			defaultVisibility: false,
			width: { min: 200 },
			cell: timestampCell,
		},
		{
			id: 'start_time',
			header: 'start_time',
			accessorFn: (row): unknown => row?.start_time,
			defaultVisibility: false,
			width: { min: 200 },
			cell: timestampCell,
		},
		{
			id: 'end_time',
			header: 'end_time',
			accessorFn: (row): unknown => row?.end_time,
			defaultVisibility: false,
			width: { min: 200 },
			cell: timestampCell,
		},
		{
			id: 'max_llm_duration_nano',
			header: 'max_llm_duration_nano',
			accessorFn: (row): unknown => row?.max_llm_duration_nano,
			defaultVisibility: false,
			width: { min: 190 },
			cell: durationCell,
		},
		{
			id: 'tool_call_count',
			header: 'tool_call_count',
			accessorFn: (row): unknown => row?.tool_call_count,
			defaultVisibility: false,
			width: { min: 120 },
			cell: textCell,
		},
		{
			id: 'distinct_tool_count',
			header: 'distinct_tool_count',
			accessorFn: (row): unknown => row?.distinct_tool_count,
			defaultVisibility: false,
			width: { min: 140 },
			cell: textCell,
		},
		{
			id: 'input_tokens',
			header: 'input_tokens',
			accessorFn: (row): unknown => row?.input_tokens,
			defaultVisibility: false,
			width: { min: 130 },
			cell: textCell,
		},
		{
			id: 'output_tokens',
			header: 'output_tokens',
			accessorFn: (row): unknown => row?.output_tokens,
			defaultVisibility: false,
			width: { min: 140 },
			cell: textCell,
		},
		{
			id: 'error_count',
			header: 'error_count',
			accessorFn: (row): unknown => row?.error_count,
			defaultVisibility: false,
			width: { min: 100 },
			cell: textCell,
		},
		{
			id: 'input',
			header: 'input',
			accessorFn: (row): unknown => row?.input,
			defaultVisibility: false,
			width: { min: 280 },
			cell: previewCell,
		},
		{
			id: 'output',
			header: 'output',
			accessorFn: (row): unknown => row?.output,
			defaultVisibility: false,
			width: { min: 280 },
			cell: previewCell,
		},
	];
};
