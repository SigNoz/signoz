import { alertRulesFixture } from 'mocks-server/__mockdata__/alert_rules';
import { screen } from 'tests/test-utils';
import { USER_ROLES } from 'types/roles';

import { renderListAlertRules } from './_helpers';

function headerTexts(): string[] {
	return Array.from(document.querySelectorAll('th')).map(
		(h) => h.textContent ?? '',
	);
}

describe('ListAlertRules — permissions', () => {
	beforeEach(() => {
		jest.setSystemTime(new Date('2023-10-20T12:00:00Z'));
	});

	it('VIEWER role hides "New Alert" button and "Actions" column', async () => {
		renderListAlertRules({ role: USER_ROLES.VIEWER });

		await screen.findByTestId('alert-row-rule-1-name');

		expect(
			screen.queryByTestId('list-alerts-new-alert-button'),
		).not.toBeInTheDocument();
		expect(screen.queryByText('New Alert')).not.toBeInTheDocument();

		expect(headerTexts().some((t) => t.includes('Actions'))).toBe(false);
		expect(screen.queryByTestId('alert-actions')).not.toBeInTheDocument();
	});

	it.each([USER_ROLES.ADMIN, USER_ROLES.EDITOR])(
		'%s role shows "New Alert" button and "Actions" column',
		async (role) => {
			renderListAlertRules({ role });

			await expect(screen.findAllByTestId('alert-actions')).resolves.toHaveLength(
				alertRulesFixture.length,
			);
			expect(screen.getByTestId('list-alerts-new-alert-button')).toHaveTextContent(
				'New Alert',
			);
			expect(headerTexts().some((t) => t.includes('Actions'))).toBe(true);
		},
	);
});
