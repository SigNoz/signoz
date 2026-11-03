import {
	EVALUATION_WINDOW_PRESETS,
	expect,
	test,
	ThresholdMatchType,
	ThresholdOperator,
} from '../../drivers/alerts';

// Editing a rule whose `schemaVersion` is `v2alpha1`.
//
// These run through `/alerts/overview?ruleId=`, the route the list's Edit action
// uses. TC-07 is the exception and the reason the distinction matters: the same
// editor reached through `/alerts/edit` has no `CreateAlertProvider` above it.
//
// The rule-definition-to-form mapping itself is asserted in jest against
// `CreateAlertV2/context/utils`; what stays here is the round trip — that a rule
// the API created renders back through that mapper, and that a save persists.

/** Every asserted field differs from the create-form default, so a passing
 * prefill assertion cannot be satisfied by the defaults. */
const SEED = {
	target: 42,
	warningTarget: 21,
	evalWindow: '10m0s',
	/** Deliberately *not* one of the rolling presets. */
	customEvalWindow: '7m0s',
	frequency: '5m',
	renotifyInterval: '2h',
	absentFor: 7,
} as const;

test.describe('Alert edit', () => {
	test('TC-01 the v2 editor renders inside the details shell', async ({
		alerts,
		ownedRules,
	}) => {
		const ruleId = await ownedRules.threshold(`e2e-ev2-shell-${Date.now()}`, {
			target: SEED.target,
		});

		await alerts.details.gotoOverview(ruleId);

		const root = alerts.details.root();
		await expect(root).toHaveClass(/alert-details-v2/);
		await expect(root).toHaveAttribute('data-schema-version', 'v2alpha1');

		// `CreateAlertHeader` hides the whole tab bar in edit mode, which removes
		// the "New Alert Rule" chip and the classic-experience escape hatch.
		// Switching experiences mid-edit would silently drop the loaded rule.
		await expect(alerts.form.name()).toBeVisible();
		await expect(alerts.form.newRuleChip()).toBeHidden();
		await expect(alerts.form.switchToClassicButton()).toBeHidden();
	});

	test('TC-02 a seeded rule prefills every field it set', async ({
		alerts,
		alertChannel,
		ownedRules,
	}) => {
		const name = `e2e-ev2-prefill-${Date.now()}`;
		const ruleId = await ownedRules.threshold(name, {
			labels: { severity: 'critical', team: 'payments' },
			evalWindow: SEED.evalWindow,
			frequency: SEED.frequency,
			renotify: {
				enabled: true,
				interval: SEED.renotifyInterval,
				alertStates: ['firing'],
			},
			alertOnAbsent: { absentFor: SEED.absentFor },
			recoveryTarget: 10,
			thresholds: [
				{
					name: 'critical',
					target: SEED.target,
					op: ThresholdOperator.BELOW.value,
					matchType: ThresholdMatchType.ALL_THE_TIME.value,
					channels: [alertChannel.name],
				},
				{
					name: 'warning',
					target: SEED.warningTarget,
					op: ThresholdOperator.BELOW.value,
					matchType: ThresholdMatchType.ALL_THE_TIME.value,
					channels: [alertChannel.name],
				},
			],
		});

		await alerts.details.gotoOverview(ruleId);

		await expect(alerts.form.name()).toHaveValue(name);
		await expect(alerts.form.labelPill('severity', 'critical')).toBeVisible();
		await expect(alerts.form.labelPill('team', 'payments')).toBeVisible();

		await expect(alerts.form.thresholdRows()).toHaveCount(2);
		await expect(alerts.form.thresholdName(0)).toHaveValue('critical');
		await expect(alerts.form.thresholdName(1)).toHaveValue('warning');
		await expect(alerts.form.thresholdValue(0)).toHaveValue(String(SEED.target));
		await expect(alerts.form.thresholdValue(1)).toHaveValue(
			String(SEED.warningTarget),
		);

		// The condition sentence is rule-wide in the UI but per-threshold in the
		// schema, and the mapper reads it back from `spec[0]` only.
		await expect(alerts.form.thresholdOperatorSelect()).toContainText(
			ThresholdOperator.BELOW.label,
		);
		await expect(alerts.form.thresholdMatchTypeSelect()).toContainText(
			ThresholdMatchType.ALL_THE_TIME.label,
		);

		// `showRecoveryThreshold` starts false and its only setter is commented out,
		// so a seeded `recoveryTarget` has nowhere to land. If this ever appears the
		// feature was finished and the assertion needs rewriting, not deleting.
		await expect(alerts.form.recoveryThresholdValue()).toHaveCount(0);

		// The trigger carries both halves of the window: the timeframe label and the
		// window *type*, which comes from the seeded `evaluation.kind`.
		await expect(alerts.form.evaluationSettingsButton()).toContainText(
			EVALUATION_WINDOW_PRESETS[SEED.evalWindow],
		);
		await expect(alerts.form.evaluationSettingsButton()).toContainText('Rolling');

		// Every repeat-notification control is `disabled={!reNotification.enabled}`,
		// so "is it enabled" reads the toggle more strongly than the Switch itself.
		const interval = alerts.form.repeatNotificationsInterval();
		await expect(interval).toBeEnabled();
		// `parseGoTime` splits the Go duration into value + unit.
		await expect(interval).toHaveValue('2');
		await expect(alerts.form.repeatNotificationsUnitSelect()).toContainText(
			'Hours',
		);
		await expect(alerts.form.repeatNotificationsConditionsSelect()).toContainText(
			'Firing',
		);

		await alerts.form.expandAdvancedOptions();
		const tolerance = alerts.form.missingDataToleranceInput();
		await expect(tolerance).toHaveValue(String(SEED.absentFor));
		// The sibling option was not seeded, so it stays behind the `display: none`
		// its container applies — asserted so a prefill that turned *every* advanced
		// option on would still fail here.
		await expect(alerts.form.minimumDatapointsInput()).toBeHidden();

		await expect(alerts.form.evaluationCadenceInput()).toHaveValue('5');
		await expect(alerts.form.evaluationCadenceUnitSelect()).toContainText(
			'Minutes',
		);
		// `getAdvancedOptionsStateFromAlertDef` hardcodes `mode: 'default'`, and
		// `EditCustomSchedule` mounts only when the mode is not default — so a
		// schedule saved by another client reopens as a plain interval and the next
		// save persists the flattened value. The day the custom editor can mount,
		// this fails.
		await expect(alerts.form.customScheduleEditor()).toHaveCount(0);
	});

	test('TC-03 a non-preset evaluation window collapses to custom', async ({
		alerts,
		ownedRules,
	}) => {
		const ruleId = await ownedRules.threshold(
			`e2e-ev2-window-custom-${Date.now()}`,
			{ target: SEED.target, evalWindow: SEED.customEvalWindow },
		);

		await alerts.details.gotoOverview(ruleId);

		// `getRollingWindowTimeframe` only recognises the seven presets; anything
		// else becomes `custom` and the label is built from the parsed number and
		// unit, so a rule created outside the UI keeps its value.
		await expect(alerts.form.evaluationSettingsButton()).toContainText(
			'Last 7 Minutes',
		);
		await alerts.form.openEvaluationSettings();
		await expect(
			alerts.form.evaluationWindowOption('timeframe', 'custom'),
		).toHaveClass(/active/);
	});

	test('TC-04 changing a threshold PUTs the rule and survives a reload', async ({
		authedPage: page,
		alerts,
		ownedRules,
	}) => {
		const name = `e2e-ev2-update-${Date.now()}`;
		const ruleId = await ownedRules.threshold(name, { target: SEED.target });

		await alerts.details.gotoOverview(ruleId);
		await alerts.form.thresholdValue().fill('99');

		const [response] = await Promise.all([
			page.waitForResponse(
				(res) =>
					res.request().method() === 'PUT' &&
					res.url().includes(`/api/v2/rules/${ruleId}`),
			),
			alerts.form.saveButton().click(),
		]);

		expect(response.ok()).toBe(true);
		const body = response.request().postDataJSON();
		expect(body.condition.thresholds.spec[0].target).toBe(99);
		// The mapper hardcodes the schema version on every save, so editing a v2
		// rule keeps it v2.
		expect(body.schemaVersion).toBe('v2alpha1');
		expect(body.alert).toBe(name);

		await expect(
			alerts.shell.message('Alert rule updated successfully'),
		).toBeVisible();
		await page.waitForURL(/\/alerts(\?|$)/);
		expect(new URL(page.url()).pathname).toBe('/alerts');

		// Re-read rather than trust the toast: the footer invalidates the rule and
		// list caches, and a stale cache would show the old value.
		await alerts.details.gotoOverview(ruleId);
		await expect(alerts.form.thresholdValue()).toHaveValue('99');
	});

	test('TC-05 the footer save is what persists a rename on the Overview tab', async ({
		authedPage: page,
		alerts,
		ownedRules,
	}) => {
		const name = `e2e-ev2-rename-${Date.now()}`;
		const renamed = `${name}-renamed`;
		const ruleId = await ownedRules.threshold(name, { target: SEED.target });

		await alerts.details.gotoOverview(ruleId);
		await alerts.form.name().fill(renamed);

		// The details header's RenameModal PATCHes on its own; this is the other
		// path, where the editable header field is local state until the footer
		// saves it.
		const [response] = await Promise.all([
			page.waitForResponse(
				(res) =>
					res.request().method() === 'PUT' &&
					res.url().includes(`/api/v2/rules/${ruleId}`),
			),
			alerts.form.saveButton().click(),
		]);

		expect(response.request().postDataJSON().alert).toBe(renamed);

		await alerts.details.gotoOverview(ruleId);
		await expect(alerts.form.name()).toHaveValue(renamed);
	});

	test('TC-06 Discard leaves without a PUT and without touching the rule', async ({
		authedPage: page,
		alerts,
		ownedRules,
	}) => {
		const name = `e2e-ev2-discard-${Date.now()}`;
		const ruleId = await ownedRules.threshold(name, { target: SEED.target });

		await alerts.details.gotoOverview(ruleId);

		let sawPut = false;
		page.on('request', (request) => {
			if (request.method() === 'PUT' && request.url().includes('/rules/')) {
				sawPut = true;
			}
		});

		await alerts.form.thresholdValue().fill('999');
		await alerts.form.discard();
		await page.waitForURL(/\/alerts(\?|$)/);

		expect(sawPut).toBe(false);

		// `discardAlertRule` also forces the context's alertType back to metrics,
		// which is harmless on the way out only if the stored rule is untouched.
		await alerts.details.gotoOverview(ruleId);
		await expect(alerts.form.thresholdValue()).toHaveValue(String(SEED.target));
		await expect(alerts.form.name()).toHaveValue(name);
	});

	test('TC-07 /alerts/edit is a legacy alias that redirects into the shell', async ({
		authedPage: page,
		alerts,
		noise,
		ownedRules,
	}) => {
		const ruleId = await ownedRules.threshold(
			`e2e-ev2-standalone-${Date.now()}`,
			{ target: SEED.target },
		);

		// Reading the components suggests this route should crash: `EditAlertV2`
		// renders Footer/AlertCondition/NotificationSettings, all of which call
		// `useCreateAlertState()`, and the only provider lives in `AlertDetails`. It
		// does not crash, because `/alerts/edit` never renders `pages/EditRules` at
		// all — `AppRoutes/Private.tsx` redirects the legacy alias, merging the
		// search params, before route matching.
		//
		// Worth keeping despite being a redirect: the alias is linked from the AI
		// assistant and Metrics Explorer, so a regression in `oldNewRoutesMapping`
		// would break real product links.
		await alerts.details.gotoEdit(ruleId);

		await page.waitForURL(/\/alerts\/overview/);
		expect(new URL(page.url()).pathname).toBe('/alerts/overview');
		expect(new URL(page.url()).searchParams.get('ruleId')).toBe(ruleId);

		await expect(alerts.form.thresholdRows()).toHaveCount(1);
		// If someone removes the redirect entry, this is the message that appears.
		expect(
			noise.errors.filter((message) =>
				message.includes('useCreateAlertState must be used within'),
			),
		).toEqual([]);
	});

	test('TC-08 an unknown or missing ruleId on /alerts/edit lands on AlertNotFound', async ({
		authedPage: page,
		alerts,
	}) => {
		// `pages/EditRules`'s own error branches are unreachable: the alias redirect
		// fires before any route matches, and the details shell validates the id
		// before rendering. So neither the "Rule Id is required" notification nor
		// the `edit-rules-container--error` card can render.
		await alerts.details.gotoEdit('999999999');
		await expect(alerts.details.notFound()).toBeVisible();
		await expect(alerts.details.root()).toBeHidden();
		await expect(alerts.details.editRulesError()).toBeHidden();

		await alerts.details.gotoEdit();
		await page.waitForURL(/\/alerts\/overview/);
		await expect(alerts.details.notFound()).toBeVisible();
		await expect(alerts.shell.message('Rule Id is required')).toBeHidden();
	});
});
