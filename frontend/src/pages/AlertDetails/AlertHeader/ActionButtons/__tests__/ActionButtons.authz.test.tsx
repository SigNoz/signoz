import { render, screen, userEvent } from 'tests/test-utils';
import {
	buildRuleDeletePermission,
	buildRuleUpdatePermission,
	RuleCreatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/rule.permissions';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';
import { mockUseAuthZDeny } from 'lib/authz/utils/authz-test-utils';
import AlertRuleProvider from 'providers/Alert';
import type { PostableAlertRuleV2 } from 'types/api/alerts/alertTypes';

import AlertActionButtons from '../ActionButtons';

jest.mock('lib/authz/hooks/useAuthZ/useAuthZ');

const RULE_ID = 'rule-1';

const deny = (...permissions: BrandedPermission[]): void => {
	jest.mocked(useAuthZ).mockImplementation(mockUseAuthZDeny(...permissions));
};

const renderButtons = (): void => {
	render(
		<AlertRuleProvider>
			<AlertActionButtons
				ruleId={RULE_ID}
				alertDetails={{ state: 'firing' } as PostableAlertRuleV2}
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
		deny();
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
		deny(buildRuleUpdatePermission(RULE_ID));
		renderButtons();

		expect(screen.getByTestId('alert-actions-toggle')).toHaveAttribute(
			'aria-disabled',
			'true',
		);
	});

	it('locks clone without create, leaving delete open', async () => {
		deny(RuleCreatePermission);
		renderButtons();
		await openMenu();

		expect(isLocked('alert-details-action-clone')).toBe(true);
		expect(isLocked('alert-details-action-delete')).toBe(false);
	});

	it('locks delete without delete on the rule', async () => {
		deny(buildRuleDeletePermission(RULE_ID));
		renderButtons();
		await openMenu();

		expect(isLocked('alert-details-action-delete')).toBe(true);
		expect(isLocked('alert-details-action-clone')).toBe(false);
	});
});
