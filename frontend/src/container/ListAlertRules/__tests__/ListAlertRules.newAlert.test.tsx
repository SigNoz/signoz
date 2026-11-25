import { logEventMock } from '__tests__/logEventMock';
import { safeNavigateMock } from '__tests__/safeNavigateMock';
import ROUTES from 'constants/routes';
import AlertRulesHeaderActions from 'container/ListAlertRules/components/AlertRulesHeaderActions';
import { useAlertRulesHandlers } from 'container/ListAlertRules/useAlertRulesHandlers';
import { alertRulesFixture } from 'mocks-server/__mockdata__/alert_rules';
import { render, screen, userEvent } from 'tests/test-utils';

function HeaderActionsWithHandlers(): JSX.Element {
	const { handleNewAlert } = useAlertRulesHandlers(alertRulesFixture.length);
	return (
		<AlertRulesHeaderActions
			columns={[]}
			canAddAlert
			onNewAlert={handleNewAlert}
		/>
	);
}

describe('ListAlertRules — new alert button', () => {
	it('plain click navigates to ALERTS_NEW with newTab:false', async () => {
		const user = userEvent.setup();
		render(<HeaderActionsWithHandlers />);

		await user.click(screen.getByTestId('list-alerts-new-alert-button'));

		expect(safeNavigateMock).toHaveBeenCalledWith(
			ROUTES.ALERTS_NEW,
			expect.objectContaining({ newTab: false }),
		);
	});

	it('logs Alert: New alert button clicked', async () => {
		const user = userEvent.setup();
		render(<HeaderActionsWithHandlers />);

		await user.click(screen.getByTestId('list-alerts-new-alert-button'));

		expect(logEventMock).toHaveBeenCalledWith(
			'Alert: New alert button clicked',
			expect.objectContaining({
				layout: 'new',
				number: alertRulesFixture.length,
			}),
		);
	});

	it('ctrl+click on New Alert opens in a new tab (newTab:true)', async () => {
		const user = userEvent.setup();
		render(<HeaderActionsWithHandlers />);

		await user.keyboard('{Control>}');
		await user.click(screen.getByTestId('list-alerts-new-alert-button'));
		await user.keyboard('{/Control}');

		expect(safeNavigateMock).toHaveBeenCalledWith(
			ROUTES.ALERTS_NEW,
			expect.objectContaining({ newTab: true }),
		);
	});
});
