import { safeNavigateMock } from '__tests__/safeNavigateMock';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from 'tests/test-utils';

import { renderListAlertRules } from './_helpers';

describe('ListAlertRules — row click navigation', () => {
	beforeEach(() => {
		jest.setSystemTime(new Date('2023-10-20T12:00:00Z'));
	});

	it('clicking a row calls safeNavigate to alerts/overview with composite query + ruleId', async () => {
		const user = userEvent.setup({ delay: null });
		renderListAlertRules();

		const ruleCell = await screen.findByText('High CPU Alert');

		const td = ruleCell.closest('td');
		expect(td).not.toBeNull();
		await user.click(td as HTMLElement);

		await waitFor(() => {
			expect(safeNavigateMock).toHaveBeenCalled();
		});

		const [url] = safeNavigateMock.mock.calls[0];
		expect(url).toContain('/alerts/overview?');
		expect(url).toContain('ruleId=rule-1');
		expect(url).toContain('panelTypes=graph');
		expect(url).toContain('compositeQuery=');
	});

	it('ctrl+click on a row navigates with newTab option', async () => {
		const user = userEvent.setup({ delay: null });
		renderListAlertRules();

		const ruleCell = await screen.findByText('High CPU Alert');

		const td = ruleCell.closest('td');
		await user.keyboard('{Control>}');
		await user.click(td as HTMLElement);
		await user.keyboard('{/Control}');

		await waitFor(() => {
			expect(safeNavigateMock).toHaveBeenCalled();
		});

		const [url, options] = safeNavigateMock.mock.calls[0];
		expect(url).toContain('ruleId=rule-1');
		expect(options).toStrictEqual(expect.objectContaining({ newTab: true }));
	});
});
