import { safeNavigateMock } from '__tests__/safeNavigateMock';
import { useAlertRuleViewsStore } from 'container/ListAlertRules/useAlertRuleViewsStore';
import { screen, userEvent, waitFor } from 'tests/test-utils';

import { renderListAlertRules } from './_helpers';

const RULE_NAME_CELL_TEST_ID = 'alert-row-rule-1-name';

describe('ListAlertRules — row click navigation', () => {
	beforeEach(() => {
		jest.setSystemTime(new Date('2023-10-20T12:00:00Z'));
		useAlertRuleViewsStore.setState({ recent: [] });
	});

	it('clicking a row calls safeNavigate to alerts/overview with ruleId', async () => {
		const user = userEvent.setup({ delay: null });
		renderListAlertRules();

		await user.click(await screen.findByTestId(RULE_NAME_CELL_TEST_ID));

		await waitFor(() => {
			expect(safeNavigateMock).toHaveBeenCalled();
		});

		const [url] = safeNavigateMock.mock.calls[0];
		expect(url).toContain('/alerts/overview?');
		expect(url).toContain('ruleId=rule-1');
		expect(url).not.toContain('compositeQuery=');
	});

	it('records an opened rule as recently viewed, most recent first', async () => {
		const user = userEvent.setup({ delay: null });
		useAlertRuleViewsStore.setState({ recent: ['rule-2', 'rule-1'] });
		renderListAlertRules();

		await user.click(await screen.findByTestId(RULE_NAME_CELL_TEST_ID));

		await waitFor(() => {
			expect(useAlertRuleViewsStore.getState().recent).toStrictEqual([
				'rule-1',
				'rule-2',
			]);
		});
	});

	it('ctrl+click on a row navigates with newTab option', async () => {
		const user = userEvent.setup({ delay: null });
		renderListAlertRules();

		const ruleCell = await screen.findByTestId(RULE_NAME_CELL_TEST_ID);

		await user.keyboard('{Control>}');
		await user.click(ruleCell);
		await user.keyboard('{/Control}');

		await waitFor(() => {
			expect(safeNavigateMock).toHaveBeenCalled();
		});

		const [url, options] = safeNavigateMock.mock.calls[0];
		expect(url).toContain('ruleId=rule-1');
		expect(options).toStrictEqual(expect.objectContaining({ newTab: true }));
	});
});
