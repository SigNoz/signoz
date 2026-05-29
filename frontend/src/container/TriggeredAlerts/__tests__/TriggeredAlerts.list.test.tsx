import { cleanup, screen, waitFor } from 'tests/test-utils';

import { flushNuqsUrl, renderTriggeredAlerts, resetUrl } from './_helpers';

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: jest.fn(() => ({ safeNavigate: jest.fn() })),
}));

jest.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn(),
}));

describe('TriggeredAlerts — list rendering', () => {
	beforeEach(() => {
		// setSystemTime alone works under real timers in Jest 28+; fake timers were
		// previously enabled here and broke findBy*/waitFor by stalling their
		// internal setTimeout polling.
		jest.setSystemTime(new Date('2023-10-20T12:00:00Z'));
		resetUrl();
	});

	afterEach(async () => {
		cleanup();
		await flushNuqsUrl();
		resetUrl();
	});

	it('renders alerts from the API', async () => {
		renderTriggeredAlerts();

		await expect(
			screen.findByText('High CPU Usage'),
		).resolves.toBeInTheDocument();
		expect(screen.getByText('Memory Warning')).toBeInTheDocument();
		expect(screen.getByText('Disk Slow')).toBeInTheDocument();
	});

	it('renders severity badges for alerts that have severity', async () => {
		renderTriggeredAlerts();

		await waitFor(
			() => expect(screen.getByText('High CPU Usage')).toBeInTheDocument(),
			{ timeout: 5000 },
		);

		expect(screen.getByText('critical')).toBeInTheDocument();
		expect(screen.getByText('warning')).toBeInTheDocument();
		expect(screen.getByText('info')).toBeInTheDocument();
	});

	it('renders status tags reflecting the alert state', async () => {
		renderTriggeredAlerts();

		await waitFor(
			() => expect(screen.getByText('High CPU Usage')).toBeInTheDocument(),
			{ timeout: 5000 },
		);

		// status === 'active' → Firing badge
		expect(screen.getAllByText('Firing').length).toBeGreaterThan(0);
		// status === 'unprocessed' → Unprocessed badge
		expect(screen.getByText('Unprocessed')).toBeInTheDocument();
		// status === 'suppressed' → Suppressed badge
		expect(screen.getByText('Suppressed')).toBeInTheDocument();
	});

	it('renders the search input and filter comboboxes', async () => {
		renderTriggeredAlerts();

		await waitFor(
			() => expect(screen.getByText('High CPU Usage')).toBeInTheDocument(),
			{ timeout: 5000 },
		);

		expect(
			screen.getByTestId('triggered-alerts-search-input'),
		).toBeInTheDocument();
		expect(
			screen.getByTestId('triggered-alerts-filter-combobox'),
		).toBeInTheDocument();
		expect(
			screen.getByTestId('triggered-alerts-groupby-combobox'),
		).toBeInTheDocument();
	});
});
