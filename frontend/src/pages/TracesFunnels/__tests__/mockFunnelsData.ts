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
	funnel_id: id,
	funnel_name: name,
	created_at: Date.now() - getRandomNumber(10000, 50000), // Mock timestamp
	updated_at: Date.now(),
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
			name: 'Step 1',
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
			name: 'Step 2',
			description: 'Second step',
		},
	],
	user_email: `user-${id}`,
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
	hasAllEmptyStepFields: false,
	handleReplaceStep: jest.fn(),
	handleRestoreSteps: jest.fn(),
	handleSaveFunnel: jest.fn(),
	triggerSave: false,
	hasUnsavedChanges: false,
	isUpdatingFunnel: false,
	setIsUpdatingFunnel: jest.fn(),
	lastUpdatedSteps: [],
	setLastUpdatedSteps: jest.fn(),
};

export const mockOverviewData: FunnelOverviewResponse = {
	status: 'success',
	data: [
		{
			timestamp: '1678886400000',
			data: {
				avg_duration: 123, // in milliseconds for proper formatting
				avg_rate: 10.5,
				conversion_rate: 80.0,
				errors: 2,
				latency: 250, // in milliseconds for proper formatting
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
				total_s1_errored_spans: 10,
				total_s2_spans: 80,
				total_s2_errored_spans: 8,
			},
		},
	],
};

export const mockStepsOverviewData = {
	status: 'success',
	data: [
		{
			timestamp: '1678886400000',
			data: {
				avg_duration: 0.055, // in milliseconds for steps overview
				avg_rate: 8.5,
				conversion_rate: 92.0,
				errors: 1,
				latency: 0.15, // in milliseconds for steps overview
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

export const mockSpanSuccessComponentProps = {
	spans: [
		{
			timestamp: 1683245912789,
			durationNano: 28934567,
			spanId: 'c84bb52145b55f85',
			rootSpanId: '',
			traceId: '29fe8bbf8515f9fc4dd2g917c97c2b16',
			hasError: false,
			kind: 2,

			event: [],
			rootName: '',
			statusMessage: '',
			statusCodeString: 'Unset',
			spanKind: 'Producer',
			serviceName: 'producer-svc-3',
			name: 'topic2 publish',
			children: [],
			subTreeNodeCount: 3,
			hasChildren: false,
			hasSiblings: false,
			level: 0,
			parentSpanId: '',
			references: [],
			tagMap: { 'http.method': 'POST' },
			hasSibling: false,
		},
	],
	traceMetadata: {
		traceId: '29fe8bbf8515f9fc4dd2g917c97c2b16',
		startTime: 1683245912789,
		endTime: 1683245912817,
		hasMissingSpans: false,
	},
	interestedSpanId: {
		spanId: 'c84bb52145b55f85',
		isUncollapsed: true,
	},
	uncollapsedNodes: [],
	setInterestedSpanId: jest.fn(),
	setTraceFlamegraphStatsWidth: jest.fn(),
	selectedSpan: undefined,
	setSelectedSpan: jest.fn(),
};
