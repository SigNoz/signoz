import ROUTES from 'constants/routes';
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

const safeNavigateMock = jest.fn();
jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: jest.fn(() => ({ safeNavigate: safeNavigateMock })),
}));

const logEventMock = jest.fn();
jest.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: (...args: unknown[]): unknown => logEventMock(...args),
}));

jest.setTimeout(20000);

describe('ListAlertRules — new alert button', () => {
	beforeEach(() => {
		jest.setSystemTime(new Date('2023-10-20T12:00:00Z'));
		cleanup();
		resetUrl();
	});

	afterEach(async () => {
		await flushNuqsUrl();
		resetUrl();
	});

	it('plain click navigates to ALERTS_NEW with newTab:false', async () => {
		renderListAlertRules();

		await screen.findByText('High CPU Alert', {}, { timeout: 5000 });

		fireEvent.click(screen.getByTestId('list-alerts-new-alert-button'));

		await waitFor(() => {
			expect(safeNavigateMock).toHaveBeenCalled();
		});
		expect(safeNavigateMock).toHaveBeenCalledWith(
			ROUTES.ALERTS_NEW,
			expect.objectContaining({ newTab: false }),
		);
	});

	it('logs Alert: New alert button clicked', async () => {
		renderListAlertRules();

		await screen.findByText('High CPU Alert', {}, { timeout: 5000 });

		fireEvent.click(screen.getByTestId('list-alerts-new-alert-button'));

		await waitFor(() => {
			expect(logEventMock).toHaveBeenCalledWith(
				'Alert: New alert button clicked',
				expect.objectContaining({ layout: 'new' }),
			);
		});
	});

	it('ctrl+click on New Alert opens in a new tab (newTab:true)', async () => {
		renderListAlertRules();

		await screen.findByText('High CPU Alert', {}, { timeout: 5000 });

		fireEvent.click(screen.getByTestId('list-alerts-new-alert-button'), {
			ctrlKey: true,
		});

		await waitFor(() => {
			expect(safeNavigateMock).toHaveBeenCalled();
		});
		expect(safeNavigateMock).toHaveBeenCalledWith(
			ROUTES.ALERTS_NEW,
			expect.objectContaining({ newTab: true }),
		);
	});
});
