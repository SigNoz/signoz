import { toast } from '@signozhq/ui/sonner';
import { LOCALSTORAGE } from 'constants/localStorage';
import { render, screen, userEvent } from 'tests/test-utils';
import { ILog } from 'types/api/logs/log';

import LogDetail from '..';
import { VIEW_TYPES } from '../constants';
import { LogDetailProps } from '../LogDetail.interfaces';

jest.mock('@signozhq/ui/sonner', () => ({
	toast: { success: jest.fn(), error: jest.fn() },
}));

// DataViewer pulls in react-json-tree (ESM) + Monaco; mock it (as trace's tests
// do). These drawer tests assert the header/highlights, not the Overview body.
jest.mock('periscope/components/DataViewer', () => ({
	__esModule: true,
	DataViewer: (): JSX.Element => <div data-testid="overview-data-viewer" />,
}));

// Force v2 for these tests regardless of route.
jest.mock('../useIsLogDetailsV2', () => ({
	useIsLogDetailsV2: (): boolean => true,
}));

const mockLog: ILog = {
	id: 'log-1',
	timestamp: '2024-01-15T09:45:30Z',
	date: '2024-01-15T09:45:30Z',
	body: 'test log body',
	severityText: 'INFO',
	severityNumber: 9,
	traceFlags: 0,
	traceId: '',
	spanID: '',
	attributesString: {},
	attributesInt: {},
	attributesFloat: {},
	resources_string: {},
	scope_string: {},
	attributes_string: {},
	severity_text: 'INFO',
	severity_number: 9,
};

const makeLog = (id: string): ILog => ({ ...mockLog, id });

function renderDrawer(props: Partial<LogDetailProps> = {}): void {
	render(
		<LogDetail
			log={mockLog}
			selectedTab={VIEW_TYPES.OVERVIEW}
			onAddToQuery={jest.fn()}
			onClickActionItem={jest.fn()}
			onClose={jest.fn()}
			{...props}
		/>,
	);
}

describe('LogDetail drawer — header (isLogDetailsV2)', () => {
	afterEach(() => {
		jest.clearAllMocks();
		localStorage.clear();
	});

	it('renders the revamped header when a log is provided', () => {
		renderDrawer();

		expect(screen.getByTestId('log-details-header-menu')).toBeInTheDocument();
		expect(screen.getByTestId('log-details-header-prev')).toBeInTheDocument();
		expect(screen.getByTestId('log-details-header-next')).toBeInTheDocument();
	});

	it('renders the DataViewer in the Overview tab', () => {
		renderDrawer();

		expect(screen.getByTestId('overview-data-viewer')).toBeInTheDocument();
	});

	it('shows the log timestamp formatted (DASH_DATETIME) in the header', () => {
		// Pin the timezone to UTC so the formatted output is deterministic across
		// machines/CI (Jest doesn't fix a TZ).
		localStorage.setItem(LOCALSTORAGE.PREFERRED_TIMEZONE, 'UTC');

		renderDrawer();

		// mockLog date is 2024-01-15T09:45:30Z → DASH_DATETIME in UTC.
		expect(screen.getByTestId('log-details-header-timestamp')).toHaveTextContent(
			'Jan 15, 2024 ⎯ 09:45:30',
		);
	});

	it('normalizes a nanosecond-epoch timestamp in the header', () => {
		localStorage.setItem(LOCALSTORAGE.PREFERRED_TIMEZONE, 'UTC');

		// Same instant as mockLog but as epoch nanoseconds (e.g. dashboard list panel).
		// Must scale to ms, not render a wildly wrong date.
		renderDrawer({
			log: {
				...mockLog,
				date: '1705311930000000000',
				timestamp: 1705311930000000000,
			},
		});

		expect(screen.getByTestId('log-details-header-timestamp')).toHaveTextContent(
			'Jan 15, 2024 ⎯ 09:45:30',
		);
	});

	it('copies the log link from the ⋯ menu', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		renderDrawer();

		await user.click(screen.getByTestId('log-details-header-menu'));
		await user.click(await screen.findByText('Copy link to log'));

		expect(toast.success).toHaveBeenCalled();
	});

	it('copies the log from the ⋯ menu', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });

		renderDrawer();

		await user.click(screen.getByTestId('log-details-header-menu'));
		await user.click(await screen.findByText('Copy log'));

		expect(toast.success).toHaveBeenCalledWith('Copied to clipboard', {
			position: 'bottom-right',
		});
	});

	it('shows "Open in Explorer" when a handleOpenInExplorer handler is provided', () => {
		renderDrawer({ handleOpenInExplorer: jest.fn() });

		expect(screen.getByText('Open in Explorer')).toBeInTheDocument();
	});

	it('hides "Open in Explorer" when no handleOpenInExplorer handler is provided', () => {
		renderDrawer();

		expect(screen.queryByText('Open in Explorer')).not.toBeInTheDocument();
	});

	it('renders Highlights for fields present on the log, omitting absent ones', () => {
		const logWithMeta = {
			...mockLog,
			severity_text: 'ERROR',
			trace_id: 'trace-abc',
			resources_string: {
				'service.name': 'checkout',
				'deployment.environment': 'production',
			},
		} as unknown as ILog;

		renderDrawer({ log: logWithMeta });

		const highlights = screen.getByTestId('log-details-highlights');
		expect(highlights).toHaveTextContent('SEVERITY');
		expect(highlights).toHaveTextContent('ERROR');
		expect(highlights).toHaveTextContent('SERVICE');
		expect(highlights).toHaveTextContent('checkout');
		expect(highlights).toHaveTextContent('ENVIRONMENT');
		expect(highlights).toHaveTextContent('production');
		expect(highlights).toHaveTextContent('TRACE ID');
		// Absent fields are omitted (no namespace / span id on this log).
		expect(highlights).not.toHaveTextContent('NAMESPACE');
		expect(highlights).not.toHaveTextContent('SPAN ID');
	});

	it('links the trace id highlight to the trace detail in a new tab', () => {
		const logWithTrace = {
			...mockLog,
			trace_id: 'trace-abc',
		} as unknown as ILog;

		renderDrawer({ log: logWithTrace });

		const link = screen.getByRole('link', { name: 'trace-abc' });
		expect(link).toHaveAttribute('target', '_blank');
		expect(link.getAttribute('href')).toContain('/trace/trace-abc');
	});

	it('navigates to the next / previous log with the Down / Up arrow keys', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const logs = [makeLog('log-0'), makeLog('log-1'), makeLog('log-2')];
		const onNavigateLog = jest.fn();
		const onScrollToLog = jest.fn();

		// Active log is the middle one so both directions are available.
		renderDrawer({ log: logs[1], logs, onNavigateLog, onScrollToLog });

		await user.keyboard('{ArrowDown}');
		expect(onNavigateLog).toHaveBeenLastCalledWith(logs[2]);
		expect(onScrollToLog).toHaveBeenLastCalledWith('log-2');

		await user.keyboard('{ArrowUp}');
		expect(onNavigateLog).toHaveBeenLastCalledWith(logs[0]);
		expect(onScrollToLog).toHaveBeenLastCalledWith('log-0');
	});

	it('does not navigate past the first log on ArrowUp', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const logs = [makeLog('log-0'), makeLog('log-1')];
		const onNavigateLog = jest.fn();

		renderDrawer({ log: logs[0], logs, onNavigateLog });

		await user.keyboard('{ArrowUp}');
		expect(onNavigateLog).not.toHaveBeenCalled();
	});

	it('navigates via the header up / down buttons and disables them at boundaries', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const logs = [makeLog('log-0'), makeLog('log-1')];
		const onNavigateLog = jest.fn();

		// Active log is the first one.
		renderDrawer({ log: logs[0], logs, onNavigateLog });

		expect(screen.getByTestId('log-details-header-prev')).toBeDisabled();
		expect(screen.getByTestId('log-details-header-next')).toBeEnabled();

		await user.click(screen.getByTestId('log-details-header-next'));
		expect(onNavigateLog).toHaveBeenLastCalledWith(logs[1]);
	});
});
