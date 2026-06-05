import { logEventMock } from '__tests__/logEventMock';
import { safeNavigateMock } from '__tests__/safeNavigateMock';
import userEvent from '@testing-library/user-event';
import ROUTES from 'constants/routes';
import { screen, waitFor } from 'tests/test-utils';

import { renderListAlertRules } from './_helpers';

describe('ListAlertRules — new alert button', () => {
	beforeEach(() => {
		jest.setSystemTime(new Date('2023-10-20T12:00:00Z'));
	});

	it('plain click navigates to ALERTS_NEW with newTab:false', async () => {
		const user = userEvent.setup({ delay: null });
		renderListAlertRules();

		await screen.findByText('High CPU Alert');

		await user.click(screen.getByRole('button', { name: /new alert/i }));

		await waitFor(() => {
			expect(safeNavigateMock).toHaveBeenCalled();
		});
		expect(safeNavigateMock).toHaveBeenCalledWith(
			ROUTES.ALERTS_NEW,
			expect.objectContaining({ newTab: false }),
		);
	});

	it('logs Alert: New alert button clicked', async () => {
		const user = userEvent.setup({ delay: null });
		renderListAlertRules();

		await screen.findByText('High CPU Alert');

		await user.click(screen.getByRole('button', { name: /new alert/i }));

		await waitFor(() => {
			expect(logEventMock).toHaveBeenCalledWith(
				'Alert: New alert button clicked',
				expect.objectContaining({ layout: 'new' }),
			);
		});
	});

	it('ctrl+click on New Alert opens in a new tab (newTab:true)', async () => {
		const user = userEvent.setup({ delay: null });
		renderListAlertRules();

		await screen.findByText('High CPU Alert');

		await user.keyboard('{Control>}');
		await user.click(screen.getByRole('button', { name: /new alert/i }));
		await user.keyboard('{/Control}');

		await waitFor(() => {
			expect(safeNavigateMock).toHaveBeenCalled();
		});
		expect(safeNavigateMock).toHaveBeenCalledWith(
			ROUTES.ALERTS_NEW,
			expect.objectContaining({ newTab: true }),
		);
	});
});
