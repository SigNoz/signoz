import { ErrorTraceData, SlowTraceData } from 'api/traceFunnels';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import { useEffect, useMemo } from 'react';
import { UseMutationResult } from 'react-query';
import { Link } from 'react-router-dom';
import { ErrorResponse, SuccessResponse } from 'types/api';

import FunnelTable from './FunnelTable';

interface FunnelTopTracesTableProps {
	funnelId: string;
	startTime: string;
	endTime: string;
	stepAOrder: number;
	stepBOrder: number;
	title: string;
	tooltip: string;
	useMutation: (
		funnelId: string,
	) => UseMutationResult<
		SuccessResponse<SlowTraceData | ErrorTraceData> | ErrorResponse,
		Error,
		{
			start_time: number;
			end_time: number;
			step_a_order: number;
			step_b_order: number;
		}
	>;
}

function FunnelTopTracesTable({
	funnelId,
	startTime,
	endTime,
	stepAOrder,
	stepBOrder,
	title,
	tooltip,
	useMutation,
}: FunnelTopTracesTableProps): JSX.Element {
	const { mutate: fetchTraces, isLoading, data: response } = useMutation(
		funnelId,
	);

	const data = useMemo(() => {
		if (!response?.payload?.data) return [];
		return response.payload.data.map((item) => ({
			trace_id: item.data.trace_id,
			duration_ms: item.data.duration_ms,
			span_count: item.data.span_count,
		}));
	}, [response]);

	useEffect(() => {
		fetchTraces({
			start_time: parseInt(startTime, 10) * 1e9,
			end_time: parseInt(endTime, 10) * 1e9,
			step_a_order: stepAOrder,
			step_b_order: stepBOrder,
		});
	}, [fetchTraces, startTime, endTime, stepAOrder, stepBOrder]);

	const columns = useMemo(
		() => [
			{
				title: 'TRACE ID',
				dataIndex: 'trace_id',
				key: 'trace_id',
				render: (traceId: string): JSX.Element => (
					<Link to={`/trace/${traceId}`} className="trace-id-cell">
						{traceId}
					</Link>
				),
			},
			{
				title: 'DURATION',
				dataIndex: 'duration_ms',
				key: 'duration_ms',
				render: (value: string): string => getYAxisFormattedValue(value, 'ms'),
			},
			{
				title: 'SPAN COUNT',
				dataIndex: 'span_count',
				key: 'span_count',
				render: (value: number): string => value.toString(),
			},
		],
		[],
	);

	return (
		<FunnelTable
			title={title}
			tooltip={tooltip}
			columns={columns}
			data={data}
			loading={isLoading}
		/>
	);
}

export default FunnelTopTracesTable;
