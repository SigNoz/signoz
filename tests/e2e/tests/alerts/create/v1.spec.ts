import { expect, test } from '../../../fixtures/alert-rules';
import {
	AlertType,
	alertTypeCard,
	gotoAlertTypeSelection,
	gotoCreateAlertV1,
	stubNoChannels,
	v1BroadcastSwitch,
	v1CancelButton,
	v1CancelSave,
	v1ChannelSelect,
	v1ConfirmDialog,
	v1ConfirmSave,
	v1DescriptionInput,
	v1EvalWindowSelect,
	v1MatchTypeSelect,
	v1NameInput,
	v1OperatorSelect,
	v1SelectChannel,
	v1SelectOption,
	v1SelectQueryMode,
	v1SeveritySelect,
	v1TestButton,
	v1ThresholdInput,
	v1SaveButton,
} from '../../../helpers/alert-forms';

// CV1-* — the v1 classic create form, reached with
// `showClassicCreateAlertsPage=true`. CE-05 and CE-06 live here too: both are
// PromQL/ClickHouse validation, which only the classic form has.
//
// Three things about this form drive almost every row below, and all three differ
// from v2:
//   1. Save only *opens* a confirm dialog. Both the field validation and the
//      request run behind its OK, so a validation message is never visible until
//      the dialog has been confirmed.
//   2. The Save/Test buttons are disabled by `isAlertNameMissing ||
//      !isChannelConfigurationValid || queryStatus === 'error'`, so a row that
//      wants to reach the dialog has to satisfy the name *and* the channels first.
//   3. Validation failures surface as antd **notifications**, not inline errors.

const VALIDATION = {
	targetMissing: 'Please enter a threshold to proceed',
	promql: 'promql expression is required when query format is set to PromQL',
	clickhouse: 'query is required when query format is set to ClickHouse',
} as const;

/**
 * Alert type for every row that actually saves.
 *
 * A metrics-based rule is rejected by the **server** with
 * `400 invalid query 'A': metric name is required for aggregation #1`, because the
 * metrics default query has no metric selected and picking one is query-builder
 * territory. A logs-based alert's default query is valid with no seeded data, which
 * is the same reason every `CV2-*` row uses one. Rows that assert on *rendering*
 * stay metrics-based, and so does CE-05 — PromQL is offered for metrics only.
 */
const SAVEABLE = AlertType.LOGS;

/** Every v1 save and test goes to the same endpoint the v2 builder uses. */
function isRuleCreate(url: string, method: string): boolean {
	return method === 'POST' && new URL(url).pathname === '/api/v2/rules';
}

/**
 * Fill the minimum a v1 rule needs before Save stops being disabled: a name, a
 * channel and a threshold.
 */
async function fillMinimalV1Rule(
	page: import('@playwright/test').Page,
	{ name, channelName }: { name: string; channelName: string },
): Promise<void> {
	await v1NameInput(page).fill(name);
	await v1ThresholdInput(page).fill('5');
	await v1SelectChannel(page, channelName);
	await expect(v1SaveButton(page)).toBeEnabled();
}

test.describe('Alert create — v1 classic form', () => {
	test('CV1-01 the classic form renders its steps and the create-mode labels', async ({
		authedPage: page,
	}) => {
		// Whether the detection-method step renders depends on `ANOMALY_DETECTION`, the
		// same flag CS-01 reads off the type-selection page. Read it there rather than
		// assuming, so this stays one unconditional assertion whichever way it falls.
		await gotoAlertTypeSelection(page);
		const anomalyEnabled =
			(await alertTypeCard(page, AlertType.ANOMALY).count()) > 0;

		await gotoCreateAlertV1(page, { alertType: AlertType.METRICS });

		await expect(page.getByText('Metrics Based Alert')).toBeVisible();
		await expect(
			page.getByRole('button', { name: 'Alert Setup Guide' }),
		).toBeVisible();

		// `isNewRule` decides both action labels.
		await expect(v1SaveButton(page)).toHaveText(/Create Rule/);
		await expect(v1CancelButton(page)).toHaveText(/Cancel/);

		await expect(page.getByText('Define the metric')).toBeVisible();
		await expect(page.getByText('Define Alert Conditions')).toBeVisible();
		await expect(page.getByText('Alert Configuration')).toBeVisible();

		await expect(page.locator('.detection-method-container')).toHaveCount(
			anomalyEnabled ? 1 : 0,
		);
	});

	test('CV1-02 the rendered severity is the default from the rule, not the select', async ({
		authedPage: page,
	}) => {
		await gotoCreateAlertV1(page, { alertType: AlertType.METRICS });

		// Two defaults disagree: `alertDefaults.labels.severity` is `warning` while the
		// select's own `defaultValue` prop says `critical`. The antd Form's
		// `initialValues` wins, so what a user sees — and what the payload carries — is
		// *warning*.
		await expect(v1SeveritySelect(page)).toContainText('Warning');
	});

	test('CV1-03 one keystroke in the name field is enough to enable Save', async ({
		authedPage: page,
		alertChannel,
	}) => {
		await gotoCreateAlertV1(page, { alertType: SAVEABLE });

		// Satisfy the other two gates first so the name is the only one left.
		await v1ThresholdInput(page).fill('5');
		await v1SelectChannel(page, alertChannel.name);
		await expect(v1SaveButton(page)).toBeDisabled();
		await expect(v1TestButton(page)).toBeDisabled();

		// `isAlertNameMissing` is `!formInstance.getFieldValue('alert')` read during
		// render — not a subscription. It only ever looks fresh because `setAlertDef`
		// re-renders on every keystroke, so the realistic failure is the *first*
		// character. One character, no second keystroke, no blur.
		await v1NameInput(page).pressSequentially('a');
		await expect(v1SaveButton(page)).toBeEnabled();
		await expect(v1TestButton(page)).toBeEnabled();
	});

	test('CV1-04 Save stays disabled until the channel configuration resolves', async ({
		authedPage: page,
		alertChannel,
	}) => {
		await gotoCreateAlertV1(page, { alertType: SAVEABLE });
		await v1NameInput(page).fill(`e2e-cv1-04-${Date.now()}`);
		await v1ThresholdInput(page).fill('5');

		// A new rule starts with the broadcast switch **off** and no preferred channels,
		// so `isChannelConfigurationValid` is false and there is no message anywhere —
		// just a dead button. That silence is what this row pins.
		await expect(v1BroadcastSwitch(page)).toHaveAttribute(
			'aria-checked',
			'false',
		);
		await expect(v1SaveButton(page)).toBeDisabled();

		await v1SelectChannel(page, alertChannel.name);
		await expect(v1SaveButton(page)).toBeEnabled();
	});

	// TODO: enable once the `broadcastToAll` bug is fixed.
	//
	// 🐞 **"Alert all the configured channels" is broken end to end**, so this row
	// asserts the *intended* behaviour and fails today:
	//
	//   1. `BasicInfo`'s switch sets `alertDef.broadcastToAll` and unmounts the
	//      channel select, so no channel can be picked while it is on.
	//   2. `preparePostData` blanks `preferredChannels` when `broadcastToAll` is set
	//      (`FormAlertRules/index.tsx`).
	//   3. `toPostableRuleDTOFromAlertDef` (`types/api/alerts/convert.ts`) **never
	//      copies `broadcastToAll`** into the DTO.
	//
	// The request therefore says "no channels, no broadcast" and the server answers
	// `400 at least one channel is required`, which surfaces as the generic error
	// modal. Observed live: `body.broadcastToAll === undefined`, status `400`,
	// `.error-modal__wrap` visible, still on `/alerts/new`.
	//
	// The fix is to send the field (or to delete the switch). When it lands, unskip.
	test.skip('CV1-05 broadcast-to-all saves the rule with the broadcast flag', async ({
		authedPage: page,
		alertChannel,
		ownedRules,
	}) => {
		expect(alertChannel.name).toBeTruthy();
		await gotoCreateAlertV1(page, { alertType: SAVEABLE });
		await v1NameInput(page).fill(`e2e-cv1-05-${Date.now()}`);
		await v1ThresholdInput(page).fill('5');

		await v1BroadcastSwitch(page).click();

		// The select is unmounted, not disabled, so "pick a channel" stops being
		// possible rather than becoming optional — the switch has to carry the intent
		// on its own.
		await expect(v1ChannelSelect(page)).toHaveCount(0);
		await expect(v1SaveButton(page)).toBeEnabled();

		await v1SaveButton(page).click();
		const [response] = await Promise.all([
			page.waitForResponse((r) => isRuleCreate(r.url(), r.request().method())),
			v1ConfirmSave(page),
		]);
		await ownedRules.register(response);

		// The broadcast intent must survive the DTO conversion: an empty channel list
		// is only valid when the flag that replaces it is present.
		const body = response.request().postDataJSON();
		expect(body.broadcastToAll).toBe(true);
		expect(body.preferredChannels).toEqual([]);

		expect(response.status(), await response.text()).toBe(201);
		await expect(page.locator('.error-modal__wrap')).toBeHidden();
		await expect(page.getByText('Rule created successfully')).toBeVisible();
		await page.waitForURL(/\/alerts(\?|$)/);
		expect(new URL(page.url()).pathname).toBe('/alerts');
	});

	test('CV1-06 a cleared threshold is coerced to 0, so the required-threshold branch is dead', async ({
		authedPage: page,
		alertChannel,
		ownedRules,
	}) => {
		await gotoCreateAlertV1(page, { alertType: SAVEABLE });
		await v1NameInput(page).fill(`e2e-cv1-06-${Date.now()}`);
		await v1SelectChannel(page, alertChannel.name);

		// `Please enter a threshold to proceed` cannot be reached from the UI at all:
		//
		//   1. The field renders `0`, not empty — on metrics, logs and traces alike.
		//   2. `RuleOptions`'s `onChange` writes `Number(value) || 0`, so clearing the
		//      input stores 0 rather than nothing.
		//   3. `validateQBParams` guards `target !== 0 && !target`, i.e. it
		//      *deliberately* treats 0 as a valid threshold.
		//
		// What follows asserts the reachable behaviour and pins each link in that chain.
		await expect(v1ThresholdInput(page)).toHaveValue('0');
		await v1ThresholdInput(page).fill('');
		await expect(v1SaveButton(page)).toBeEnabled();

		await v1SaveButton(page).click();
		await expect(v1ConfirmDialog(page)).toBeVisible();

		const [response] = await Promise.all([
			page.waitForResponse((r) => isRuleCreate(r.url(), r.request().method())),
			v1ConfirmSave(page),
		]);
		await ownedRules.register(response);

		// A rule saved with a threshold of 0 rather than a validation error.
		expect(response.status(), await response.text()).toBe(201);
		expect(response.request().postDataJSON().condition.target).toBe(0);
		await expect(page.getByText(VALIDATION.targetMissing)).toBeHidden();
	});

	test('CV1-07 cancelling the confirm dialog does not save', async ({
		authedPage: page,
		alertChannel,
	}) => {
		await gotoCreateAlertV1(page, { alertType: SAVEABLE });
		await fillMinimalV1Rule(page, {
			name: `e2e-cv1-07-${Date.now()}`,
			channelName: alertChannel.name,
		});

		let sawPost = false;
		page.on('request', (request) => {
			if (isRuleCreate(request.url(), request.method())) {
				sawPost = true;
			}
		});

		await v1SaveButton(page).click();
		await expect(v1ConfirmDialog(page)).toContainText('Your alert built with');
		await v1CancelSave(page);

		expect(sawPost).toBe(false);
		// Still on the form, nothing lost.
		expect(new URL(page.url()).pathname).toBe('/alerts/new');
		await expect(v1SaveButton(page)).toBeEnabled();
	});

	test('CV1-08 the happy path posts the v1 body shape to the shared endpoint', async ({
		authedPage: page,
		alertChannel,
		ownedRules,
	}) => {
		await gotoCreateAlertV1(page, { alertType: SAVEABLE });
		const name = `e2e-cv1-08-${Date.now()}`;
		await fillMinimalV1Rule(page, { name, channelName: alertChannel.name });

		await v1SaveButton(page).click();
		const [response] = await Promise.all([
			page.waitForResponse((r) => isRuleCreate(r.url(), r.request().method())),
			v1ConfirmSave(page),
		]);
		await ownedRules.register(response);

		// The server's message is folded into the assertion: a v1 payload rejection is
		// only diagnosable from its text.
		expect(response.status(), await response.text()).toBe(201);

		// The endpoint is shared with v2 — there is no `/api/v1/rules` client in the
		// frontend — so the *body* is the only thing that distinguishes the two forms.
		const body = response.request().postDataJSON();
		expect(body.condition.target).toBe(5);
		expect(body.condition.op).toBe('1');
		// `4` is *in total*, not the `defaultMatchType` of `1` (*at least once*): the
		// per-signal defaults disagree with the shared one. `logAlertDefaults`,
		// `traceAlertDefaults` and `exceptionAlertDefaults` all hardcode `matchType: '4'`
		// while `alertDefaults` — metrics — uses `defaultMatchType`.
		expect(body.condition.matchType).toBe('4');
		expect(body.evalWindow).toBe('5m0s');
		expect(body.preferredChannels).toEqual([alertChannel.name]);
		expect(body.labels.severity).toBe('warning');
		// No v2 threshold envelope and no v2 schema marker anywhere in it.
		expect(body.schemaVersion).toBeUndefined();
		expect(body.condition.thresholds).toBeUndefined();

		// antd notification, not a sonner toast — the other half of the v1/v2 split.
		await expect(page.getByText('Rule created successfully')).toBeVisible();
		await page.waitForURL(/\/alerts(\?|$)/);
		expect(new URL(page.url()).pathname).toBe('/alerts');
	});

	test('CV1-09 CV1-10 description, labels and severity all land in the payload', async ({
		authedPage: page,
		alertChannel,
		ownedRules,
	}) => {
		await gotoCreateAlertV1(page, { alertType: SAVEABLE });
		await fillMinimalV1Rule(page, {
			name: `e2e-cv1-09-${Date.now()}`,
			channelName: alertChannel.name,
		});

		await v1DescriptionInput(page).fill('raised by the e2e suite');

		// The label editor is a two-phase input — key, ENTER, value, ENTER — sharing one
		// field, and it writes the whole label map back.
		const labels = page.getByTestId('alert-labels-input-v1');
		await labels.fill('team');
		await labels.press('Enter');
		await labels.fill('payments');
		await labels.press('Enter');

		// Severity is just another label in the payload, which is why the two halves of
		// this row belong together: the editor above must not have dropped it.
		await v1SelectOption(page, v1SeveritySelect(page), 'Critical');

		await v1SaveButton(page).click();
		const [response] = await Promise.all([
			page.waitForResponse((r) => isRuleCreate(r.url(), r.request().method())),
			v1ConfirmSave(page),
		]);
		await ownedRules.register(response);

		const body = response.request().postDataJSON();
		expect(body.annotations.description).toBe('raised by the e2e suite');
		expect(body.labels).toMatchObject({
			team: 'payments',
			severity: 'critical',
		});
	});

	test('CV1-11 test notification skips the dialog and reports no matching data', async ({
		authedPage: page,
		alertChannel,
	}) => {
		await gotoCreateAlertV1(page, { alertType: SAVEABLE });
		await fillMinimalV1Rule(page, {
			name: `e2e-cv1-11-${Date.now()}`,
			channelName: alertChannel.name,
		});

		// `onTestRuleHandler` validates inline — the confirm dialog is the *save* path
		// only, so a spec that waits for it here hangs.
		const [response] = await Promise.all([
			page.waitForResponse(
				(r) =>
					r.url().includes('/api/v2/rules/test') && r.request().method() === 'POST',
			),
			v1TestButton(page).click(),
		]);
		expect(response.ok()).toBe(true);
		await expect(v1ConfirmDialog(page)).toHaveCount(0);

		// A threshold of 5 on a rule nobody is feeding evaluates fine and matches nothing,
		// which is an *error* notification rather than a success one. Asserted
		// permissively so a stack that happens to have matching data does not flip it.
		await expect(
			page.getByText(/No alerts found during the evaluation|Success/),
		).toBeVisible();
	});

	test('CV1-12 with no channels the form is a dead end', async ({
		authedPage: page,
	}) => {
		// v2 at least offers routing policies; v1 has no equivalent escape.
		await stubNoChannels(page);
		await gotoCreateAlertV1(page, { alertType: AlertType.METRICS });
		await v1NameInput(page).fill(`e2e-cv1-12-${Date.now()}`);
		await v1ThresholdInput(page).fill('5');

		// `noChannels` disables the switch, so the one control that could satisfy
		// `isChannelConfigurationValid` without picking a channel is gone.
		await expect(v1BroadcastSwitch(page)).toBeDisabled();

		// And the select that is still on screen offers nothing but a way out of the page.
		await v1ChannelSelect(page).click();
		await expect(
			page.getByText('Create a new channel', { exact: false }),
		).toBeVisible();
		await page.keyboard.press('Escape');

		await expect(
			page.getByRole('button', { name: 'Create a notification channel' }),
		).toBeVisible();
		// ⇒ no reachable state saves this rule.
		await expect(v1SaveButton(page)).toBeDisabled();
	});

	test('CV1-13 Cancel leaves the form without saving', async ({
		authedPage: page,
		alertChannel,
	}) => {
		await gotoCreateAlertV1(page, { alertType: SAVEABLE });
		await fillMinimalV1Rule(page, {
			name: `e2e-cv1-13-${Date.now()}`,
			channelName: alertChannel.name,
		});

		let sawPost = false;
		page.on('request', (request) => {
			if (isRuleCreate(request.url(), request.method())) {
				sawPost = true;
			}
		});

		// A plain click, unlike v2's Discard: v1 has no fixed footer for the side
		// navigation to cover (CE-09).
		await v1CancelButton(page).click();
		await page.waitForURL(/\/alerts(\?|$)/);
		expect(sawPost).toBe(false);
	});

	test('CE-05 an empty PromQL expression is rejected behind the dialog', async ({
		authedPage: page,
		alertChannel,
	}) => {
		await gotoCreateAlertV1(page, { alertType: AlertType.METRICS });
		await fillMinimalV1Rule(page, {
			name: `e2e-ce05-${Date.now()}`,
			channelName: alertChannel.name,
		});

		// PromQL is offered for metrics-based alerts only; the logs/traces/exceptions
		// tab set has ClickHouse but no PromQL.
		await v1SelectQueryMode(page, 'promql');

		let sawPost = false;
		page.on('request', (request) => {
			if (isRuleCreate(request.url(), request.method())) {
				sawPost = true;
			}
		});

		await v1SaveButton(page).click();
		await v1ConfirmSave(page);

		await expect(page.getByText(VALIDATION.promql)).toBeVisible();
		expect(sawPost).toBe(false);
	});

	test('CE-06 an empty ClickHouse query is rejected behind the dialog', async ({
		authedPage: page,
		alertChannel,
	}) => {
		// Metrics-based, and not interchangeable with the logs form: `logAlertDefaults`
		// ships a **prefilled** ClickHouse query, so on a logs alert the expression is
		// never empty and `chquery_required` cannot fire. Only `alertDefaults` (metrics)
		// starts with `query: ''`.
		await gotoCreateAlertV1(page, { alertType: AlertType.METRICS });
		await fillMinimalV1Rule(page, {
			name: `e2e-ce06-${Date.now()}`,
			channelName: alertChannel.name,
		});

		await v1SelectQueryMode(page, 'clickhouse');

		let sawPost = false;
		page.on('request', (request) => {
			if (isRuleCreate(request.url(), request.method())) {
				sawPost = true;
			}
		});

		await v1SaveButton(page).click();
		await v1ConfirmSave(page);

		await expect(page.getByText(VALIDATION.clickhouse)).toBeVisible();
		expect(sawPost).toBe(false);
	});

	test('CV1-14 the condition sentence keeps its selections', async ({
		authedPage: page,
		alertChannel,
		ownedRules,
	}) => {
		// The write side of EV1-02's prefill assertions — without it a broken
		// `RuleOptions` select would only be caught on the *edit* path.
		await gotoCreateAlertV1(page, { alertType: SAVEABLE });
		await fillMinimalV1Rule(page, {
			name: `e2e-cv1-14-${Date.now()}`,
			channelName: alertChannel.name,
		});

		await v1SelectOption(page, v1OperatorSelect(page), 'below');
		await v1SelectOption(page, v1MatchTypeSelect(page), 'all the times');
		await v1SelectOption(page, v1EvalWindowSelect(page), '10 mins');

		await v1SaveButton(page).click();
		const [response] = await Promise.all([
			page.waitForResponse((r) => isRuleCreate(r.url(), r.request().method())),
			v1ConfirmSave(page),
		]);
		await ownedRules.register(response);

		// v1 stores these as the numeric enum strings the legacy validator wants — `2`
		// is *below* and `2` is *all the times*, on two different scales.
		const body = response.request().postDataJSON();
		expect(body.condition.op).toBe('2');
		expect(body.condition.matchType).toBe('2');
		expect(body.evalWindow).toBe('10m0s');
	});
});
