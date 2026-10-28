import { SpantypesFlamegraphSpanDTO as FlamegraphSpan } from 'api/generated/services/sigNoz.schemas';

/** Minimal FlamegraphSpan for unit tests */
export const MOCK_SPAN: FlamegraphSpan = {
	timestamp: 1000,
	durationNano: 50_000_000, // 50ms
	spanId: 'span-1',
	parentSpanId: '',
	hasError: false,
	name: 'test-span',
	level: 0,
	event: [],
	resource: {},
	attributes: {},
};

/** Nested spans structure for findSpanById tests */
export const MOCK_SPANS: FlamegraphSpan[][] = [
	[
		{
			...MOCK_SPAN,
			spanId: 'root',
			parentSpanId: '',
			level: 0,
		},
	],
	[
		{
			...MOCK_SPAN,
			spanId: 'child-a',
			parentSpanId: 'root',
			level: 1,
		},
		{
			...MOCK_SPAN,
			spanId: 'child-b',
			parentSpanId: 'root',
			level: 1,
		},
	],
	[
		{
			...MOCK_SPAN,
			spanId: 'grandchild',
			parentSpanId: 'child-a',
			level: 2,
		},
	],
];

export const MOCK_TRACE_METADATA = {
	startTime: 0,
	endTime: 1000,
};
