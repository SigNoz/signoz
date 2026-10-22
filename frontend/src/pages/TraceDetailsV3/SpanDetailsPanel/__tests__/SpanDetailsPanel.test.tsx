import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ROUTES from 'constants/routes';
import { render } from 'tests/test-utils';
import { SpanV3 } from 'types/api/trace/getTraceV3';

import { SpanDetailVariant } from '../constants';
import SpanDetailsPanel from '../SpanDetailsPanel';

// Mock window.open for the Open in Logs Explorer footer redirect.
const mockWindowOpen = jest.fn();
Object.defineProperty(window, 'open', {
	value: mockWindowOpen,
	writable: true,
});

// Placement is width-driven via useMeasure (jsdom reports 0), so we control the
// reported width per test. `mock` prefix lets the jest.mock factory reference it.
let mockWidth = 0;
jest.mock('react-use', () => ({
	...jest.requireActual('react-use'),
	useMeasure: (): [() => void, { width: number }] => [
		jest.fn(),
		{ width: mockWidth },
	],
}));

// SpanSummary is rendered for REAL so we assert the actual summary is visible and
// correctly placed. Only its external data source (percentile fetch via
// react-query) is mocked; the badge/panel are presentational off this data.
jest.mock('../SpanPercentile/useSpanPercentile', () => ({
	__esModule: true,
	default: () => ({
		isOpen: false,
		toggleOpen: jest.fn(),
		loading: false,
		percentileValue: 0,
		duration: '',
		spanPercentileData: null,
		isError: false,
	}),
}));

// Stub the OTHER tabs' heavy content. Each gets a testid so tab-level tests can
// be added here later by clicking the tab and asserting its stub appears.
jest.mock('../Events/Events', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="events-tab" />,
}));
jest.mock('../SpanLogs/SpanLogs', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="logs-tab" />,
}));
jest.mock('periscope/components/DataViewer', () => ({
	__esModule: true,
	DataViewer: (): JSX.Element => <div data-testid="overview-content" />,
}));
jest.mock('container/LogDetailedView/InfraMetrics/InfraMetrics', () => ({
	__esModule: true,
	default: (): JSX.Element => <div data-testid="metrics-tab" />,
}));

// Hooks with stores / API / side effects.
jest.mock('../SpanLogs/useSpanContextLogs', () => ({
	useSpanContextLogs: () => ({
		logs: [],
		isLoading: false,
		isError: false,
		isFetching: false,
		isLogSpanRelated: false,
		hasTraceIdLogs: false,
	}),
}));
const createMockSpan = (): SpanV3 => ({
	span_id: 'span-1',
	trace_id: 'trace-1',
	parent_span_id: '',
	name: 'service.call/d1',
	'service.name': 'test-service',
	timestamp: 1_700_000_000_000,
	duration_nano: 43_000_000,
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

const panelState = { isOpen: true, open: jest.fn(), close: jest.fn() };

function renderPanel(width: number): ReturnType<typeof render> {
	mockWidth = width;
	return render(
		<SpanDetailsPanel
			panelState={panelState}
			selectedSpan={createMockSpan()}
			variant={SpanDetailVariant.DOCKED}
			traceStartTime={1}
			traceEndTime={101}
		/>,
	);
}

describe('SpanDetailsPanel – span summary', () => {
	it('renders the real summary content for the selected span', () => {
		renderPanel(400);

		expect(screen.getByText('service.call/d1')).toBeInTheDocument(); // span name
		expect(screen.getByText(/43 ms/)).toBeInTheDocument(); // duration (shared formatter)
		expect(screen.getByText('43.00%')).toBeInTheDocument(); // exec-time share
		expect(screen.getByText('0 linked spans')).toBeInTheDocument();
	});

	it('keeps the summary above the tabs when the panel is narrow', () => {
		renderPanel(400);

		// The summary is present, but NOT inside the (active) Overview tabpanel.
		const overviewPanel = screen.getByRole('tabpanel');
		expect(
			within(overviewPanel).queryByText('0 linked spans'),
		).not.toBeInTheDocument();
		expect(screen.getByText('0 linked spans')).toBeInTheDocument();
	});

	it('moves the summary inside the Overview tab when the panel is wide', () => {
		renderPanel(1000);

		const overviewPanel = screen.getByRole('tabpanel');
		expect(within(overviewPanel).getByText('0 linked spans')).toBeInTheDocument();
	});
});

describe('SpanDetailsPanel – tabs', () => {
	it('shows Overview by default and switches content on tab change', async () => {
		const user = userEvent.setup({ delay: null });
		renderPanel(400);

		// Overview active by default.
		expect(screen.getByTestId('overview-content')).toBeInTheDocument();
		expect(screen.queryByTestId('events-tab')).not.toBeInTheDocument();

		await user.click(screen.getByRole('tab', { name: /events/i }));
		expect(screen.getByTestId('events-tab')).toBeInTheDocument();

		await user.click(screen.getByRole('tab', { name: /logs/i }));
		expect(screen.getByTestId('logs-tab')).toBeInTheDocument();
	});
});

// The footer lives on the panel body (not inside the tab content) so it stays
// pinned to the panel's visible bottom edge; it should track the active tab.
describe('SpanDetailsPanel – Open in Logs Explorer footer', () => {
	beforeEach(() => {
		mockWindowOpen.mockClear();
	});

	it('appears only while the Logs tab is active', async () => {
		const user = userEvent.setup({ delay: null });
		renderPanel(400);

		expect(
			screen.queryByTestId('open-in-explorer-button'),
		).not.toBeInTheDocument();

		await user.click(screen.getByRole('tab', { name: /logs/i }));
		expect(screen.getByTestId('open-in-explorer-button')).toBeInTheDocument();

		await user.click(screen.getByRole('tab', { name: /overview/i }));
		expect(
			screen.queryByTestId('open-in-explorer-button'),
		).not.toBeInTheDocument();
	});

	it('opens Logs Explorer in a new tab filtered to the span trace when clicked', async () => {
		const user = userEvent.setup({ delay: null });
		renderPanel(400);

		await user.click(screen.getByRole('tab', { name: /logs/i }));
		await user.click(screen.getByTestId('open-in-explorer-button'));

		expect(mockWindowOpen).toHaveBeenCalledTimes(1);
		const [url, target] = mockWindowOpen.mock.calls[0];
		expect(url).toContain(ROUTES.LOGS_EXPLORER);
		expect(url).toContain('trace-1');
		expect(target).toBe('_blank');
	});
});
