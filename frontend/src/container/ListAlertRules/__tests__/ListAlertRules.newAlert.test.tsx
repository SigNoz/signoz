import { logEventMock } from '__tests__/logEventMock';
import { safeNavigateMock } from '__tests__/safeNavigateMock';
import ROUTES from 'constants/routes';
import AlertRulesHeaderActions from 'container/ListAlertRules/components/AlertRulesHeaderActions';
import { useAlertRulesHandlers } from 'container/ListAlertRules/useAlertRulesHandlers';
import { setupAuthzAdmin } from 'lib/authz/utils/authz-test-utils';
import { alertRulesFixture } from 'mocks-server/__mockdata__/alert_rules';
import { server } from 'mocks-server/server';
import { render, userEvent } from 'tests/test-utils';

import { waitForAuthZButton } from './_helpers';

function HeaderActionsWithHandlers(): JSX.Element {
	const { handleNewAlert } = useAlertRulesHandlers(alertRulesFixture.length);
	return (
		<AlertRulesHeaderActions
			columns={[]}
			showNewAlert
			onNewAlert={handleNewAlert}
		/>
	);
}

describe('ListAlertRules — new alert button', () => {
	beforeEach(() => {
		server.use(setupAuthzAdmin());
	});

	it('plain click navigates to ALERTS_NEW with newTab:false', async () => {
		const user = userEvent.setup();
		render(<HeaderActionsWithHandlers />);

		await user.click(await waitForAuthZButton('list-alerts-new-alert-button'));

		expect(safeNavigateMock).toHaveBeenCalledWith(
			ROUTES.ALERTS_NEW,
			expect.objectContaining({ newTab: false }),
		);
	});

	it('logs Alert: New alert button clicked', async () => {
		const user = userEvent.setup();
		render(<HeaderActionsWithHandlers />);

		await user.click(await waitForAuthZButton('list-alerts-new-alert-button'));

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
		await user.click(await waitForAuthZButton('list-alerts-new-alert-button'));
		await user.keyboard('{/Control}');

		expect(safeNavigateMock).toHaveBeenCalledWith(
			ROUTES.ALERTS_NEW,
			expect.objectContaining({ newTab: true }),
		);
	});
});
