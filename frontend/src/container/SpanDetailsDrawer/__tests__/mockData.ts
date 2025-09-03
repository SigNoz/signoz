import { ILog } from 'types/api/logs/log';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Span } from 'types/api/trace/getTraceV2';

// Constants
const TEST_SPAN_ID = 'test-span-id';
const TEST_TRACE_ID = 'test-trace-id';
const TEST_SERVICE = 'test-service';

// Mock span data
export const mockSpan: Span = {
	spanId: TEST_SPAN_ID,
	traceId: TEST_TRACE_ID,
	name: TEST_SERVICE,
	serviceName: TEST_SERVICE,
	timestamp: 1640995200000000, // 2022-01-01 00:00:00 in microseconds
	durationNano: 1000000000, // 1 second in nanoseconds
	spanKind: 'server',
	statusCodeString: 'STATUS_CODE_OK',
	statusMessage: '',
	parentSpanId: '',
	references: [],
	event: [],
	tagMap: {
		'http.method': 'GET',
		'http.url': '/api/test',
		'http.status_code': '200',
	},
	hasError: false,
	rootSpanId: '',
	kind: 0,
	rootName: '',
	hasChildren: false,
	hasSibling: false,
	subTreeNodeCount: 0,
	level: 0,
};

// Mock logs with proper relationships
export const mockSpanLogs: ILog[] = [
	{
		id: 'span-log-1',
		timestamp: '2022-01-01T00:00:01.000Z',
		body: 'Processing request in span',
		severity_text: 'INFO',
		severity_number: 9,
		spanID: TEST_SPAN_ID,
		span_id: TEST_SPAN_ID,
		date: '',
		traceId: TEST_TRACE_ID,
		traceFlags: 0,
		severityText: '',
		severityNumber: 0,
		resources_string: {},
		scope_string: {},
		attributesString: {},
		attributes_string: {},
		attributesInt: {},
		attributesFloat: {},
	},
	{
		id: 'span-log-2',
		timestamp: '2022-01-01T00:00:02.000Z',
		body: 'Span operation completed',
		severity_text: 'INFO',
		severity_number: 9,
		spanID: TEST_SPAN_ID,
		span_id: TEST_SPAN_ID,
		date: '',
		traceId: TEST_TRACE_ID,
		traceFlags: 0,
		severityText: '',
		severityNumber: 0,
		resources_string: {},
		scope_string: {},
		attributesString: {},
		attributes_string: {},
		attributesInt: {},
		attributesFloat: {},
	},
];

export const mockContextLogs: ILog[] = [
	{
		id: 'context-log-before',
		timestamp: '2021-12-31T23:59:59.000Z',
		body: 'Context log before span',
		severity_text: 'INFO',
		severity_number: 9,
		spanID: 'different-span-id',
		span_id: 'different-span-id',
		date: '',
		traceId: TEST_TRACE_ID,
		traceFlags: 0,
		severityText: '',
		severityNumber: 0,
		resources_string: {},
		scope_string: {},
		attributesString: {},
		attributes_string: {},
		attributesInt: {},
		attributesFloat: {},
	},
	{
		id: 'context-log-after',
		timestamp: '2022-01-01T00:00:03.000Z',
		body: 'Context log after span',
		severity_text: 'INFO',
		severity_number: 9,
		spanID: 'another-different-span-id',
		span_id: 'another-different-span-id',
		date: '',
		traceId: TEST_TRACE_ID,
		traceFlags: 0,
		severityText: '',
		severityNumber: 0,
		resources_string: {},
		scope_string: {},
		attributesString: {},
		attributes_string: {},
		attributesInt: {},
		attributesFloat: {},
	},
];

// Combined logs in chronological order
export const mockAllLogs: ILog[] = [
	mockContextLogs[0], // before
	...mockSpanLogs, // span logs
	mockContextLogs[1], // after
];

// Mock API responses
export const mockSpanLogsResponse = {
	payload: {
		data: {
			newResult: {
				data: {
					result: [
						{
							list: mockSpanLogs.map((log) => ({
								data: log,
								timestamp: log.timestamp,
							})),
						},
					],
				},
			},
		},
	},
};

export const mockBeforeLogsResponse = {
	payload: {
		data: {
			newResult: {
				data: {
					result: [
						{
							list: [mockContextLogs[0]].map((log) => ({
								data: log,
								timestamp: log.timestamp,
							})),
						},
					],
				},
			},
		},
	},
};

export const mockAfterLogsResponse = {
	payload: {
		data: {
			newResult: {
				data: {
					result: [
						{
							list: [mockContextLogs[1]].map((log) => ({
								data: log,
								timestamp: log.timestamp,
							})),
						},
					],
				},
			},
		},
	},
};

export const mockEmptyLogsResponse = {
	payload: {
		data: {
			newResult: {
				data: {
					result: [
						{
							list: [],
						},
					],
				},
			},
		},
	},
};

// Expected query filters
export const expectedSpanFilters = {
	items: [
		{
			id: expect.any(String),
			op: '=',
			value: TEST_TRACE_ID,
			key: {
				id: expect.any(String),
				dataType: DataTypes.String,
				isColumn: true,
				type: '',
				isJSON: false,
				key: 'trace_id',
			},
		},
		{
			id: expect.any(String),
			op: '=',
			value: TEST_SPAN_ID,
			key: {
				id: expect.any(String),
				dataType: DataTypes.String,
				isColumn: true,
				type: '',
				isJSON: false,
				key: 'span_id',
			},
		},
	],
	op: 'AND',
};

export const expectedBeforeFilters = {
	items: [
		{
			id: expect.any(String),
			op: '=',
			value: TEST_TRACE_ID,
			key: {
				id: expect.any(String),
				dataType: DataTypes.String,
				isColumn: true,
				type: '',
				isJSON: false,
				key: 'trace_id',
			},
		},
		{
			id: expect.any(String),
			op: '<',
			value: 'span-log-1', // first span log ID
			key: {
				id: expect.any(String),
				dataType: DataTypes.String,
				isColumn: true,
				type: '',
				isJSON: false,
				key: 'id',
			},
		},
	],
	op: 'AND',
};

export const expectedAfterFilters = {
	items: [
		{
			id: expect.any(String),
			op: '=',
			value: TEST_TRACE_ID,
			key: {
				id: expect.any(String),
				dataType: DataTypes.String,
				isColumn: true,
				type: '',
				isJSON: false,
				key: 'trace_id',
			},
		},
		{
			id: expect.any(String),
			op: '>',
			value: 'span-log-2', // last span log ID
			key: {
				id: expect.any(String),
				dataType: DataTypes.String,
				isColumn: true,
				type: '',
				isJSON: false,
				key: 'id',
			},
		},
	],
	op: 'AND',
};
