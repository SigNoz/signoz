import { expect, test, type OwnedRules } from '../../../fixtures/alert-rules';
import {
	ALERT_EDIT_PATH,
	v1CancelButton,
	v1ChannelSelect,
	v1ConfirmSave,
	v1DescriptionInput,
	v1EvalWindowSelect,
	v1MatchTypeSelect,
	v1NameInput,
	v1OperatorSelect,
	v1SaveButton,
	v1SeveritySelect,
	v1ThresholdInput,
	v1BroadcastSwitch,
	selectedTags,
} from '../../../helpers/alert-forms';
import { authToken, watchConsole } from '../../../helpers/common';
import { gotoAlertDetails } from '../../../helpers/alerts';

// EV1-* — editing a rule whose `schemaVersion` is *not* `v2alpha1`.
//
// The classic form is what renders, inside the same details shell the v2 builder
// uses: `container/EditRules/index.tsx:17-30` picks the form from the rule, so
// there is no way to open a v1 rule in the v2 builder (and EV1-08 asserts the
// reverse — editing never migrates the schema).
//
// `gotoAlertOverview` cannot be used here: it waits for `threshold-value-input`,
// which only the v2 builder renders.
//
// See `specs/alerts/alerts-create-edit-coverage.md` §5.5.

/**
 * SEED-RV1 — every asserted field deliberately differs from `alertDefaults`, so a
 * passing prefill assertion cannot be satisfied by the create form's own defaults.
 * `target` in particular: the v1 create default is *absent*.
 */
const SEED_RV1 = {
	target: 73,
	/** `2` is *below*, against the create default of `1` (*above*). */
	op: '2',
	/** `2` is *all the times*, against the create default of `1` (*at least once*). */
	matchType: '2',
	evalWindow: '15m0s',
	severity: 'error',
} as const;

/** The description every seeded rule carries (`ANNOTATIONS` in `helpers/alerts.ts`). */
const SEEDED_DESCRIPTION =
	'This alert is fired when the defined metric (current value: {{$value}}) crosses the threshold ({{$threshold}})';

type LogsSeedOverrides = Omit<Parameters<OwnedRules['logs']>[0], 'name'>;

function seedRv1(
	ownedRules: OwnedRules,
	name: string,
	extra: Partial<LogsSeedOverrides> = {},
): Promise<string> {
	return ownedRules.logs({
		schema: 'v1',
		target: SEED_RV1.target,
		op: SEED_RV1.op,
		matchType: SEED_RV1.matchType,
		evalWindow: SEED_RV1.evalWindow,
		severity: SEED_RV1.severity,
		...extra,
		name,
	});
}

/** Read a rule straight from the API — EV1-08 needs the stored schema version. */
async function readRule(
	page: import('@playwright/test').Page,
	ruleId: string,
): Promise<Record<string, unknown>> {
	const token = await authToken(page);
	const res = await page.request.get(`/api/v2/rules/${ruleId}`, {
		headers: { Authorization: `Bearer ${token}` },
	});
	expect(res.ok()).toBe(true);
	const json = (await res.json()) as { data: Record<string, unknown> };
	return json.data;
}

test.describe('Alert edit — v1 rule', () => {
	test('EV1-01 the classic form renders in edit mode inside the details shell', async ({
		authedPage: page,
		ownedRules,
	}) => {
		const ruleId = await seedRv1(ownedRules, `e2e-ev1-shell-${Date.now()}`);

		await gotoAlertDetails(page, ruleId);

		const root = page.getByTestId('alert-details-root');
		// The shell marks the schema on the root node, and only v2 rules get the
		// `alert-details-v2` class (`AlertDetails.tsx:96-99`).
		await expect(root).toHaveAttribute('data-schema-version', 'v1');
		await expect(root).not.toHaveClass(/alert-details-v2/);

		// The classic form, not the builder: v1's own name field exists and the v2
		// header's does not.
		await expect(v1NameInput(page)).toBeVisible();
		await expect(page.getByTestId('alert-name-input')).toHaveCount(0);

		// Edit-mode labels and container class (`index.tsx:849-853, 970, 991-992`).
		await expect(
			page.locator('.form-alert-rules-container.edit-mode'),
		).toBeVisible();
		await expect(v1SaveButton(page)).toHaveText(/Save Rule/);
		await expect(v1CancelButton(page)).toHaveText(/Discard/);
	});

	test('EV1-02 every seeded field prefills the form', async ({
		authedPage: page,
		ownedRules,
	}) => {
		const name = `e2e-ev1-prefill-${Date.now()}`;
		const ruleId = await seedRv1(ownedRules, name, {
			extraLabels: { team: 'payments' },
		});

		await gotoAlertDetails(page, ruleId);

		await expect(v1NameInput(page)).toHaveValue(name);
		await expect(v1DescriptionInput(page)).toHaveValue(SEEDED_DESCRIPTION);
		await expect(v1SeveritySelect(page)).toContainText('Error');

		// The four `RuleOptions` controls. These are the values CV1-14 writes, read back
		// from the other side.
		await expect(v1ThresholdInput(page)).toHaveValue(String(SEED_RV1.target));
		await expect(v1OperatorSelect(page)).toContainText('below');
		await expect(v1MatchTypeSelect(page)).toContainText('all the times');
		await expect(v1EvalWindowSelect(page)).toContainText('15 mins');

		// Labels render as chips, severity included — the editor writes the whole map.
		await expect(page.getByText('team: payments')).toBeVisible();
	});

	test('EV1-03 preferredChannels decide which channel control is prefilled', async ({
		authedPage: page,
		ownedRules,
		alertChannel,
	}) => {
		const ruleId = await seedRv1(ownedRules, `e2e-ev1-channels-${Date.now()}`);

		await gotoAlertDetails(page, ruleId);

		// `BasicInfo.tsx:66-73` reads `preferredChannels` *once*, on mount: a rule that
		// names channels gets the switch **off** and the select filled. The seed always
		// names one, so this is the populated branch — and the tag is counted rather than
		// name-matched, since the select truncates at 10 characters.
		await expect(v1BroadcastSwitch(page)).toHaveAttribute(
			'aria-checked',
			'false',
		);
		await expect(v1ChannelSelect(page)).toBeVisible();
		await expect(selectedTags(v1ChannelSelect(page))).toHaveCount(1);
		expect(alertChannel.name).toBeTruthy();
	});

	test('EV1-04 the happy-path update PUTs the v1 body and keeps unrelated params', async ({
		authedPage: page,
		ownedRules,
	}) => {
		const name = `e2e-ev1-update-${Date.now()}`;
		const ruleId = await seedRv1(ownedRules, name);

		await gotoAlertDetails(page, ruleId);
		await v1ThresholdInput(page).fill('81');

		await v1SaveButton(page).click();
		const [response] = await Promise.all([
			page.waitForResponse(
				(r) =>
					r.request().method() === 'PUT' &&
					r.url().includes(`/api/v2/rules/${ruleId}`),
			),
			v1ConfirmSave(page),
		]);

		// **`PUT /api/v2/rules/{id}`**, not `/api/v1/rules/{id}`: there is no v1 rules
		// client in the frontend at all, so both forms share the endpoint and differ only
		// in the body (coverage doc §2, Endpoints row).
		expect(response.ok()).toBe(true);
		const body = response.request().postDataJSON();
		expect(body.condition.target).toBe(81);
		expect(body.condition.op).toBe(SEED_RV1.op);
		expect(body.evalWindow).toBe(SEED_RV1.evalWindow);
		expect(body.schemaVersion).toBeUndefined();

		await expect(page.getByText('Rule edited successfully')).toBeVisible();
		await page.waitForURL(/\/alerts(\?|$)/);
		expect(new URL(page.url()).pathname).toBe('/alerts');
		// `saveRule` strips exactly four params on the way out (`index.tsx:613-617`).
		const params = new URL(page.url()).searchParams;
		expect(params.get('ruleId')).toBeNull();
		expect(params.get('compositeQuery')).toBeNull();

		await gotoAlertDetails(page, ruleId);
		await expect(v1ThresholdInput(page)).toHaveValue('81');
	});

	test('EV1-05 Discard leaves without a PUT and without changing the rule', async ({
		authedPage: page,
		ownedRules,
	}) => {
		const ruleId = await seedRv1(ownedRules, `e2e-ev1-discard-${Date.now()}`);

		await gotoAlertDetails(page, ruleId);

		let sawPut = false;
		page.on('request', (request) => {
			if (request.method() === 'PUT' && request.url().includes('/rules/')) {
				sawPut = true;
			}
		});

		await v1ThresholdInput(page).fill('999');
		await v1CancelButton(page).click();
		await page.waitForURL(/\/alerts(\?|$)/);

		expect(sawPut).toBe(false);
		await gotoAlertDetails(page, ruleId);
		await expect(v1ThresholdInput(page)).toHaveValue(String(SEED_RV1.target));
	});

	test('EV1-06 the header title and the form name field agree', async ({
		authedPage: page,
		ownedRules,
	}) => {
		const name = `e2e-ev1-header-${Date.now()}`;
		const ruleId = await seedRv1(ownedRules, name);

		await gotoAlertDetails(page, ruleId);

		// v1's `AlertHeader` renders the name as static text while the form renders it as
		// an input; two sources for one value, so they are asserted together. Renaming
		// through the header's modal is `AD-03`'s scenario — this row only pins that the
		// two agree on load, which is the precondition that makes `AD-03` meaningful.
		await expect(page.getByTestId('alert-details-root')).toContainText(name);
		await expect(v1NameInput(page)).toHaveValue(name);
	});

	test('EV1-07 /alerts/edit redirects for a v1 rule exactly as it does for v2', async ({
		authedPage: page,
		ownedRules,
	}) => {
		const ruleId = await seedRv1(ownedRules, `e2e-ev1-alias-${Date.now()}`);

		// Coverage doc §9.1: the alias is resolved by `AppRoutes/Private.tsx:86-107`
		// before route matching, so `pages/EditRules` never renders standalone and there
		// is no v1/v2 asymmetry — the premise pass 0 built CE-01/CE-02 on.
		const watch = watchConsole(page);
		await page.goto(`${ALERT_EDIT_PATH}?ruleId=${ruleId}`);

		await page.waitForURL(/\/alerts\/overview/);
		expect(new URL(page.url()).searchParams.get('ruleId')).toBe(ruleId);
		await expect(page.getByTestId('alert-details-root')).toHaveAttribute(
			'data-schema-version',
			'v1',
		);
		await expect(v1SaveButton(page)).toBeVisible();
		expect(watch.errors).toEqual([]);
	});

	test('EV1-08 editing a v1 rule never migrates it to the v2 schema', async ({
		authedPage: page,
		ownedRules,
	}) => {
		const ruleId = await seedRv1(ownedRules, `e2e-ev1-noupgrade-${Date.now()}`);

		await gotoAlertDetails(page, ruleId);
		await v1ThresholdInput(page).fill('91');
		await v1SaveButton(page).click();
		await Promise.all([
			page.waitForResponse(
				(r) =>
					r.request().method() === 'PUT' &&
					r.url().includes(`/api/v2/rules/${ruleId}`),
			),
			v1ConfirmSave(page),
		]);
		await page.waitForURL(/\/alerts(\?|$)/);

		// §2.1: the classic form posts a v1 body and `pages/EditRules` picks the editor
		// from the *stored* schema, so a saved v1 rule stays v1. Asserted from the API as
		// well as the DOM — the UI could pick the right form off a cached response.
		const rule = await readRule(page, ruleId);
		expect(rule.schemaVersion).not.toBe('v2alpha1');

		await gotoAlertDetails(page, ruleId);
		await expect(page.getByTestId('alert-details-root')).toHaveAttribute(
			'data-schema-version',
			'v1',
		);
		await expect(page.getByTestId('alert-name-input')).toHaveCount(0);
	});
});
