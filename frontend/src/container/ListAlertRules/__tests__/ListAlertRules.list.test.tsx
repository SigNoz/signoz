import { screen, waitFor } from 'tests/test-utils';

import { renderListAlertRules } from './_helpers';

jest.mock(
	'@signozhq/ui/divider',
	() => ({
		Divider: ({ children }: { children?: React.ReactNode }): JSX.Element => (
			<div>{children}</div>
		),
	}),
	{ virtual: true },
);

const safeNavigateMock = jest.fn();
jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: jest.fn(() => ({ safeNavigate: safeNavigateMock })),
}));

jest.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn(),
}));

describe('ListAlertRules — list rendering', () => {
	beforeEach(() => {
		jest.setSystemTime(new Date('2023-10-20T12:00:00Z'));
	});

	it('renders alert rules from API', async () => {
		renderListAlertRules();

		await expect(
			screen.findByText('High CPU Alert'),
		).resolves.toBeInTheDocument();
		expect(screen.getByText('Memory Pending Alert')).toBeInTheDocument();
		expect(screen.getByText('Healthy Alert')).toBeInTheDocument();
		expect(screen.getByText('Disabled Alert')).toBeInTheDocument();
	});

	it('renders state badges via STATE_CONFIG mapping', async () => {
		renderListAlertRules();

		await waitFor(
			() => expect(screen.getByText('High CPU Alert')).toBeInTheDocument(),
			{ timeout: 5000 },
		);

		expect(screen.getByText('Firing')).toBeInTheDocument();
		expect(screen.getByText('Pending')).toBeInTheDocument();
		expect(screen.getByText('Disabled')).toBeInTheDocument();
		// 2 inactive rules → 2 "OK" badges
		expect(screen.getAllByText('OK')).toHaveLength(2);
	});

	it('renders severity badges for rules with severity', async () => {
		renderListAlertRules();

		await waitFor(
			() => expect(screen.getByText('High CPU Alert')).toBeInTheDocument(),
			{ timeout: 5000 },
		);

		expect(screen.getAllByText('critical').length).toBeGreaterThan(0);
		expect(screen.getByText('warning')).toBeInTheDocument();
		expect(screen.getByText('info')).toBeInTheDocument();
	});

	it('renders header controls (search, columns, new alert)', async () => {
		renderListAlertRules();

		await waitFor(
			() => expect(screen.getByText('High CPU Alert')).toBeInTheDocument(),
			{ timeout: 5000 },
		);

		expect(screen.getByTestId('list-alerts-search-input')).toBeInTheDocument();
		expect(screen.getByTestId('alert-columns-button')).toBeInTheDocument();
		expect(
			screen.getByTestId('list-alerts-new-alert-button'),
		).toBeInTheDocument();
	});
});
