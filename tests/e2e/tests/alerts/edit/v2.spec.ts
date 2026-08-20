import { expect, test } from '../../../fixtures/alerts/alert-rules';
import {
	ALERT_EDIT_PATH,
	EVALUATION_WINDOW_PRESETS,
	evaluationCadenceInput,
	evaluationCadenceUnitSelect,
	evaluationSettingsButton,
	evaluationWindowOption,
	expandAdvancedOptions,
	openEvaluationSettings,
	thresholdRows,
	ThresholdMatchType,
	ThresholdOperator,
	v2ClickDiscard,
	v2SaveButton,
} from '../../../helpers/alert-forms';
import { gotoAlertOverview } from '../../../helpers/alerts';
import { watchConsole } from '../../../helpers/common';

// TC-* — editing a rule whose `schemaVersion` is `v2alpha1`.
//
// Unless a scenario says otherwise these run through `/alerts/overview?ruleId=`,
// which is the route the rules list's Edit action actually uses. EV2-12 is the
// exception and the reason the distinction matters: the same editor reached
// through `/alerts/edit` has no `CreateAlertProvider` above it.

/**
 * SEED-RV2 — a v2 rule whose every asserted field differs from the create-form
 * default, so a passing prefill assertion cannot be satisfied by the defaults.
 */
const SEED_RV2 = {
	target: 42,
	warningTarget: 21,
	evalWindow: '10m0s',
	/** Deliberately *not* one of the rolling presets — see EV2-05. */
	customEvalWindow: '7m0s',
	frequency: '5m',
	renotifyInterval: '2h',
	absentFor: 7,
} as const;

/** PUT for one specific rule. v1 and v2 share this endpoint. */
function isRuleUpdate(url: string, method: string, ruleId: string): boolean {
	return method === 'PUT' && url.includes(`/api/v2/rules/${ruleId}`);
}

test.describe('Alert edit — v2 rule', () => {
	test('TC-01 the v2 editor renders inside the details shell', async ({
		authedPage: page,
		ownedRules,
	}) => {
		const ruleId = await ownedRules.threshold(`e2e-ev2-shell-${Date.now()}`, {
			target: SEED_RV2.target,
		});

		await gotoAlertOverview(page, ruleId);

		const root = page.getByTestId('alert-details-root');
		await expect(root).toHaveClass(/alert-details-v2/);
		await expect(root).toHaveAttribute('data-schema-version', 'v2alpha1');

		// `CreateAlertHeader` hides the whole tab bar in edit mode, which removes both
		// the "New Alert Rule" chip and the classic-experience escape hatch. The escape
		// hatch matters: switching experiences mid-edit would silently drop the loaded
		// rule.
		await expect(page.getByTestId('alert-name-input')).toBeVisible();
		await expect(page.getByText('New Alert Rule')).toBeHidden();
		await expect(
			page.getByRole('button', { name: 'Switch to Classic Experience' }),
		).toBeHidden();
	});

	test('TC-02 name and labels prefill from the rule', async ({
		authedPage: page,
		ownedRules,
	}) => {
		const name = `e2e-ev2-prefill-${Date.now()}`;
		const ruleId = await ownedRules.threshold(name, {
			target: SEED_RV2.target,
			labels: { severity: 'critical', team: 'payments' },
		});

		await gotoAlertOverview(page, ruleId);

		await expect(page.getByTestId('alert-name-input')).toHaveValue(name);
		await expect(page.getByTestId('label-pill-severity-critical')).toBeVisible();
		await expect(page.getByTestId('label-pill-team-payments')).toBeVisible();
	});

	test('TC-03 both thresholds prefill, and the sentence reads spec[0]', async ({
		authedPage: page,
		ownedRules,
		alertChannel,
	}) => {
		const ruleId = await ownedRules.threshold(
			`e2e-ev2-thresholds-${Date.now()}`,
			{
				thresholds: [
					{
						name: 'critical',
						target: SEED_RV2.target,
						op: ThresholdOperator.BELOW.value,
						matchType: ThresholdMatchType.ALL_THE_TIME.value,
						channels: [alertChannel.name],
					},
					{
						name: 'warning',
						target: SEED_RV2.warningTarget,
						op: ThresholdOperator.BELOW.value,
						matchType: ThresholdMatchType.ALL_THE_TIME.value,
						channels: [alertChannel.name],
					},
				],
			},
		);

		await gotoAlertOverview(page, ruleId);

		await expect(thresholdRows(page)).toHaveCount(2);
		await expect(page.getByTestId('threshold-name-input').nth(0)).toHaveValue(
			'critical',
		);
		await expect(page.getByTestId('threshold-name-input').nth(1)).toHaveValue(
			'warning',
		);
		await expect(page.getByTestId('threshold-value-input').nth(0)).toHaveValue(
			String(SEED_RV2.target),
		);
		await expect(page.getByTestId('threshold-value-input').nth(1)).toHaveValue(
			String(SEED_RV2.warningTarget),
		);

		// The condition sentence is rule-wide in the UI but per-threshold in the schema,
		// and the mapper reads it back from `spec[0]` only. Both seeded thresholds share
		// op/matchType so this row stays about prefill.
		await expect(
			page.getByTestId('alert-threshold-operator-select'),
		).toContainText(ThresholdOperator.BELOW.label);
		await expect(
			page.getByTestId('alert-threshold-match-type-select'),
		).toContainText(ThresholdMatchType.ALL_THE_TIME.label);
	});

	test('TC-04 the recovery threshold control never renders', async ({
		authedPage: page,
		ownedRules,
	}) => {
		const ruleId = await ownedRules.threshold(`e2e-ev2-recovery-${Date.now()}`, {
			target: SEED_RV2.target,
			recoveryTarget: 10,
		});

		await gotoAlertOverview(page, ruleId);

		// `showRecoveryThreshold` starts false and its only setter is commented out, so a
		// seeded `recoveryTarget` has nowhere to land. If either locator ever appears the
		// feature was finished, and CV2-13/EV2-04 need rewriting rather than deleting.
		await expect(page.getByTestId('recovery-threshold-value-input')).toHaveCount(
			0,
		);
		await expect(
			page.getByTestId('remove-recovery-threshold-button'),
		).toHaveCount(0);
	});

	test('TC-05 the evaluation window prefills, and a non-preset value collapses to custom', async ({
		authedPage: page,
		ownedRules,
	}) => {
		const presetRule = await ownedRules.threshold(
			`e2e-ev2-window-${Date.now()}`,
			{ target: SEED_RV2.target, evalWindow: SEED_RV2.evalWindow },
		);

		await gotoAlertOverview(page, presetRule);

		// The trigger button carries both halves of the window: the timeframe label and
		// the window *type*, which comes from the seeded `evaluation.kind`.
		await expect(evaluationSettingsButton(page)).toContainText(
			EVALUATION_WINDOW_PRESETS[SEED_RV2.evalWindow],
		);
		await expect(evaluationSettingsButton(page)).toContainText('Rolling');

		const customRule = await ownedRules.threshold(
			`e2e-ev2-window-custom-${Date.now()}`,
			{ target: SEED_RV2.target, evalWindow: SEED_RV2.customEvalWindow },
		);

		await gotoAlertOverview(page, customRule);

		// `getRollingWindowTimeframe` only recognises the seven presets; anything else
		// becomes `custom`, and the label is then built from the parsed number + unit. So
		// a rule created outside the UI with an odd window keeps its value — it just
		// renders through the custom branch.
		await expect(evaluationSettingsButton(page)).toContainText('Last 7 Minutes');
		await openEvaluationSettings(page);
		await expect(evaluationWindowOption(page, 'timeframe', 'custom')).toHaveClass(
			/active/,
		);
	});

	test('TC-06 repeat notifications prefill from the seeded renotify block', async ({
		authedPage: page,
		ownedRules,
	}) => {
		const ruleId = await ownedRules.threshold(`e2e-ev2-renotify-${Date.now()}`, {
			target: SEED_RV2.target,
			renotify: {
				enabled: true,
				interval: SEED_RV2.renotifyInterval,
				alertStates: ['firing'],
			},
		});

		await gotoAlertOverview(page, ruleId);

		// Every control in the block is `disabled={!reNotification.enabled}`, so "is it
		// enabled" is a stronger read of the toggle than the Switch's own state.
		const interval = page.getByTestId('repeat-notifications-time-input');
		await expect(interval).toBeEnabled();
		// `parseGoTime` splits the Go duration into value + unit.
		await expect(interval).toHaveValue('2');
		await expect(
			page.getByTestId('repeat-notifications-unit-select'),
		).toContainText('Hours');
		await expect(
			page.getByTestId('repeat-notifications-conditions-select'),
		).toContainText('Firing');
	});

	test('TC-07 alertOnAbsent prefills the advanced options', async ({
		authedPage: page,
		ownedRules,
	}) => {
		const ruleId = await ownedRules.threshold(`e2e-ev2-absent-${Date.now()}`, {
			target: SEED_RV2.target,
			alertOnAbsent: { absentFor: SEED_RV2.absentFor },
		});

		await gotoAlertOverview(page, ruleId);
		await expandAdvancedOptions(page);

		const tolerance = page.getByTestId(
			'send-notification-if-data-is-missing-input',
		);
		await expect(tolerance).toBeVisible();
		await expect(tolerance).toHaveValue(String(SEED_RV2.absentFor));

		// The sibling option was not seeded, so its input stays behind the
		// `display: none` its container applies when the toggle is off — asserted so a
		// prefill that turned *every* advanced option on would still fail this row.
		await expect(
			page.getByTestId('enforce-minimum-datapoints-input'),
		).toBeHidden();
	});

	test('TC-08 the evaluation cadence always reads back in default mode', async ({
		authedPage: page,
		ownedRules,
	}) => {
		const ruleId = await ownedRules.threshold(`e2e-ev2-cadence-${Date.now()}`, {
			target: SEED_RV2.target,
			frequency: SEED_RV2.frequency,
		});

		await gotoAlertOverview(page, ruleId);
		await expandAdvancedOptions(page);

		await expect(evaluationCadenceInput(page)).toHaveValue('5');
		await expect(evaluationCadenceUnitSelect(page)).toContainText('Minutes');

		// `getAdvancedOptionsStateFromAlertDef` hardcodes `mode: 'default'`, and
		// `EditCustomSchedule` mounts only when the mode is *not* default — so a schedule
		// saved by any other client reopens as a plain interval and the next save
		// persists the flattened value. The custom and rrule modes are unreachable from
		// the UI (the "Add custom schedule" button is commented out) and unrepresentable
		// in the payload, so the flattening itself is what this row asserts; the day the
		// custom editor can mount, it fails.
		await expect(page.locator('.edit-custom-schedule')).toHaveCount(0);
	});

	test('TC-09 changing a threshold PUTs the rule and the change survives a reload', async ({
		authedPage: page,
		ownedRules,
	}) => {
		const name = `e2e-ev2-update-${Date.now()}`;
		const ruleId = await ownedRules.threshold(name, {
			target: SEED_RV2.target,
		});

		await gotoAlertOverview(page, ruleId);
		await page.getByTestId('threshold-value-input').first().fill('99');

		const [response] = await Promise.all([
			page.waitForResponse((r) =>
				isRuleUpdate(r.url(), r.request().method(), ruleId),
			),
			v2SaveButton(page).click(),
		]);

		expect(response.ok()).toBe(true);
		const body = response.request().postDataJSON();
		expect(body.condition.thresholds.spec[0].target).toBe(99);
		// The mapper hardcodes the schema version on every save, so an edit of a v2 rule
		// stays v2.
		expect(body.schemaVersion).toBe('v2alpha1');
		expect(body.alert).toBe(name);

		await expect(page.getByText('Alert rule updated successfully')).toBeVisible();
		await page.waitForURL(/\/alerts(\?|$)/);
		expect(new URL(page.url()).pathname).toBe('/alerts');

		// Re-read rather than trust the toast: the footer invalidates the rule and list
		// caches, and a stale cache would show the old value here.
		await gotoAlertOverview(page, ruleId);
		await expect(page.getByTestId('threshold-value-input').first()).toHaveValue(
			'99',
		);
	});

	test('TC-10 the footer save is what persists a rename made on the Overview tab', async ({
		authedPage: page,
		ownedRules,
	}) => {
		const name = `e2e-ev2-rename-${Date.now()}`;
		const renamed = `${name}-renamed`;
		const ruleId = await ownedRules.threshold(name, {
			target: SEED_RV2.target,
		});

		await gotoAlertOverview(page, ruleId);
		await page.getByTestId('alert-name-input').fill(renamed);

		// AD-03/AD-04 cover renaming through the details header's RenameModal, which
		// PATCHes on its own. This row is the other path: the editable header field is
		// local state until the *Footer* saves it, so the assertion is on the PUT body.
		const [response] = await Promise.all([
			page.waitForResponse((r) =>
				isRuleUpdate(r.url(), r.request().method(), ruleId),
			),
			v2SaveButton(page).click(),
		]);

		expect(response.request().postDataJSON().alert).toBe(renamed);

		await gotoAlertOverview(page, ruleId);
		await expect(page.getByTestId('alert-name-input')).toHaveValue(renamed);
	});

	test('TC-11 Discard leaves without a PUT and without touching the rule', async ({
		authedPage: page,
		ownedRules,
	}) => {
		const name = `e2e-ev2-discard-${Date.now()}`;
		const ruleId = await ownedRules.threshold(name, {
			target: SEED_RV2.target,
		});

		await gotoAlertOverview(page, ruleId);

		let sawPut = false;
		page.on('request', (request) => {
			if (request.method() === 'PUT' && request.url().includes('/rules/')) {
				sawPut = true;
			}
		});

		await page.getByTestId('threshold-value-input').first().fill('999');
		// dispatchEvent, not click — the side navigation covers the button (CE-09).
		await v2ClickDiscard(page);
		await page.waitForURL(/\/alerts(\?|$)/);

		expect(sawPut).toBe(false);

		// `discardAlertRule` also forces the *context's* alertType back to metrics, which
		// is harmless on the way out only if the stored rule is untouched.
		await gotoAlertOverview(page, ruleId);
		await expect(page.getByTestId('threshold-value-input').first()).toHaveValue(
			String(SEED_RV2.target),
		);
		await expect(page.getByTestId('alert-name-input')).toHaveValue(name);
	});

	test('TC-12 /alerts/edit is a legacy alias that redirects into the details shell', async ({
		authedPage: page,
		ownedRules,
	}) => {
		const ruleId = await ownedRules.threshold(
			`e2e-ev2-standalone-${Date.now()}`,
			{ target: SEED_RV2.target },
		);

		// Reading the components suggests this route should crash: `EditAlertV2` renders
		// Footer/AlertCondition/NotificationSettings, all of which call
		// `useCreateAlertState()`, and the only provider lives in `AlertDetails.tsx`. It
		// does not crash, because `/alerts/edit` never renders `pages/EditRules` at all —
		// `AppRoutes/Private.tsx` redirects the legacy alias to `/alerts/overview`,
		// merging the search params, before route matching.
		//
		// Worth keeping despite being a redirect: the alias is linked from the AI
		// assistant and Metrics Explorer, so a regression in `oldNewRoutesMapping` would
		// break real product links.
		const watch = watchConsole(page);
		await page.goto(`${ALERT_EDIT_PATH}?ruleId=${ruleId}`);

		await page.waitForURL(/\/alerts\/overview/);
		expect(new URL(page.url()).pathname).toBe('/alerts/overview');
		expect(new URL(page.url()).searchParams.get('ruleId')).toBe(ruleId);

		// The editor mounted under the shell's provider, so the missing-provider error
		// never fires. Asserted explicitly: if someone removes the redirect entry, this
		// is the message that would appear.
		await expect(thresholdRows(page)).toHaveCount(1);
		expect(
			watch.errors.filter((message) =>
				message.includes('useCreateAlertState must be used within'),
			),
		).toEqual([]);
	});
});
