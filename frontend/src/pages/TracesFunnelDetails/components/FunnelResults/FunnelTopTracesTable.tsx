import { ErrorTraceData, SlowTraceData } from 'api/traceFunnels';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import { useFunnelContext } from 'pages/TracesFunnels/FunnelContext';
import { useMemo } from 'react';
import { UseQueryResult } from 'react-query';
import { Link } from 'react-router-dom';
import { ErrorResponse, SuccessResponse } from 'types/api';

import FunnelTable from './FunnelTable';

interface FunnelTopTracesTableProps {
	funnelId: string;
	stepAOrder: number;
	stepBOrder: number;
	title: string;
	tooltip: string;
	useQueryHook: (
		funnelId: string,
		payload: {
			start_time: number;
			end_time: number;
			step_a_order: number;
			step_b_order: number;
		},
	) => UseQueryResult<
		SuccessResponse<SlowTraceData | ErrorTraceData> | ErrorResponse,
		Error
	>;
}

function FunnelTopTracesTable({
	funnelId,
	stepAOrder,
	stepBOrder,
	title,
	tooltip,
	useQueryHook,
}: FunnelTopTracesTableProps): JSX.Element {
	const { startTime, endTime } = useFunnelContext();
	const payload = useMemo(
		() => ({
			start_time: startTime,
			end_time: endTime,
			step_a_order: stepAOrder,
			step_b_order: stepBOrder,
		}),
		[startTime, endTime, stepAOrder, stepBOrder],
	);

	const { data: response, isLoading } = useQueryHook(funnelId, payload);

	const data = useMemo(() => {
		if (!response?.payload?.data) return [];
		return response.payload.data.map((item) => ({
			trace_id: item.data.trace_id,
			duration_ms: item.data.duration_ms,
			span_count: item.data.span_count,
		}));
	}, [response]);

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
