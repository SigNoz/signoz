import { expect, test } from '../../../fixtures/alerts/alert-rules';
import { AlertType, ThresholdMatchType, ThresholdOperator } from '../../../helpers/alert-forms/constants';
import { gotoCreateAlertV2 } from '../../../helpers/alert-forms/navigation';
import { dropdownOption, openDropdown, ownDropdown } from '../../../helpers/alert-forms/shared';
import {
	addAlertLabel,
	advancedOptionToggle,
	evaluationCadenceInput,
	expandAdvancedOptions,
	labelPill,
	selectEvaluationTimeframe,
	selectThresholdChannel,
	stubNoChannels,
	thresholdRows,
	v2ClickDiscard,
	v2DiscardButton,
	v2SaveButton,
	v2SaveTooltip,
	v2TestButton,
} from '../../../helpers/alert-forms/v2';

// CV2-* — the v2 create builder.
//
// Every scenario uses a **logs**-based alert unless it says otherwise: its default
// query is valid with no seeded metrics. CV2-12 (unit select) and CV2-16 (group-by
// select) are about what that choice costs — both are gated on query state a
// default logs query does not provide, and both assert the gate.

const VALIDATION = {
	name: 'Please enter an alert name',
	thresholdLabel: 'Please enter a label for each threshold',
	channels:
		'Please select at least one channel for each threshold or enable routing policies',
} as const;

test.describe('Alert create — v2 builder', () => {
	test('CV2-01 initial state: one critical threshold, both actions gated', async ({
		authedPage: page,
		alertChannel,
	}) => {
		expect(alertChannel.name).toBeTruthy();
		await gotoCreateAlertV2(page, { alertType: AlertType.LOGS });

		await expect(page.getByTestId('alert-name-input')).toHaveValue('');
		await expect(page.getByTestId('alert-name-input')).toHaveAttribute(
			'placeholder',
			'Enter alert rule name',
		);

		// `INITIAL_CRITICAL_THRESHOLD` — label `critical`, value 0, `channels: []`.
		// The empty channel list is what makes the save gate reachable at all.
		await expect(thresholdRows(page)).toHaveCount(1);
		await expect(page.getByTestId('threshold-name-input')).toHaveValue(
			'critical',
		);
		await expect(page.getByTestId('threshold-value-input')).toHaveValue('0');

		await expect(v2SaveButton(page)).toBeDisabled();
		await expect(v2TestButton(page)).toBeDisabled();
	});

	test('CV2-02 the save tooltip walks from the name gate to the channel gate', async ({
		authedPage: page,
		alertChannel,
	}) => {
		expect(alertChannel.name).toBeTruthy();
		await gotoCreateAlertV2(page, { alertType: AlertType.LOGS });

		// `validateCreateAlertState` returns the *first* failure, so the message order
		// encodes the validation order: name, then per-threshold label, then channels.
		expect(await v2SaveTooltip(page)).toBe(VALIDATION.name);

		await page.getByTestId('alert-name-input').fill(`e2e-cv2-02-${Date.now()}`);
		expect(await v2SaveTooltip(page)).toBe(VALIDATION.channels);
	});

	test('CV2-03 clearing a threshold label re-gates the save', async ({
		authedPage: page,
		alertChannel,
	}) => {
		await gotoCreateAlertV2(page, { alertType: AlertType.LOGS });
		await page.getByTestId('alert-name-input').fill(`e2e-cv2-03-${Date.now()}`);
		await selectThresholdChannel(page, 0, alertChannel.name);

		// With a name and a channel the only remaining gate is the label.
		await expect(v2SaveButton(page)).toBeEnabled();

		await page.getByTestId('threshold-name-input').fill('');
		expect(await v2SaveTooltip(page)).toBe(VALIDATION.thresholdLabel);
	});

	test('CV2-04 a label added in the header survives the save round-trip', async ({
		authedPage: page,
		alertChannel,
		ownedRules,
	}) => {
		await gotoCreateAlertV2(page, { alertType: AlertType.LOGS });
		const name = `e2e-cv2-04-${Date.now()}`;
		await page.getByTestId('alert-name-input').fill(name);
		await selectThresholdChannel(page, 0, alertChannel.name);

		await addAlertLabel(page, 'team', 'payments');
		await expect(labelPill(page, 'team', 'payments')).toBeVisible();

		const [response] = await Promise.all([
			page.waitForResponse(
				(r) => r.url().includes('/api/v2/rules') && r.request().method() === 'POST',
			),
			v2SaveButton(page).click(),
		]);
		await ownedRules.register(response);

		// Asserted on the request body rather than on the pill: the pill only proves
		// local state, and the defect worth guarding is a label that renders but is
		// never posted.
		const body = response.request().postDataJSON();
		expect(body.labels).toMatchObject({ team: 'payments' });
	});

	test('CV2-05 a rejected label key surfaces as a notification, not an inline message', async ({
		authedPage: page,
	}) => {
		await gotoCreateAlertV2(page, { alertType: AlertType.LOGS });

		// Both rejection branches in `LabelsInput` — duplicate key and group-by key —
		// raise an antd **notification**, so a spec looking for inline text fails. Only
		// the duplicate branch is reachable here: the group-by branch needs a query that
		// already groups by something, which the default logs query does not.
		await addAlertLabel(page, 'team', 'payments');
		await expect(labelPill(page, 'team', 'payments')).toBeVisible();

		await page.getByTestId('alert-add-label-button').click();
		const input = page.getByTestId('alert-add-label-input');
		await input.fill('team');
		await input.press('Enter');

		await expect(
			page.getByText('Label with this key already exists'),
		).toBeVisible();
		// Rejected, so no second pill appeared.
		await expect(page.locator('[data-testid^="label-pill-team-"]')).toHaveCount(
			1,
		);
	});

	test('CV2-06 CV2-07 the operator and match-type selects offer the documented options', async ({
		authedPage: page,
	}) => {
		await gotoCreateAlertV2(page, { alertType: AlertType.LOGS });

		await page.getByTestId('alert-threshold-operator-select').click();
		// Exact-text matching, because `hasText: 'EQUAL TO'` also matches the
		// `NOT EQUAL TO` option and the count assertion then reads 2.
		for (const operator of Object.values(ThresholdOperator)) {
			await expect(dropdownOption(page, operator.label)).toHaveCount(1);
		}
		await expect(
			openDropdown(page).locator('.ant-select-item-option'),
		).toHaveCount(Object.keys(ThresholdOperator).length);
		await page.keyboard.press('Escape');

		await page.getByTestId('alert-threshold-match-type-select').click();
		for (const matchType of Object.values(ThresholdMatchType)) {
			await expect(dropdownOption(page, matchType.label)).toHaveCount(1);
		}
		await expect(
			openDropdown(page).locator('.ant-select-item-option'),
		).toHaveCount(Object.keys(ThresholdMatchType).length);
	});

	test('CV2-08 the operator is rule-wide: one change reaches every threshold', async ({
		authedPage: page,
		alertChannel,
		ownedRules,
	}) => {
		await gotoCreateAlertV2(page, { alertType: AlertType.LOGS });
		await page.getByTestId('alert-name-input').fill(`e2e-cv2-08-${Date.now()}`);

		await page.getByTestId('add-threshold-button').click();
		await expect(thresholdRows(page)).toHaveCount(2);
		await selectThresholdChannel(page, 0, alertChannel.name);
		await selectThresholdChannel(page, 1, alertChannel.name);

		await page.getByTestId('alert-threshold-operator-select').click();
		await dropdownOption(page, ThresholdOperator.BELOW.label).click();

		const [response] = await Promise.all([
			page.waitForResponse(
				(r) => r.url().includes('/api/v2/rules') && r.request().method() === 'POST',
			),
			v2SaveButton(page).click(),
		]);
		await ownedRules.register(response);

		// The UI models one operator per rule while the schema stores one per
		// threshold, so a single change is fanned out across `spec[]`.
		const spec = response.request().postDataJSON().condition.thresholds.spec;
		expect(spec).toHaveLength(2);
		expect(spec.map((entry: { op: string }) => entry.op)).toEqual([
			ThresholdOperator.BELOW.value,
			ThresholdOperator.BELOW.value,
		]);
	});

	test('CV2-09 CV2-10 added thresholds take preset tiers, and the first cannot be removed', async ({
		authedPage: page,
		alertChannel,
	}) => {
		await gotoCreateAlertV2(page, { alertType: AlertType.LOGS });

		// `addThreshold` branches on the current count: 2nd ⇒ warning, 3rd ⇒ info,
		// 4th and beyond ⇒ an unnamed row with a random colour.
		await page.getByTestId('add-threshold-button').click();
		await page.getByTestId('add-threshold-button').click();
		await page.getByTestId('add-threshold-button').click();
		await expect(thresholdRows(page)).toHaveCount(4);

		const names = page.getByTestId('threshold-name-input');
		await expect(names.nth(0)).toHaveValue('critical');
		await expect(names.nth(1)).toHaveValue('warning');
		await expect(names.nth(2)).toHaveValue('info');
		await expect(names.nth(3)).toHaveValue('');

		// `showRemoveButton` is `index !== 0 && length > 1`, so there are three remove
		// buttons for four rows and the first row can never be removed.
		await expect(page.getByTestId('remove-threshold-button')).toHaveCount(3);

		// To see the unnamed row's own gate, the earlier gates have to be satisfied
		// first: `validateCreateAlertState` loops thresholds and returns on the first
		// failure, checking label *then* channels **per threshold** — so with row 0
		// lacking a channel the channel message wins before row 3 is ever examined.
		await page.getByTestId('alert-name-input').fill(`e2e-cv2-09-${Date.now()}`);
		for (const index of [0, 1, 2, 3]) {
			// eslint-disable-next-line no-await-in-loop
			await selectThresholdChannel(page, index, alertChannel.name);
		}
		expect(await v2SaveTooltip(page)).toBe(VALIDATION.thresholdLabel);

		await names.nth(3).fill('page-me');
		await expect(v2SaveButton(page)).toBeEnabled();
	});

	test('CV2-11 a channel on one threshold is not enough — the validator loops all of them', async ({
		authedPage: page,
		alertChannel,
	}) => {
		await gotoCreateAlertV2(page, { alertType: AlertType.LOGS });
		await page.getByTestId('alert-name-input').fill(`e2e-cv2-11-${Date.now()}`);
		await page.getByTestId('add-threshold-button').click();

		await selectThresholdChannel(page, 0, alertChannel.name);
		expect(await v2SaveTooltip(page)).toBe(VALIDATION.channels);

		await selectThresholdChannel(page, 1, alertChannel.name);
		await expect(v2SaveButton(page)).toBeEnabled();
	});

	test('CV2-12 the unit select is disabled while the query has no y-axis unit', async ({
		authedPage: page,
	}) => {
		await gotoCreateAlertV2(page, { alertType: AlertType.LOGS });

		// `disabled={units.length === 0}`, and `units` is derived from
		// `alertState.yAxisUnit`. A logs alert carries no unit, so the control is dead on
		// this path — CD-04 covers a URL that does supply one.
		const unitSelect = page.getByTestId('threshold-unit-select').first();
		await expect(unitSelect).toHaveClass(/ant-select-disabled/);
	});

	test('CV2-13 the recovery threshold control is never rendered', async ({
		authedPage: page,
	}) => {
		await gotoCreateAlertV2(page, { alertType: AlertType.LOGS });

		// `showRecoveryThreshold` starts false and the only setter is commented out, so
		// neither the input nor its remove button can appear.
		await expect(page.getByTestId('recovery-threshold-value-input')).toHaveCount(
			0,
		);
		await expect(
			page.getByTestId('remove-recovery-threshold-button'),
		).toHaveCount(0);
	});

	test('CV2-14 CV2-15 the evaluation window and cadence reach the payload', async ({
		authedPage: page,
		alertChannel,
		ownedRules,
	}) => {
		await gotoCreateAlertV2(page, { alertType: AlertType.LOGS });
		await page.getByTestId('alert-name-input').fill(`e2e-cv2-14-${Date.now()}`);
		await selectThresholdChannel(page, 0, alertChannel.name);

		// Written as one test because the two settings share a payload branch:
		// `getEvaluationProps` emits `evalWindow` and `frequency` together, and a
		// scenario that changed only one would still pass with the other hardcoded.
		await selectEvaluationTimeframe(page, '30m0s');

		await expandAdvancedOptions(page);
		await evaluationCadenceInput(page).fill('5');

		const [response] = await Promise.all([
			page.waitForResponse(
				(r) => r.url().includes('/api/v2/rules') && r.request().method() === 'POST',
			),
			v2SaveButton(page).click(),
		]);
		await ownedRules.register(response);

		const { evaluation } = response.request().postDataJSON();
		expect(evaluation.kind).toBe('rolling');
		expect(evaluation.spec.evalWindow).toBe('30m0s');
		// `getFormattedTimeValue` maps value + unit onto a Go duration; the unit is
		// left at its default Minutes, which is what makes `5m` the expected string.
		expect(evaluation.spec.frequency).toBe('5m');
	});

	test('CV2-18 with no channels the dropdown offers only a way to create one', async ({
		authedPage: page,
	}) => {
		// The single deliberate network stub in the alerts suite — its justification is
		// in `stubNoChannels`, and the state it produces is the one every fresh install
		// starts in.
		await stubNoChannels(page);
		await gotoCreateAlertV2(page, { alertType: AlertType.LOGS });
		await page.getByTestId('alert-name-input').fill(`e2e-cv2-18-${Date.now()}`);

		const select = page
			.getByTestId('threshold-notification-channel-select')
			.first();
		await select.click();
		const dropdown = await ownDropdown(page, select);

		// `NotificationChannelsNotFoundContent` branches on the user's role. The harness
		// user is an admin, so this is the "create one here" half — asserting the
		// non-admin string instead would fail for the wrong reason.
		await expect(dropdown.getByText('No channels yet.')).toBeVisible();
		await expect(dropdown.getByRole('button', { name: 'here.' })).toBeVisible();
		await expect(dropdown.getByRole('button', { name: 'Refresh' })).toBeVisible();
		await expect(
			dropdown.getByText('Please ask your admin to create one.'),
		).toBeHidden();

		await page.keyboard.press('Escape');

		// With a name filled and no channel selectable, the channel gate is the only
		// thing left — and there is no way to satisfy it from this page.
		expect(await v2SaveTooltip(page)).toBe(VALIDATION.channels);
		await expect(v2SaveButton(page)).toBeDisabled();
	});

	test('CV2-19 routing policies unlock the save with zero channels', async ({
		authedPage: page,
	}) => {
		await stubNoChannels(page);
		await gotoCreateAlertV2(page, { alertType: AlertType.LOGS });
		await page.getByTestId('alert-name-input').fill(`e2e-cv2-19-${Date.now()}`);
		await expect(v2SaveButton(page)).toBeDisabled();

		await page.getByTestId('routing-policies-switch').click();

		// The validator skips the channel check when `routingPolicies` is on, and the
		// threshold row *removes* its channel select rather than disabling it — so this
		// is the one route to a saveable rule on a stack with no channels at all.
		await expect(
			page.getByTestId('threshold-notification-channel-select'),
		).toHaveCount(0);
		await expect(v2SaveButton(page)).toBeEnabled();

		await page.getByTestId('view-routing-policies-button').click();
		await page.waitForURL(/subTab=routing-policies/);
		const url = new URL(page.url());
		expect(url.pathname).toBe('/alerts');
		expect(url.searchParams.get('tab')).toBe('Configuration');
	});

	test('CV2-16 the group-by select is disabled until the query groups by something', async ({
		authedPage: page,
	}) => {
		await gotoCreateAlertV2(page, { alertType: AlertType.LOGS });

		// `isMultipleNotificationsEnabled` is `spaceAggregationOptions.length > 0`, and
		// the options come from the query's `groupBy` keys. The default logs query has
		// none, so notification grouping is unreachable without editing the query first.
		const groupBy = page.getByTestId('multiple-notifications-select');
		await expect(groupBy).toHaveAttribute('aria-disabled', 'true');
		await expect(page.getByText('No grouping fields available')).toBeVisible();
	});

	test('CV2-17 repeat notifications enable their inputs and reach the payload', async ({
		authedPage: page,
		alertChannel,
		ownedRules,
	}) => {
		await gotoCreateAlertV2(page, { alertType: AlertType.LOGS });
		await page.getByTestId('alert-name-input').fill(`e2e-cv2-17-${Date.now()}`);
		await selectThresholdChannel(page, 0, alertChannel.name);

		const interval = page.getByTestId('repeat-notifications-time-input');
		await expect(interval).toBeDisabled();

		await advancedOptionToggle(page, 'repeat-notifications-container').click();
		await expect(interval).toBeEnabled();
		await interval.fill('45');

		const [response] = await Promise.all([
			page.waitForResponse(
				(r) => r.url().includes('/api/v2/rules') && r.request().method() === 'POST',
			),
			v2SaveButton(page).click(),
		]);
		await ownedRules.register(response);

		// `getFormattedTimeValue` turns value+unit into a Go duration.
		const renotify = response.request().postDataJSON()
			.notificationSettings.renotify;
		expect(renotify.enabled).toBe(true);
		expect(renotify.interval).toBe('45m');
	});

	test('CV2-20 happy-path save posts the v2 shape and lands on the list', async ({
		authedPage: page,
		alertChannel,
		ownedRules,
	}) => {
		await gotoCreateAlertV2(page, { alertType: AlertType.LOGS });
		const name = `e2e-cv2-20-${Date.now()}`;
		await page.getByTestId('alert-name-input').fill(name);
		await selectThresholdChannel(page, 0, alertChannel.name);

		// One click — v2 has no confirm dialog, unlike v1.
		const [response] = await Promise.all([
			page.waitForResponse(
				(r) => r.url().includes('/api/v2/rules') && r.request().method() === 'POST',
			),
			v2SaveButton(page).click(),
		]);
		await ownedRules.register(response);

		expect(response.status()).toBe(201);
		expect(new URL(response.url()).pathname).toBe('/api/v2/rules');

		const body = response.request().postDataJSON();
		expect(body.schemaVersion).toBe('v2alpha1');
		expect(body.version).toBe('v5');
		expect(body.alert).toBe(name);
		expect(body.condition.thresholds.kind).toBe('basic');
		expect(body.condition.thresholds.spec[0]).toMatchObject({
			name: 'critical',
			target: 0,
			matchType: ThresholdMatchType.AT_LEAST_ONCE.value,
			op: ThresholdOperator.ABOVE.value,
			channels: [alertChannel.name],
			targetUnit: '',
		});
		// The payload carries no recovery field at all — see CV2-13.
		expect(body.condition.thresholds.spec[0]).not.toHaveProperty(
			'recoveryTarget',
		);

		await expect(page.getByText('Alert rule created successfully')).toBeVisible();
		// `safeNavigate('/alerts')`; the list page then appends its own defaults, so
		// only the pathname is asserted.
		await page.waitForURL(/\/alerts(\?|$)/);
		expect(new URL(page.url()).pathname).toBe('/alerts');
	});

	test('CV2-21 test notification reports that a non-firing rule matched nothing', async ({
		authedPage: page,
		alertChannel,
	}) => {
		await gotoCreateAlertV2(page, { alertType: AlertType.LOGS });
		await page.getByTestId('alert-name-input').fill(`e2e-cv2-21-${Date.now()}`);
		await selectThresholdChannel(page, 0, alertChannel.name);

		const [response] = await Promise.all([
			page.waitForResponse(
				(r) =>
					r.url().includes('/api/v2/rules/test') && r.request().method() === 'POST',
			),
			v2TestButton(page).click(),
		]);
		expect(response.ok()).toBe(true);

		// `alertCount === 0` is an *error* toast, not a success one — the rule evaluated
		// fine, it just did not fire. Asserted permissively so a stack that happens to
		// have matching data does not flip it.
		await expect(
			page.getByText(/No alerts found during the evaluation|sent successfully/),
		).toBeVisible();
	});

	test('CV2-22 discard leaves without posting and resets the form', async ({
		authedPage: page,
		alertChannel,
	}) => {
		await gotoCreateAlertV2(page, { alertType: AlertType.LOGS });
		await page.getByTestId('alert-name-input').fill(`e2e-cv2-22-${Date.now()}`);
		await selectThresholdChannel(page, 0, alertChannel.name);

		let sawPost = false;
		page.on('request', (request) => {
			if (request.method() === 'POST' && request.url().includes('/api/v2/rules')) {
				sawPost = true;
			}
		});

		// dispatchEvent, not click — the side navigation covers the button (CE-09).
		await v2ClickDiscard(page);
		await page.waitForURL(/\/alerts(\?|$)/);
		expect(sawPost).toBe(false);

		await gotoCreateAlertV2(page, { alertType: AlertType.LOGS });
		await expect(page.getByTestId('alert-name-input')).toHaveValue('');
		await expect(thresholdRows(page)).toHaveCount(1);
	});

	test('CV2-23 every footer button is disabled while the save is in flight', async ({
		authedPage: page,
		alertChannel,
		ownedRules,
	}) => {
		await gotoCreateAlertV2(page, { alertType: AlertType.LOGS });
		await page.getByTestId('alert-name-input').fill(`e2e-cv2-23-${Date.now()}`);
		await selectThresholdChannel(page, 0, alertChannel.name);

		// The in-flight window is a few milliseconds against a local stack, so it is
		// widened by *delaying* the request — `route.continue()` still sends it to the
		// real backend and the real 201 comes back, so nothing about the response is
		// faked.
		await page.route('**/api/v2/rules', async (route) => {
			if (route.request().method() !== 'POST') {
				await route.fallback();
				return;
			}
			await new Promise((resolve) => {
				setTimeout(resolve, 2_000);
			});
			await route.continue();
		});

		const responsePromise = page.waitForResponse(
			(r) => r.url().includes('/api/v2/rules') && r.request().method() === 'POST',
		);
		await v2SaveButton(page).click();

		// `disableButtons` is one flag shared by all three, so Discard going disabled is
		// what proves a user cannot abandon a half-created rule mid-request.
		await expect(page.getByTestId('save-alert-rule-loader-icon')).toBeVisible();
		await expect(page.getByTestId('save-alert-rule-check-icon')).toHaveCount(0);
		await expect(v2SaveButton(page)).toBeDisabled();
		await expect(v2TestButton(page)).toBeDisabled();
		await expect(v2DiscardButton(page)).toBeDisabled();

		const response = await responsePromise;
		await ownedRules.register(response);
		expect(response.status()).toBe(201);
		await expect(page.getByText('Alert rule created successfully')).toBeVisible();
	});
});
