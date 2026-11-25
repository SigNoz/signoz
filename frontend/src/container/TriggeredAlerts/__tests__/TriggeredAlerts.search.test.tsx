import { act, screen, userEvent } from 'tests/test-utils';

import {
	getTriggeredAlertRowTestId,
	renderTriggeredAlerts,
	search,
	SEARCH_INPUT,
	SEARCH_SETTLE_MS,
} from './_helpers';

function nameCell(fingerprint: string): HTMLElement | null {
	return screen.queryByTestId(getTriggeredAlertRowTestId(fingerprint, 'name'));
}

describe('TriggeredAlerts — search', () => {
	afterEach(() => {
		jest.useRealTimers();
	});

	it('filters rows by alertname when typing in the search input', async () => {
		renderTriggeredAlerts();

		await expect(
			screen.findByTestId(getTriggeredAlertRowTestId('fp-critical-1', 'name')),
		).resolves.toHaveTextContent('High CPU Usage');
		expect(nameCell('fp-warning-1')).toHaveTextContent('Memory Warning');

		await search('CPU');

		expect(nameCell('fp-critical-1')).toHaveTextContent('High CPU Usage');
		expect(nameCell('fp-warning-1')).not.toBeInTheDocument();
	});

	it('shows all rows again when search is cleared', async () => {
		renderTriggeredAlerts();
		await screen.findByTestId(
			getTriggeredAlertRowTestId('fp-critical-1', 'name'),
		);

		await search('CPU');
		expect(nameCell('fp-warning-1')).not.toBeInTheDocument();

		const user = userEvent.setup({
			advanceTimers: (ms) => jest.advanceTimersByTime(ms),
		});
		await user.clear(screen.getByTestId(SEARCH_INPUT));
		act(() => {
			jest.advanceTimersByTime(SEARCH_SETTLE_MS);
		});

		expect(nameCell('fp-critical-1')).toHaveTextContent('High CPU Usage');
		expect(nameCell('fp-warning-1')).toHaveTextContent('Memory Warning');
		expect(nameCell('fp-info-1')).toHaveTextContent('Disk Slow');
	});

	it('matches rows by label value (case-insensitive)', async () => {
		renderTriggeredAlerts();
		await screen.findByTestId(
			getTriggeredAlertRowTestId('fp-critical-1', 'name'),
		);

		// "backend" matches `service: backend` labels on Memory Warning and Network Hiccup.
		await search('backend');

		expect(nameCell('fp-warning-1')).toHaveTextContent('Memory Warning');
		expect(nameCell('fp-suppressed-1')).toHaveTextContent('Network Hiccup');
		expect(nameCell('fp-critical-1')).not.toBeInTheDocument();
		expect(nameCell('fp-info-1')).not.toBeInTheDocument();
	});

	it('matches rows by label key', async () => {
		renderTriggeredAlerts();
		await screen.findByTestId(
			getTriggeredAlertRowTestId('fp-critical-1', 'name'),
		);

		await search('staging');

		expect(nameCell('fp-info-1')).toHaveTextContent('Disk Slow');
		expect(nameCell('fp-critical-1')).not.toBeInTheDocument();
		expect(nameCell('fp-warning-1')).not.toBeInTheDocument();
	});

	it('renders the no-results empty state when the search matches nothing', async () => {
		renderTriggeredAlerts();
		await screen.findByTestId(
			getTriggeredAlertRowTestId('fp-critical-1', 'name'),
		);

		await search('zzzzznever-matches-anything');

		expect(screen.getByTestId('no-results-empty-state')).toBeInTheDocument();
	});

	it('resets pagination to page 1 when the search changes', async () => {
		renderTriggeredAlerts({ initialRoute: '/?page=2&limit=2' });

		await expect(
			screen.findByTestId(getTriggeredAlertRowTestId('fp-info-1', 'name')),
		).resolves.toHaveTextContent('Disk Slow');

		await search('CPU');

		expect(nameCell('fp-critical-1')).toHaveTextContent('High CPU Usage');
	});
});
