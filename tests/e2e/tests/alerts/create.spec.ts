import {
	AlertListTab,
	AlertType,
	expect,
	RuleType,
	STOCK_ALERT_TYPE_CARDS,
	test,
	ThresholdMatchType,
	ThresholdOperator,
} from '../../drivers/alerts';

// The create shell and the v2 builder, kept to what needs a real backend or a
// real browser: type selection and its URL contract, the save round-trip, and
// the error paths. The builder's own validation, threshold tiers, option lists
// and payload shaping are asserted against the components in jest — see
// `frontend/src/container/CreateAlertV2/**/__tests__/`.

test.describe('Alert create', () => {
	test('TC-01 the type cards render and picking one mounts the builder', async ({
		authedPage: page,
		alerts,
	}) => {
		await alerts.form.gotoTypeSelection();

		await expect(alerts.form.typeSelectionTitle()).toBeVisible();
		for (const type of STOCK_ALERT_TYPE_CARDS) {
			await expect(alerts.form.typeCard(type)).toBeVisible();
		}
		// Pins the exact set *and* order for whichever flag branch applies, so
		// adding a sixth signal still fails here.
		await alerts.form.expectTypeCardSet();

		await alerts.form.typeCard(AlertType.METRICS).click();
		await expect(alerts.form.name()).toBeVisible();

		const params = new URL(page.url()).searchParams;
		expect(params.get('ruleType')).toBe(RuleType.THRESHOLD);
		expect(params.get('alertType')).toBe(AlertType.METRICS);
	});

	test('TC-02 the anomaly card rewrites the rule type, not the alert type', async ({
		authedPage: page,
		alerts,
	}) => {
		await alerts.form.gotoTypeSelection();
		test.skip(
			!(await alerts.form.hasAnomalyCard()),
			'ANOMALY_DETECTION is inactive on this stack',
		);

		await alerts.form.typeCard(AlertType.ANOMALY).click();

		const params = new URL(page.url()).searchParams;
		expect(params.get('ruleType')).toBe(RuleType.ANOMALY);
		// The card's own value is deliberately *not* written: `handleSelectType`
		// forces the metrics alert type for anomaly rules, and the form resolves
		// back to anomaly from `ruleType` alone.
		expect(params.get('alertType')).toBe(AlertType.METRICS);
	});

	test('TC-03 modifier-clicking a card opens the builder in a new tab', async ({
		authedPage: page,
		alerts,
	}) => {
		await alerts.form.gotoTypeSelection();

		const [newTab] = await Promise.all([
			page.context().waitForEvent('page'),
			alerts.form
				.typeCard(AlertType.METRICS)
				.click({ modifiers: ['ControlOrMeta'] }),
		]);

		await newTab.waitForLoadState();
		const params = new URL(newTab.url()).searchParams;
		expect(params.get('ruleType')).toBe(RuleType.THRESHOLD);
		expect(params.get('alertType')).toBe(AlertType.METRICS);
		// A modifier click that *also* navigates in place is the regression.
		await expect(alerts.form.typeCard(AlertType.METRICS)).toBeVisible();

		await newTab.close();
	});

	test('TC-04 the breadcrumb gains a third crumb and navigates back', async ({
		authedPage: page,
		alerts,
	}) => {
		await alerts.form.gotoTypeSelection();

		await expect(alerts.shell.crumb('Alert Rules')).toBeVisible();
		await expect(alerts.shell.crumb('Select Alert Type')).toBeVisible();

		await alerts.form.typeCard(AlertType.METRICS).click();
		await expect(alerts.form.name()).toBeVisible();
		await expect(alerts.shell.crumb('Metric-Based Alert')).toBeVisible();

		await alerts.shell.crumbButton('Select Alert Type').click();
		await expect(alerts.form.typeCard(AlertType.METRICS)).toBeVisible();
		expect(new URL(page.url()).searchParams.get('alertType')).toBeNull();
	});

	test('TC-05 create renders inside the Alert Rules tab and leaving drops subTab', async ({
		authedPage: page,
		alerts,
	}) => {
		// `subTab` and `search` are seeded so their removal is observable —
		// `handleTabChange` deletes them while keeping everything else.
		await alerts.form.gotoV2({
			alertType: AlertType.LOGS,
			params: { subTab: 'Alert Rules', search: 'stale' },
		});
		await expect(alerts.form.name()).toBeVisible();

		await expect(alerts.shell.tab(/Alert Rules/)).toBeVisible();
		await alerts.shell.tab(/Triggered Alerts/).click();

		await page.waitForURL(/\/alerts\?/);
		const params = new URL(page.url()).searchParams;
		// The param carries the space-less enum value, not the visible label.
		expect(params.get('tab')).toBe(AlertListTab.TRIGGERED_ALERTS);
		expect(params.get('subTab')).toBeNull();
		expect(params.get('search')).toBeNull();
	});

	test('TC-06 the classic experience replaces history rather than stacking it', async ({
		authedPage: page,
		alerts,
	}) => {
		await alerts.form.gotoV1({ alertType: AlertType.METRICS });
		await expect(alerts.form.v1SaveButton()).toBeVisible();
		// The clearest v1/v2 discriminator: the v2 header input is not there.
		await expect(alerts.form.name()).toBeHidden();

		await alerts.form.gotoV2({ alertType: AlertType.METRICS });
		await alerts.form.switchToClassicButton().click();

		await expect(alerts.form.v1SaveButton()).toBeVisible();
		expect(
			new URL(page.url()).searchParams.get('showClassicCreateAlertsPage'),
		).toBe('true');

		// `safeNavigate(url, { replace: true })` — going back must skip the v2 entry
		// rather than bouncing between the two experiences.
		await page.goBack();
		await expect(alerts.form.name()).toBeHidden();
	});

	test('TC-07 a save posts the v2 shape, keeps its labels and lands on the list', async ({
		authedPage: page,
		alerts,
		alertChannel,
		ownedRules,
	}) => {
		await alerts.form.gotoV2({ alertType: AlertType.LOGS });
		const name = `e2e-create-${Date.now()}`;
		await alerts.form.name().fill(name);

		// Two thresholds, because the UI models one operator per rule while the
		// schema stores one per threshold: a single change has to fan out.
		await alerts.form.addThresholdButton().click();
		await expect(alerts.form.thresholdRows()).toHaveCount(2);
		await alerts.form.selectThresholdChannel(0, alertChannel.name);
		await alerts.form.selectThresholdChannel(1, alertChannel.name);

		await alerts.form.thresholdOperatorSelect().click();
		await alerts.antd.option(ThresholdOperator.BELOW.label).click();

		await alerts.form.addLabel('team', 'payments');
		await expect(alerts.form.labelPill('team', 'payments')).toBeVisible();

		const [response] = await Promise.all([
			page.waitForResponse(
				(res) =>
					res.url().includes('/api/v2/rules') && res.request().method() === 'POST',
			),
			alerts.form.saveButton().click(),
		]);
		await ownedRules.register(response);

		expect(response.status()).toBe(201);
		expect(new URL(response.url()).pathname).toBe('/api/v2/rules');

		const body = response.request().postDataJSON();
		expect(body.schemaVersion).toBe('v2alpha1');
		expect(body.version).toBe('v5');
		expect(body.alert).toBe(name);
		// The label is asserted on the request rather than on the pill: the pill
		// only proves local state, and the defect worth guarding is a label that
		// renders but is never posted.
		expect(body.labels).toMatchObject({ team: 'payments' });
		expect(body.condition.thresholds.kind).toBe('basic');
		expect(body.condition.thresholds.spec).toHaveLength(2);
		expect(
			body.condition.thresholds.spec.map((entry: { op: string }) => entry.op),
		).toEqual([ThresholdOperator.BELOW.value, ThresholdOperator.BELOW.value]);
		expect(body.condition.thresholds.spec[0]).toMatchObject({
			name: 'critical',
			target: 0,
			matchType: ThresholdMatchType.AT_LEAST_ONCE.value,
			channels: [alertChannel.name],
			targetUnit: '',
		});
		// The payload carries no recovery field at all.
		expect(body.condition.thresholds.spec[0]).not.toHaveProperty(
			'recoveryTarget',
		);

		await expect(
			alerts.shell.message('Alert rule created successfully'),
		).toBeVisible();
		// `safeNavigate('/alerts')`; the list appends its own defaults afterwards.
		await page.waitForURL(/\/alerts(\?|$)/);
		expect(new URL(page.url()).pathname).toBe('/alerts');
	});

	test('TC-08 the evaluation window and cadence reach the payload', async ({
		authedPage: page,
		alerts,
		alertChannel,
		ownedRules,
	}) => {
		await alerts.form.gotoV2({ alertType: AlertType.LOGS });
		await alerts.form.name().fill(`e2e-create-eval-${Date.now()}`);
		await alerts.form.selectThresholdChannel(0, alertChannel.name);

		// One test because the two share a payload branch: `getEvaluationProps`
		// emits `evalWindow` and `frequency` together, so a scenario changing only
		// one would still pass with the other hardcoded.
		await alerts.form.selectEvaluationTimeframe('30m0s');
		await alerts.form.expandAdvancedOptions();
		await alerts.form.evaluationCadenceInput().fill('5');

		const [response] = await Promise.all([
			page.waitForResponse(
				(res) =>
					res.url().includes('/api/v2/rules') && res.request().method() === 'POST',
			),
			alerts.form.saveButton().click(),
		]);
		await ownedRules.register(response);

		const { evaluation } = response.request().postDataJSON();
		expect(evaluation.kind).toBe('rolling');
		expect(evaluation.spec.evalWindow).toBe('30m0s');
		// `getFormattedTimeValue` maps value + unit onto a Go duration; the unit
		// stays at its default Minutes, which is what makes `5m` expected.
		expect(evaluation.spec.frequency).toBe('5m');
	});

	test('TC-09 a test notification reports that a non-firing rule matched nothing', async ({
		authedPage: page,
		alerts,
		alertChannel,
	}) => {
		await alerts.form.gotoV2({ alertType: AlertType.LOGS });
		await alerts.form.name().fill(`e2e-create-test-${Date.now()}`);
		await alerts.form.selectThresholdChannel(0, alertChannel.name);

		const [response] = await Promise.all([
			page.waitForResponse(
				(res) =>
					res.url().includes('/api/v2/rules/test') &&
					res.request().method() === 'POST',
			),
			alerts.form.testButton().click(),
		]);
		expect(response.ok()).toBe(true);

		// `alertCount === 0` is an *error* toast, not a success one: the rule
		// evaluated fine, it just did not fire. Asserted permissively so a stack
		// that happens to have matching data does not flip it.
		await expect(
			alerts.shell.message(
				/No alerts found during the evaluation|sent successfully/,
			),
		).toBeVisible();
	});

	test('TC-10 with no channels, routing policies are the only way to save', async ({
		authedPage: page,
		alerts,
	}) => {
		await alerts.form.stubNoChannels();
		await alerts.form.gotoV2({ alertType: AlertType.LOGS });
		await alerts.form.name().fill(`e2e-create-nochan-${Date.now()}`);

		const dropdown = await alerts.form.openChannelDropdown();

		// `NotificationChannelsNotFoundContent` branches on role; the harness user
		// is an admin, so this is the "create one here" half.
		await expect(dropdown.emptyMessage()).toBeVisible();
		await expect(dropdown.createHereButton()).toBeVisible();
		await expect(dropdown.refreshButton()).toBeVisible();
		await expect(dropdown.askAdminMessage()).toBeHidden();
		await page.keyboard.press('Escape');
		await expect(alerts.form.saveButton()).toBeDisabled();

		await alerts.form.routingPoliciesSwitch().click();

		// The threshold row *removes* its channel select rather than disabling it.
		await expect(alerts.form.thresholdChannelSelects()).toHaveCount(0);
		await expect(alerts.form.saveButton()).toBeEnabled();

		await alerts.form.viewRoutingPoliciesButton().click();
		await page.waitForURL(/subTab=routing-policies/);
		const url = new URL(page.url());
		expect(url.pathname).toBe('/alerts');
		expect(url.searchParams.get('tab')).toBe('Configuration');
	});

	test('TC-11 Discard leaves without posting and resets the form', async ({
		authedPage: page,
		alerts,
		alertChannel,
	}) => {
		await alerts.form.gotoV2({ alertType: AlertType.LOGS });
		await alerts.form.name().fill(`e2e-create-discard-${Date.now()}`);
		await alerts.form.selectThresholdChannel(0, alertChannel.name);

		let sawPost = false;
		page.on('request', (request) => {
			if (request.method() === 'POST' && request.url().includes('/api/v2/rules')) {
				sawPost = true;
			}
		});

		await alerts.form.discard();
		await page.waitForURL(/\/alerts(\?|$)/);
		expect(sawPost).toBe(false);

		await alerts.form.gotoV2({ alertType: AlertType.LOGS });
		await expect(alerts.form.name()).toHaveValue('');
		await expect(alerts.form.thresholdRows()).toHaveCount(1);
	});

	test('TC-12 a rejected save opens the error modal and keeps the draft', async ({
		authedPage: page,
		alerts,
	}) => {
		// The 4xx comes from a real race rather than a stub: a duplicate name is
		// accepted by the API, a missing channel is not, so the form is filled with
		// a channel that exists and the channel is deleted behind its back.
		const channel = await alerts.seed.channel(`e2e-create-err-${Date.now()}`);

		await alerts.form.gotoV2({ alertType: AlertType.LOGS });
		const name = `e2e-create-err-${Date.now()}`;
		await alerts.form.name().fill(name);
		await alerts.form.selectThresholdChannel(0, channel.name);

		await alerts.seed.deleteChannel(channel.id);

		const [response] = await Promise.all([
			page.waitForResponse(
				(res) =>
					res.url().includes('/api/v2/rules') && res.request().method() === 'POST',
			),
			alerts.form.saveButton().click(),
		]);
		expect(response.status()).toBe(400);

		// Both forms funnel every save error into the shared error modal.
		await expect(alerts.form.errorModal()).toBeVisible();
		await expect(alerts.shell.message(/do not exist/)).toBeVisible();

		// A rejected save must not navigate, and must not lose what was typed.
		expect(new URL(page.url()).pathname).toBe('/alerts/new');
		await alerts.form.errorModalCloseButton().click();
		await expect(alerts.form.errorModal()).toBeHidden();
		await expect(alerts.form.name()).toHaveValue(name);
	});

	test('TC-13 none of the four builder mounts logs a console error', async ({
		alerts,
		noise,
		ownedRules,
	}) => {
		await alerts.form.gotoV2({ alertType: AlertType.LOGS });
		// Metrics-based v1 on purpose: the only alert type whose classic form
		// renders the detection-method step and the PromQL tab, i.e. the most code.
		await alerts.form.gotoV1({ alertType: AlertType.METRICS });

		await alerts.details.gotoOverview(
			await ownedRules.threshold(`e2e-create-mount-v2-${Date.now()}`),
		);

		// The v1 edit form renders no `threshold-value-input`, so the shell-level
		// wait is used and the classic form is asserted directly.
		await alerts.details.goto(
			await ownedRules.logs({
				name: `e2e-create-mount-v1-${Date.now()}`,
				schema: 'v1',
			}),
		);
		await expect(alerts.form.v1SaveButton()).toBeVisible();

		expect(noise.errors).toEqual([]);
	});

	// TODO: enable once the covered-Discard defect is fixed, and revert
	// `alerts.form.discard()` to a plain `.click()` in the same commit.
	//
	// 🐞 **A user cannot discard an alert draft.** The footer is
	// `position: fixed; left: 63px` — the *collapsed* nav rail width — while the
	// side navigation is 240px wide whenever expanded, which is the default.
	// Discard is the footer's left-most control, so the nav sits on top of it and
	// wins the stacking contest despite the footer's `z-index: 1000`.
	//
	// Observed live: `elementFromPoint` at the button's centre returns the nav's
	// `.nav-item-data`, and a real click fails with "intercepts pointer events".
	// `{ force: true }` does not help. Only `dispatchEvent` gets through, which
	// proves the handler is fine and the defect is pointer delivery.
	test.skip('TC-14 the v2 Discard button is clickable', async ({
		authedPage: page,
		alerts,
	}) => {
		await alerts.form.gotoV2({ alertType: AlertType.LOGS });

		const box = await alerts.form.discardButton().boundingBox();
		expect(box).not.toBeNull();
		const covering = await alerts.form.elementAtPointClassName(
			(box?.x ?? 0) + (box?.width ?? 0) / 2,
			(box?.y ?? 0) + (box?.height ?? 0) / 2,
		);
		expect(covering).not.toMatch(/nav-item/);

		await alerts.form.discardButton().click({ timeout: 3_000 });
		await page.waitForURL(/\/alerts(\?|$)/);
		expect(new URL(page.url()).pathname).toBe('/alerts');
	});
});
