import { FunnelStepData } from 'types/api/traceFunnels';
import { v4 } from 'uuid';

export const initialStepsData: FunnelStepData[] = [
	{
		id: v4(),
		funnel_order: 1,
		service_name: '',
		span_name: '',
		filters: {
			items: [],
			op: 'and',
		},
		latency_pointer: 'start',
		latency_type: 'p95',
		has_errors: false,
		title: '',
		description: '',
	},
	{
		id: v4(),
		funnel_order: 2,
		service_name: '',
		span_name: '',
		filters: {
			items: [],
			op: 'and',
		},
		latency_pointer: 'start',
		latency_type: 'p95',
		has_errors: false,
		title: '',
		description: '',
	},
];

export const LatencyPointers: { value: string; key: string }[] = [
	{
		value: 'start_of_span',
		key: 'Start of span',
	},
	{
		value: 'end_of_span',
		key: 'End of span',
	},
];
