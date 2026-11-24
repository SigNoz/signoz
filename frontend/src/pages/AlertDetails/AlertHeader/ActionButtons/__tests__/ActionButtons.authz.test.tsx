import { render, screen, userEvent } from 'tests/test-utils';
import {
	buildRuleDeletePermission,
	buildRuleUpdatePermission,
	RuleCreatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/rule.permissions';
import { denyPermissions } from 'lib/authz/utils/authz-test-utils';
import AlertRuleProvider from 'providers/Alert';
import { defaultPostableAlertRuleV2 } from 'container/CreateAlert/constants';

import AlertActionButtons from '../ActionButtons';

jest.mock('lib/authz/hooks/useAuthZ/useAuthZ');

const RULE_ID = 'rule-1';

const renderButtons = (): void => {
	render(
		<AlertRuleProvider>
			<AlertActionButtons
				ruleId={RULE_ID}
				alertDetails={{ ...defaultPostableAlertRuleV2, state: 'firing' }}
			/>
		</AlertRuleProvider>,
	);
};

const openMenu = async (): Promise<void> => {
	await userEvent
		.setup({ pointerEventsCheck: 0 })
		.click(screen.getByTestId('alert-actions-menu'));
	await screen.findByTestId('alert-details-action-clone');
};

const isLocked = (testId: string): boolean =>
	screen.getByTestId(testId).hasAttribute('data-disabled');

describe('AlertActionButtons - AuthZ', () => {
	beforeEach(() => {
		denyPermissions();
	});

	it('leaves every action open with every permission', async () => {
		renderButtons();
		await openMenu();

		expect(screen.getByTestId('alert-actions-toggle')).not.toHaveAttribute(
			'aria-disabled',
			'true',
		);
		expect(isLocked('alert-details-action-clone')).toBe(false);
		expect(isLocked('alert-details-action-delete')).toBe(false);
	});

	it('locks the enable toggle without update', () => {
		denyPermissions(buildRuleUpdatePermission(RULE_ID));
		renderButtons();

		expect(screen.getByTestId('alert-actions-toggle')).toHaveAttribute(
			'aria-disabled',
			'true',
		);
	});

	it('locks clone without create, leaving delete open', async () => {
		denyPermissions(RuleCreatePermission);
		renderButtons();
		await openMenu();

		expect(isLocked('alert-details-action-clone')).toBe(true);
		expect(isLocked('alert-details-action-delete')).toBe(false);
	});

	it('locks delete without delete on the rule', async () => {
		denyPermissions(buildRuleDeletePermission(RULE_ID));
		renderButtons();
		await openMenu();

		expect(isLocked('alert-details-action-delete')).toBe(true);
		expect(isLocked('alert-details-action-clone')).toBe(false);
	});
});
