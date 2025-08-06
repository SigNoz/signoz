import { FunnelStepData, LatencyOptions } from 'types/api/traceFunnels';
import { v4 } from 'uuid';

export const createInitialStepsData = (): FunnelStepData[] => [
	{
		id: v4(),
		step_order: 1,
		service_name: '',
		span_name: '',
		filters: {
			items: [],
			op: 'and',
		},
		latency_pointer: 'start',
		has_errors: false,
	},
	{
		id: v4(),
		step_order: 2,
		service_name: '',
		span_name: '',
		filters: {
			items: [],
			op: 'and',
		},
		latency_pointer: 'end',
		latency_type: LatencyOptions.P95,
		has_errors: false,
	},
];

export const createSingleStepData = (): FunnelStepData[] => [
	{
		id: v4(),
		step_order: 1,
		service_name: '',
		span_name: '',
		filters: {
			items: [],
			op: 'and',
		},
		latency_pointer: 'start',
		has_errors: false,
	},
];

export const LatencyPointers: {
	value: FunnelStepData['latency_pointer'];
	key: string;
}[] = [
	{
		value: 'start',
		key: 'Start of span',
	},
	{
		value: 'end',
		key: 'End of span',
	},
];
