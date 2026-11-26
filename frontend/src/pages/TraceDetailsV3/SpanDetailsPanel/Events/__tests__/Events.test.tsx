import { render, screen } from 'tests/test-utils';
import { SpanV3 } from 'types/api/trace/getTraceV3';

import Events from '../Events';

const SPAN_START_MS = 1_700_000_000_000;

const span = {
	span_id: 'span-1',
	trace_id: 'trace-1',
	name: 'checkout',
	timestamp: SPAN_START_MS,
	duration_nano: 50_000_000,
	events: [
		{
			name: 'cache miss',
			timeUnixNano: (SPAN_START_MS + 3) * 1e6,
			attributeMap: {},
			isError: false,
		},
	],
} as unknown as SpanV3;

describe('Events', () => {
	it('shows the offset from the trace start when it is known', () => {
		render(<Events span={span} startTime={SPAN_START_MS - 10} isSearchVisible />);

		expect(screen.getByText('since trace start')).toBeInTheDocument();
		expect(screen.getByText('since span start')).toBeInTheDocument();
	});

	it('shows only the offset from the span start without a trace start', () => {
		render(<Events span={span} isSearchVisible />);

		expect(screen.queryByText('since trace start')).not.toBeInTheDocument();
		expect(screen.getByText('since span start')).toBeInTheDocument();
	});
});
