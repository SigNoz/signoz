import { getRandomNumber } from 'lib/getRandomColor';
import { FunnelData } from 'types/api/traceFunnels';

// Helper to create consistent mock data
export const createMockFunnel = (id: string, name: string): FunnelData => ({
	id,
	funnel_name: name,
	creation_timestamp: Date.now() - getRandomNumber(10000, 50000), // Mock timestamp
	updated_timestamp: Date.now(),
	steps: [
		{
			id: 'step-1',
			step_order: 1,
			service_name: 'ServiceA',
			span_name: 'SpanA',
			filters: {
				items: [],
				op: 'AND',
			},
			latency_pointer: 'start',
			latency_type: 'p99',
			has_errors: false,
			title: 'Step 1',
			description: 'First step',
		},
		{
			id: 'step-2',
			step_order: 2,
			service_name: 'ServiceB',
			span_name: 'SpanB',
			filters: {
				items: [],
				op: 'AND',
			},
			latency_pointer: 'start',
			latency_type: 'p99',
			has_errors: false,
			title: 'Step 2',
			description: 'Second step',
		},
	],
	user: `user-${id}@example.com`,
	description: `Description for ${name}`,
});

export const mockFunnelsListData: FunnelData[] = [
	createMockFunnel('funnel-1', 'Checkout Process Funnel'),
	createMockFunnel('funnel-2', 'User Signup Flow'),
];

export const mockSingleFunnelData: FunnelData = createMockFunnel(
	'funnel-1',
	'Checkout Process Funnel',
);
