import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';
import {
	mockUseAuthZDenyAll,
	denyPermissions,
	mockUseAuthZGrantAll,
	mockUseAuthZGrantByPrefix,
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
	ruleViewsFixture,
} from 'mocks-server/__mockdata__/alert_rules';
import * as rulesApi from 'api/generated/services/rules';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { screen, userEvent, waitFor, within } from 'tests/test-utils';

import { renderListAlertRules } from './_helpers';

const NEW_ALERT = 'list-alerts-new-alert-button';
const RULE_ID = String(
	alertRulesFixture.find((rule) => rule.alert === 'High CPU Alert')?.id,
);

async function openFirstRowMenu(): Promise<void> {
	const row = await screen.findByTestId(`alert-row-${RULE_ID}`);
	await userEvent.setup().click(within(row).getByTestId('alert-actions'));
	await screen.findByTestId('alert-actions-item-edit');
}

/** Waits for the row's check, then reports whether it ended up disabled. */
async function isRowDisabled(testId: string): Promise<boolean> {
	const item = await screen.findByTestId(testId);
	await waitFor(() => expect(item).not.toHaveAttribute('data-loading'));
	return item.hasAttribute('data-disabled');
}

jest.mock('lib/authz/hooks/useAuthZ/useAuthZ');

describe('ListAlertRules — permissions', () => {
	beforeEach(() => {
		jest.setSystemTime(new Date('2023-10-20T12:00:00Z'));
		denyPermissions();
	});

	it('enables New Alert and every row action with every permission', async () => {
		renderListAlertRules();

		await waitFor(() =>
			expect(screen.getByTestId(NEW_ALERT)).toHaveAttribute(
				'aria-disabled',
				'false',
			),
		);
		await openFirstRowMenu();
		for (const action of ['toggle', 'edit', 'edit-new-tab', 'clone', 'delete']) {
			await expect(isRowDisabled(`alert-actions-item-${action}`)).resolves.toBe(
				false,
			);
		}
	});

	it('disables New Alert without create and names it', async () => {
		denyPermissions(RuleCreatePermission);
		renderListAlertRules();

		await waitFor(() =>
			expect(screen.getByTestId(NEW_ALERT)).toHaveAttribute(
				'data-denied-permissions',
				RuleCreatePermission,
			),
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
		denyPermissions(RuleCreatePermission);
		renderListAlertRules();

		await waitFor(() =>
			expect(screen.getByTestId('add-alert')).toHaveAttribute(
				'data-denied-permissions',
				RuleCreatePermission,
			),
		);
	});

	it('shows a permission callout instead of the table without list', async () => {
		jest.mocked(useAuthZ).mockImplementation(mockUseAuthZDenyAll);
		renderListAlertRules();

		// One callout for the table, one for the saved views.
		await expect(screen.findAllByText('list:rule:*')).resolves.toHaveLength(2);
		expect(screen.queryByText('High CPU Alert')).not.toBeInTheDocument();
	});

	it('keeps the table while listing is allowed', async () => {
		jest
			.mocked(useAuthZ)
			.mockImplementation(mockUseAuthZGrantByPrefix(RuleListPermission));
		renderListAlertRules();

		await expect(
			screen.findByText('High CPU Alert'),
		).resolves.toBeInTheDocument();
		expect(screen.queryByText('list:rule:*')).not.toBeInTheDocument();
	});

	it('locks toggle and both edits without update; clone and delete stay', async () => {
		denyPermissions(buildRuleUpdatePermission(RULE_ID));
		renderListAlertRules();

		await openFirstRowMenu();
		await expect(isRowDisabled('alert-actions-item-toggle')).resolves.toBe(true);
		await expect(isRowDisabled('alert-actions-item-edit')).resolves.toBe(true);
		await expect(isRowDisabled('alert-actions-item-edit-new-tab')).resolves.toBe(
			true,
		);
		await expect(isRowDisabled('alert-actions-item-clone')).resolves.toBe(false);
		await expect(isRowDisabled('alert-actions-item-delete')).resolves.toBe(false);
	});

	it('locks edit and clone without read on the rule', async () => {
		denyPermissions(buildRuleReadPermission(RULE_ID));
		renderListAlertRules();

		await openFirstRowMenu();
		await expect(isRowDisabled('alert-actions-item-edit')).resolves.toBe(true);
		await expect(isRowDisabled('alert-actions-item-clone')).resolves.toBe(true);
		await expect(isRowDisabled('alert-actions-item-toggle')).resolves.toBe(false);
	});

	it('locks clone without create', async () => {
		denyPermissions(RuleCreatePermission);
		renderListAlertRules();

		await openFirstRowMenu();
		await expect(isRowDisabled('alert-actions-item-clone')).resolves.toBe(true);
		await expect(isRowDisabled('alert-actions-item-edit')).resolves.toBe(false);
	});

	it('locks delete without delete on the rule', async () => {
		denyPermissions(buildRuleDeletePermission(RULE_ID));
		renderListAlertRules();

		await openFirstRowMenu();
		await expect(isRowDisabled('alert-actions-item-delete')).resolves.toBe(true);
		await expect(isRowDisabled('alert-actions-item-toggle')).resolves.toBe(false);
	});

	describe('saved views', () => {
		it('shows the denial and asks for no views without list', async () => {
			denyPermissions(RuleListPermission);
			const listViews = jest.spyOn(rulesApi, 'useListRuleViews');
			renderListAlertRules();

			await expect(
				screen.findByTestId('views-rail-denied'),
			).resolves.toHaveTextContent('list:rule');
			expect(listViews).toHaveBeenCalled();
			for (const [options] of listViews.mock.calls) {
				expect(options?.query?.enabled).toBe(false);
			}
			listViews.mockRestore();
		});

		it('still lists the views when the permission check fails', async () => {
			jest.mocked(useAuthZ).mockImplementation((checks) => ({
				...mockUseAuthZGrantAll(checks),
				error: new Error('check failed'),
				permissions: null,
				isGranted: (): boolean => false,
			}));
			renderListAlertRules();

			await expect(
				screen.findByTestId(`alert-rules-view-${ruleViewsFixture[0].id}`),
			).resolves.toBeInTheDocument();
			expect(screen.queryByTestId('views-rail-denied')).not.toBeInTheDocument();
		});
	});
});
