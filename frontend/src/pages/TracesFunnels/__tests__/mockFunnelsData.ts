import {
	ErrorTraceData,
	FunnelOverviewResponse,
	FunnelStepsResponse,
	SlowTraceData,
} from 'api/traceFunnels';
import { getRandomNumber } from 'lib/getRandomColor';
import { FunnelData } from 'types/api/traceFunnels';

import { FunnelContextType } from '../FunnelContext';

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

export const defaultMockFunnelContext: FunnelContextType = {
	startTime: 0,
	endTime: 0,
	selectedTime: '1h',
	validTracesCount: 0,
	funnelId: 'default-mock-id',
	steps: mockSingleFunnelData.steps || [],
	setSteps: jest.fn(),
	initialSteps: [],
	handleAddStep: jest.fn(),
	handleStepChange: jest.fn(),
	handleStepRemoval: jest.fn(),
	handleRunFunnel: jest.fn(),
	validationResponse: undefined,
	isValidateStepsLoading: false,
	hasIncompleteStepFields: false,
	setHasIncompleteStepFields: jest.fn(),
	hasAllEmptyStepFields: false,
	setHasAllEmptyStepFields: jest.fn(),
	handleReplaceStep: jest.fn(),
};

export const mockOverviewData: FunnelOverviewResponse = {
	status: 'success',
	data: [
		{
			timestamp: '1678886400000',
			data: {
				avg_duration: 123.45,
				avg_rate: 10.5,
				conversion_rate: 80.0,
				errors: 2,
				p99_latency: 250.0,
			},
		},
	],
};

export const mockStepsData: FunnelStepsResponse = {
	status: 'success',
	data: [
		{
			timestamp: '1678886400000',
			data: {
				total_s1_spans: 100,
				total_s1_errored_spans: 5,
				total_s2_spans: 80,
				total_s2_errored_spans: 2,
			},
		},
	],
};

export const mockSlowTracesData: SlowTraceData = {
	status: 'success',
	data: [
		{
			timestamp: '1678886400000',
			data: {
				duration_ms: '500.12',
				span_count: 15,
				trace_id: 'slow-trace-1',
			},
		},
	],
};

export const mockErrorTracesData: ErrorTraceData = {
	status: 'success',
	data: [
		{
			timestamp: '1678886400000',
			data: {
				duration_ms: '150.67',
				span_count: 10,
				trace_id: 'error-trace-1',
			},
		},
	],
};
