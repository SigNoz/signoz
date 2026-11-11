import userEvent from '@testing-library/user-event';
import {
	setupAuthzAllow,
	setupAuthzDeny,
	setupAuthzDenyAll,
} from 'lib/authz/utils/authz-test-utils';
import {
	buildRuleDeletePermission,
	buildRuleReadPermission,
	buildRuleUpdatePermission,
	RuleCreatePermission,
	RuleListPermission,
} from 'lib/authz/hooks/useAuthZ/permissions/rule.permissions';
import {
	alertRulesFixture,
	listRulesV3Response,
} from 'mocks-server/__mockdata__/alert_rules';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { screen, waitFor } from 'tests/test-utils';

import { findAlertRow, renderListAlertRules } from './_helpers';

const NEW_ALERT = 'list-alerts-new-alert-button';
const RULE_ID = String(
	alertRulesFixture.find((rule) => rule.alert === 'High CPU Alert')?.id,
);

async function openFirstRowMenu(): Promise<void> {
	const row = await findAlertRow('High CPU Alert');
	const trigger = row.querySelector<HTMLElement>(
		'[data-testid="alert-actions"]',
	);
	expect(trigger).not.toBeNull();
	await userEvent.setup({ delay: null }).click(trigger as HTMLElement);
	await screen.findByRole('menu');
}

/** Waits for the row's check, then reports whether it ended up disabled. */
async function isRowDisabled(testId: string): Promise<boolean> {
	const item = await screen.findByTestId(testId);
	await waitFor(() => expect(item).not.toHaveAttribute('data-loading'), {
		timeout: 5000,
	});
	return item.hasAttribute('data-disabled');
}

describe('ListAlertRules — permissions', () => {
	beforeEach(() => {
		jest.setSystemTime(new Date('2023-10-20T12:00:00Z'));
	});

	it('enables New Alert and every row action with every permission', async () => {
		renderListAlertRules();

		await waitFor(
			() =>
				expect(screen.getByTestId(NEW_ALERT)).toHaveAttribute(
					'aria-disabled',
					'false',
				),
			{ timeout: 5000 },
		);
		await openFirstRowMenu();
		for (const action of ['toggle', 'edit', 'edit-new-tab', 'clone', 'delete']) {
			await expect(isRowDisabled(`alert-action-${action}`)).resolves.toBe(false);
		}
		// Five row checks in sequence outlast the 5s default under a loaded run.
	}, 15_000);

	it('disables New Alert without create and names it', async () => {
		renderListAlertRules({ authz: setupAuthzDeny(RuleCreatePermission) });

		await waitFor(
			() =>
				expect(screen.getByTestId(NEW_ALERT)).toHaveAttribute(
					'data-denied-permissions',
					RuleCreatePermission,
				),
			{ timeout: 5000 },
		);
		expect(screen.getByTestId(NEW_ALERT)).toHaveAttribute(
			'aria-disabled',
			'true',
		);
	});

	it('disables the empty-state New Alert Rule without create', async () => {
		server.use(
			rest.get('http://localhost/api/v3/rules', (req, res, ctx) =>
				res(
					ctx.status(200),
					ctx.json(listRulesV3Response([], req.url.searchParams)),
				),
			),
		);
		renderListAlertRules({ authz: setupAuthzDeny(RuleCreatePermission) });

		await waitFor(
			() =>
				expect(screen.getByTestId('add-alert')).toHaveAttribute(
					'data-denied-permissions',
					RuleCreatePermission,
				),
			{ timeout: 5000 },
		);
	});

	it('shows a permission callout instead of the table without list', async () => {
		renderListAlertRules({ authz: setupAuthzDenyAll() });

		await expect(
			screen.findByText('list:rule:*', undefined, { timeout: 5000 }),
		).resolves.toBeInTheDocument();
		expect(screen.queryByText('High CPU Alert')).not.toBeInTheDocument();
	});

	it('keeps the table while listing is allowed', async () => {
		renderListAlertRules({ authz: setupAuthzAllow(RuleListPermission) });

		await expect(
			screen.findByText('High CPU Alert', undefined, { timeout: 5000 }),
		).resolves.toBeInTheDocument();
		expect(screen.queryByText('list:rule:*')).not.toBeInTheDocument();
	});

	it('locks toggle and both edits without update; clone and delete stay', async () => {
		renderListAlertRules({
			authz: setupAuthzDeny(buildRuleUpdatePermission(RULE_ID)),
		});

		await openFirstRowMenu();
		await expect(isRowDisabled('alert-action-toggle')).resolves.toBe(true);
		await expect(isRowDisabled('alert-action-edit')).resolves.toBe(true);
		await expect(isRowDisabled('alert-action-edit-new-tab')).resolves.toBe(true);
		await expect(isRowDisabled('alert-action-clone')).resolves.toBe(false);
		await expect(isRowDisabled('alert-action-delete')).resolves.toBe(false);
	});

	it('locks edit and clone without read on the rule', async () => {
		renderListAlertRules({
			authz: setupAuthzDeny(buildRuleReadPermission(RULE_ID)),
		});

		await openFirstRowMenu();
		await expect(isRowDisabled('alert-action-edit')).resolves.toBe(true);
		await expect(isRowDisabled('alert-action-clone')).resolves.toBe(true);
		await expect(isRowDisabled('alert-action-toggle')).resolves.toBe(false);
	});

	it('locks clone without create', async () => {
		renderListAlertRules({ authz: setupAuthzDeny(RuleCreatePermission) });

		await openFirstRowMenu();
		await expect(isRowDisabled('alert-action-clone')).resolves.toBe(true);
		await expect(isRowDisabled('alert-action-edit')).resolves.toBe(false);
	});

	it('locks delete without delete on the rule', async () => {
		renderListAlertRules({
			authz: setupAuthzDeny(buildRuleDeletePermission(RULE_ID)),
		});

		await openFirstRowMenu();
		await expect(isRowDisabled('alert-action-delete')).resolves.toBe(true);
		await expect(isRowDisabled('alert-action-toggle')).resolves.toBe(false);
	});
});
