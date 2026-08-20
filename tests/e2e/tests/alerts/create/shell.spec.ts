import { expect, test } from '../../../fixtures/alerts/alert-rules';
import {
	AlertListTab,
	AlertType,
	RuleType,
	STOCK_ALERT_TYPE_CARDS,
} from '../../../helpers/alert-forms/constants';
import {
	alertTypeCard,
	createAlertUrl,
	expectAlertTypeCardSet,
	gotoAlertTypeSelection,
	gotoCreateAlertV1,
	gotoCreateAlertV2,
	hasAnomalyAlertTypeCard,
} from '../../../helpers/alert-forms/navigation';
import { v1SaveButton } from '../../../helpers/alert-forms/v1';

// TC-* — the create *shell*: type selection, how a card click writes the
// URL, the breadcrumb, the surrounding alerts tab bar, and the two ways to reach
// the classic form. Nothing here saves a rule, so no scenario needs a channel.

test.describe('Alert create — shell & type selection', () => {
	test('TC-01 bare /alerts/new lists exactly the expected alert-type cards', async ({
		authedPage: page,
	}) => {
		await gotoAlertTypeSelection(page);

		await expect(page.getByText('Choose a type for the alert')).toBeVisible();

		// The four stock signals are unconditional; anomaly is added only when
		// ANOMALY_DETECTION is active. `expectAlertTypeCardSet` pins the exact set *and
		// order* for whichever branch applies, so adding a sixth signal still fails.
		for (const type of STOCK_ALERT_TYPE_CARDS) {
			await expect(alertTypeCard(page, type)).toBeVisible();
		}
		await expectAlertTypeCardSet(page);
	});

	test('TC-02 picking a card writes both params and mounts the v2 builder', async ({
		authedPage: page,
	}) => {
		await gotoAlertTypeSelection(page);
		await alertTypeCard(page, AlertType.METRICS).click();

		await expect(page.getByTestId('alert-name-input')).toBeVisible();

		const params = new URL(page.url()).searchParams;
		expect(params.get('ruleType')).toBe(RuleType.THRESHOLD);
		expect(params.get('alertType')).toBe(AlertType.METRICS);
	});

	test('TC-03 the anomaly card rewrites the rule type, not the alert type', async ({
		authedPage: page,
	}) => {
		await gotoAlertTypeSelection(page);

		test.skip(
			!(await hasAnomalyAlertTypeCard(page)),
			'ANOMALY_DETECTION feature flag is inactive on this stack (see CS-01)',
		);

		await alertTypeCard(page, AlertType.ANOMALY).click();

		const params = new URL(page.url()).searchParams;
		expect(params.get('ruleType')).toBe(RuleType.ANOMALY);
		// The card's own value is deliberately *not* written: `handleSelectType`
		// forces the metrics alert type for anomaly rules, and the rendered form
		// resolves back to anomaly from `ruleType` alone.
		expect(params.get('alertType')).toBe(AlertType.METRICS);
	});

	test('TC-04 modifier-clicking a card opens the builder in a new tab', async ({
		authedPage: page,
	}) => {
		await gotoAlertTypeSelection(page);

		const [newTab] = await Promise.all([
			page.context().waitForEvent('page'),
			alertTypeCard(page, AlertType.METRICS).click({
				modifiers: ['ControlOrMeta'],
			}),
		]);

		await newTab.waitForLoadState();
		const params = new URL(newTab.url()).searchParams;
		expect(params.get('ruleType')).toBe(RuleType.THRESHOLD);
		expect(params.get('alertType')).toBe(AlertType.METRICS);

		// A modifier click that *also* navigates in place is the regression this half
		// guards.
		await expect(alertTypeCard(page, AlertType.METRICS)).toBeVisible();

		await newTab.close();
	});

	test('TC-05 breadcrumb gains a third crumb after a type is picked', async ({
		authedPage: page,
	}) => {
		await gotoAlertTypeSelection(page);

		const breadcrumb = page.locator('.ant-breadcrumb');
		await expect(breadcrumb.getByText('Alert Rules')).toBeVisible();
		await expect(breadcrumb.getByText('Select Alert Type')).toBeVisible();

		await alertTypeCard(page, AlertType.METRICS).click();
		await expect(page.getByTestId('alert-name-input')).toBeVisible();

		await expect(breadcrumb.getByText('Metric-Based Alert')).toBeVisible();

		// The middle crumb is now navigable and goes back to bare /alerts/new.
		await breadcrumb.getByRole('button', { name: 'Select Alert Type' }).click();
		await expect(alertTypeCard(page, AlertType.METRICS)).toBeVisible();
		expect(new URL(page.url()).searchParams.get('alertType')).toBeNull();
	});

	test('TC-06 create renders inside the Alert Rules tab and leaving drops subTab/search', async ({
		authedPage: page,
	}) => {
		// `subTab` and `search` are seeded here precisely so their removal is
		// observable — `handleTabChange` deletes them while keeping everything else.
		await page.goto(
			createAlertUrl({
				alertType: AlertType.LOGS,
				params: { subTab: 'Alert Rules', search: 'stale' },
			}),
		);
		await expect(page.getByTestId('alert-name-input')).toBeVisible();

		await expect(page.getByRole('tab', { name: /Alert Rules/ })).toBeVisible();
		await page.getByRole('tab', { name: /Triggered Alerts/ }).click();

		await page.waitForURL(/\/alerts\?/);
		const params = new URL(page.url()).searchParams;
		// The param carries the space-less enum value, not the tab's visible label.
		expect(params.get('tab')).toBe(AlertListTab.TRIGGERED_ALERTS);
		expect(params.get('subTab')).toBeNull();
		expect(params.get('search')).toBeNull();
	});

	test('TC-07 showClassicCreateAlertsPage=true renders the v1 form instead', async ({
		authedPage: page,
	}) => {
		await gotoCreateAlertV1(page, { alertType: AlertType.METRICS });

		await expect(v1SaveButton(page)).toBeVisible();
		// The clearest v1/v2 discriminator: the v2 header input simply is not there.
		await expect(page.getByTestId('alert-name-input')).toBeHidden();
	});

	test('TC-08 Switch to Classic Experience replaces history, so Back does not return to v2', async ({
		authedPage: page,
	}) => {
		await gotoCreateAlertV2(page, { alertType: AlertType.METRICS });

		await page
			.getByRole('button', { name: 'Switch to Classic Experience' })
			.click();

		await expect(v1SaveButton(page)).toBeVisible();
		expect(
			new URL(page.url()).searchParams.get('showClassicCreateAlertsPage'),
		).toBe('true');

		// `safeNavigate(url, { replace: true })` — going back must skip the v2 entry
		// entirely rather than bouncing between the two experiences.
		await page.goBack();
		await expect(page.getByTestId('alert-name-input')).toBeHidden();
	});
});
