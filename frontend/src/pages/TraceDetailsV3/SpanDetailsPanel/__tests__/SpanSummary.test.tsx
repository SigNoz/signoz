import { screen } from '@testing-library/react';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import dayjs from 'dayjs';
import { render } from 'tests/test-utils';
import { SpanV3 } from 'types/api/trace/getTraceV3';

import SpanSummary from '../SpanSummary';

// The percentile widgets fetch their own data — stub them so this suite stays a
// pure render test of SpanSummary's own content (name, metadata row, linked spans).
jest.mock('../SpanPercentile/useSpanPercentile', () => ({
	__esModule: true,
	default: () => ({
		isOpen: false,
		toggleOpen: jest.fn(),
		loading: false,
		percentileValue: 0,
		duration: '',
		spanPercentileData: null,
	}),
}));
jest.mock('../SpanPercentile/SpanPercentileBadge', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="percentile-badge" />,
}));
jest.mock('../SpanPercentile/SpanPercentilePanel', () => ({
	__esModule: true,
	default: (): null => null,
}));

const createMockSpan = (): SpanV3 => ({
	span_id: 'span-1',
	trace_id: 'trace-1',
	parent_span_id: '',
	name: 'service.call/d1',
	'service.name': 'test-service',
	timestamp: 1_700_000_000_000,
	duration_nano: 43_000_000, // 43 ms
	level: 0,
	has_error: false,
	kind: 1,
	kind_string: 'server',
	attributes: {},
	resource: {},
	events: [],
	status_message: '',
	status_code: 0,
	status_code_string: 'OK',
	has_children: false,
	has_sibling: false,
	sub_tree_node_count: 1,
	http_method: '',
	http_url: '',
	http_host: '',
	db_name: '',
	db_operation: '',
	external_http_method: '',
	external_http_url: '',
	response_status_code: '',
	is_remote: '',
	flags: 0,
	trace_state: '',
});

describe('SpanSummary', () => {
	it('renders span name, duration with exec-time share, timestamp and linked-span count', () => {
		const span = createMockSpan();
		render(
			<SpanSummary selectedSpan={span} traceStartTime={1} traceEndTime={101} />,
		);

		// Span name
		expect(screen.getByText('service.call/d1')).toBeInTheDocument();

		// Duration via the shared formatter (43 ms) + exec-time share.
		const duration = getYAxisFormattedValue(
			`${span.duration_nano / 1000000}`,
			'ms',
		);
		expect(screen.getByText(new RegExp(duration))).toBeInTheDocument();
		expect(screen.getByText('43.00%')).toBeInTheDocument();
		expect(screen.getByText(/of total exec time/)).toBeInTheDocument();

		// Timestamp (same dayjs format the component uses).
		const ts = dayjs(span.timestamp).format('HH:mm:ss — MMM D, YYYY');
		expect(screen.getByText(ts)).toBeInTheDocument();

		// Linked spans + percentile badge
		expect(screen.getByText('0 linked spans')).toBeInTheDocument();
		expect(screen.getByTestId('percentile-badge')).toBeInTheDocument();
	});

	it('omits the exec-time share when the trace window is not provided', () => {
		render(<SpanSummary selectedSpan={createMockSpan()} />);

		expect(screen.queryByText(/of total exec time/)).not.toBeInTheDocument();
	});
});
