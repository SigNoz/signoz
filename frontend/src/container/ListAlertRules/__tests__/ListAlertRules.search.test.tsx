import { cleanup, fireEvent, screen, waitFor } from 'tests/test-utils';

import { flushNuqsUrl, renderListAlertRules, resetUrl } from './_helpers';

jest.mock(
	'@signozhq/ui/divider',
	() => ({
		Divider: ({ children }: { children?: React.ReactNode }): JSX.Element => (
			<div>{children}</div>
		),
	}),
	{ virtual: true },
);

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: jest.fn(() => ({ safeNavigate: jest.fn() })),
}));

jest.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn(),
}));

function getSearchInput(): HTMLInputElement {
	return screen.getByTestId('list-alerts-search-input') as HTMLInputElement;
}

jest.setTimeout(20000);

describe('ListAlertRules — search', () => {
	beforeEach(() => {
		jest.setSystemTime(new Date('2023-10-20T12:00:00Z'));
		cleanup();
		resetUrl();
	});

	afterEach(async () => {
		await flushNuqsUrl();
		resetUrl();
	});

	it('filters rows by alert name with debounce', async () => {
		renderListAlertRules();

		await screen.findByText('High CPU Alert', {}, { timeout: 5000 });

		fireEvent.change(getSearchInput(), { target: { value: 'CPU' } });

		await waitFor(
			() => {
				expect(screen.getByText('High CPU Alert')).toBeInTheDocument();
				expect(screen.queryByText('Memory Pending Alert')).not.toBeInTheDocument();
			},
			{ timeout: 3000 },
		);
	});

	it('filters rows by label values (severity)', async () => {
		renderListAlertRules();

		await screen.findByText('High CPU Alert', {}, { timeout: 5000 });

		fireEvent.change(getSearchInput(), { target: { value: 'warning' } });

		await waitFor(
			() => {
				expect(screen.getByText('Memory Pending Alert')).toBeInTheDocument();
				expect(screen.queryByText('High CPU Alert')).not.toBeInTheDocument();
			},
			{ timeout: 3000 },
		);
	});

	it('restores all rows when search is cleared', async () => {
		renderListAlertRules();

		await screen.findByText('High CPU Alert', {}, { timeout: 5000 });

		fireEvent.change(getSearchInput(), { target: { value: 'CPU' } });

		await waitFor(
			() => {
				expect(screen.queryByText('Memory Pending Alert')).not.toBeInTheDocument();
			},
			{ timeout: 3000 },
		);

		fireEvent.change(getSearchInput(), { target: { value: '' } });

		await waitFor(
			() => {
				expect(screen.getByText('High CPU Alert')).toBeInTheDocument();
				expect(screen.getByText('Memory Pending Alert')).toBeInTheDocument();
				expect(screen.getByText('Healthy Alert')).toBeInTheDocument();
			},
			{ timeout: 3000 },
		);
	});

	it('shows no-results state when no match', async () => {
		renderListAlertRules();

		await screen.findByText('High CPU Alert', {}, { timeout: 5000 });

		fireEvent.change(getSearchInput(), {
			target: { value: 'zzzzzz-no-match' },
		});

		await waitFor(
			() => {
				expect(screen.getByTestId('no-results-empty-state')).toBeInTheDocument();
				expect(screen.getByText('No matching alert rules')).toBeInTheDocument();
			},
			{ timeout: 3000 },
		);
	});

	it('resets page to 1 when search debounce fires', async () => {
		renderListAlertRules({ initialRoute: '/?page=2' });

		await screen.findByText('High CPU Alert', {}, { timeout: 5000 });

		fireEvent.change(getSearchInput(), { target: { value: 'CPU' } });

		await waitFor(
			() => {
				expect(window.location.search).not.toContain('page=2');
			},
			{ timeout: 3000 },
		);
	});
});
