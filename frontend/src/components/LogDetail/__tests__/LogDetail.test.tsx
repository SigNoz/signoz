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

// The flag to be removed later
jest.mock('../constants', () => ({
	...jest.requireActual('../constants'),
	isLogDetailsV2: true,
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
		// Reset the window path (the infra "Open in Explorer" test mutates it).
		window.history.pushState({}, '', '/');
	});

	it('renders the revamped header when a log is provided', () => {
		renderDrawer();

		expect(screen.getByTestId('log-details-header-menu')).toBeInTheDocument();
		expect(screen.getByTestId('log-details-header-prev')).toBeInTheDocument();
		expect(screen.getByTestId('log-details-header-next')).toBeInTheDocument();
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

	it('shows "Open in Explorer" on infrastructure-monitoring routes', () => {
		window.history.pushState({}, '', '/infrastructure-monitoring');

		renderDrawer();

		expect(screen.getByText('Open in Explorer')).toBeInTheDocument();
	});

	it('hides "Open in Explorer" outside infrastructure-monitoring routes', () => {
		renderDrawer();

		expect(screen.queryByText('Open in Explorer')).not.toBeInTheDocument();
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
