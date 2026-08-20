import type { Page } from '@playwright/test';

import { expect, test } from '../../../fixtures/alerts/alert-rules';
import {
	ALERTS_NEW_PATH,
	AlertType,
	type AlertTypeValue,
	evaluationSettingsButton,
	gotoCreateAlertV2,
	RuleType,
	thresholdRows,
	ThresholdMatchType,
	ThresholdOperator,
} from '../../../helpers/alert-forms';
import { gotoAlertOverview } from '../../../helpers/alerts';

// TC-* — deep-link prefill.
//
// The contract is producer-agnostic (`context/resolveUrlAlertPrefill.ts`), but the
// three producers do **not** write the same params: dashboards
// (`buildAlertUrl`) and the explorer only ever emit query/panel params, while
// metering (`MultiIngestionSettings`) is the sole producer of `ruleName`,
// `yAxisUnit` and `evaluationWindowPreset`. CD-04 and CD-05 therefore drive the
// *metering* URL shape — aiming them at a dashboard URL would test a link nobody
// generates.

/**
 * A `compositeQuery` param harvested from the app itself.
 *
 * Hand-writing the v5 envelope would be a second, drifting copy of the query
 * builder's serialiser — the thing these scenarios are *reading*, not testing. So
 * the builder is opened once, allowed to serialise its own default query into the
 * URL, and that exact value is reused as the deep link.
 */
async function harvestCompositeQuery(
	page: Page,
	alertType: AlertTypeValue,
): Promise<string> {
	await gotoCreateAlertV2(page, { alertType });
	const value = new URL(page.url()).searchParams.get('compositeQuery');
	if (!value) {
		throw new Error(
			'the builder did not serialise a compositeQuery into the URL',
		);
	}
	return value;
}

/** `Threshold` as `context/types.ts` declares it — the shape the URL param carries. */
function urlThreshold(
	overrides: Record<string, unknown>,
): Record<string, unknown> {
	return {
		id: 'e2e-url-threshold',
		label: 'from-url',
		thresholdValue: 0,
		recoveryThresholdValue: null,
		unit: '',
		channels: [],
		color: '#e5484d',
		...overrides,
	};
}

function prefillUrl(params: Record<string, string>): string {
	return `${ALERTS_NEW_PATH}?${new URLSearchParams(params).toString()}`;
}

test.describe('Alert create — deep-link prefill', () => {
	test('TC-01 a compositeQuery alone selects the alert type', async ({
		authedPage: page,
	}) => {
		const compositeQuery = await harvestCompositeQuery(page, AlertType.LOGS);

		// No `alertType` and no `ruleType` in this URL: both come from the query's data
		// source through `ALERT_TYPE_VS_SOURCE_MAPPING`. The presence of
		// `compositeQuery` is also what skips the type-selection page, so this one
		// param decides two things at once.
		await page.goto(prefillUrl({ compositeQuery }));

		await expect(page.getByTestId('alert-name-input')).toBeVisible();

		// Asserted on the *rendered* signal tab, not on the URL: the mapping only feeds
		// the memo that picks the form — it does **not** write `alertType` back into the
		// query string. So a spec waiting for `alertType=LOGS_BASED_ALERT` in the URL
		// waits forever.
		await expect(
			page.locator('.list-view-tab.active-tab', {
				has: page.getByTestId('logs-view'),
			}),
		).toHaveCount(1);
		expect(new URL(page.url()).searchParams.get('alertType')).toBeNull();

		// A stale `compositeQuery` silently bypasses card selection, so the cards must
		// not be on screen.
		await expect(page.locator('[data-testid^="alert-type-card-"]')).toHaveCount(
			0,
		);
	});

	test('TC-02 thresholds prefill from JSON, and a malformed value falls back', async ({
		authedPage: page,
	}) => {
		const base = {
			alertType: AlertType.LOGS,
			ruleType: RuleType.THRESHOLD,
		};

		await page.goto(
			prefillUrl({
				...base,
				thresholds: JSON.stringify([
					urlThreshold({ label: 'page-me', thresholdValue: 42 }),
					urlThreshold({
						id: 'e2e-url-threshold-2',
						label: 'warn-me',
						thresholdValue: 7,
					}),
				]),
			}),
		);

		await expect(thresholdRows(page)).toHaveCount(2);
		const names = page.getByTestId('threshold-name-input');
		await expect(names.nth(0)).toHaveValue('page-me');
		await expect(names.nth(1)).toHaveValue('warn-me');
		await expect(page.getByTestId('threshold-value-input').nth(0)).toHaveValue(
			'42',
		);

		// A malformed value is swallowed by `parseThresholds` and the form falls back to
		// its own single `critical` row. That path also writes
		// `console.error('Error parsing thresholds from URL:', …)`, which is why this
		// scenario must never be paired with CE-07's clean-console assertion.
		await page.goto(prefillUrl({ ...base, thresholds: 'not-json-at-all' }));
		await expect(thresholdRows(page)).toHaveCount(1);
		await expect(page.getByTestId('threshold-name-input')).toHaveValue(
			'critical',
		);
	});

	test('TC-03 matchType and compareOp aliases normalise to the enum', async ({
		authedPage: page,
	}) => {
		// `avg` and `<` are aliases the *backend* accepts (`normalizeMatchType` /
		// `normalizeOperator` mirror `pkg/types/ruletypes/{match,compare}.go`), not values
		// the UI ever writes — so a producer or a hand-edited link can carry them.
		await page.goto(
			prefillUrl({
				alertType: AlertType.LOGS,
				ruleType: RuleType.THRESHOLD,
				matchType: 'avg',
				compareOp: '<',
			}),
		);

		await expect(
			page.getByTestId('alert-threshold-match-type-select'),
		).toContainText(ThresholdMatchType.ON_AVERAGE.label);
		await expect(
			page.getByTestId('alert-threshold-operator-select'),
		).toContainText(ThresholdOperator.BELOW.label);
	});

	test('TC-04 ruleName and yAxisUnit apply once and never stomp an edit', async ({
		authedPage: page,
	}) => {
		const compositeQuery = await harvestCompositeQuery(page, AlertType.METRICS);
		const ruleName =
			'[ingestion][logs] e2e key has exceeded daily ingestion limit';

		// The metering URL shape, verbatim from `MultiIngestionSettings.tsx`.
		await page.goto(
			prefillUrl({
				compositeQuery,
				thresholds: JSON.stringify([
					urlThreshold({ label: 'critical', thresholdValue: 100, unit: 'bytes' }),
				]),
				ruleName,
				yAxisUnit: 'bytes',
				matchType: ThresholdMatchType.IN_TOTAL.value,
				evaluationWindowPreset: 'meter',
			}),
		);

		await expect(page.getByTestId('alert-name-input')).toHaveValue(ruleName);
		// `yAxisUnit` is what makes the per-threshold unit select usable at all — with no
		// unit the control is permanently disabled (CV2-12).
		await expect(
			page.getByTestId('threshold-unit-select').first(),
		).not.toHaveClass(/ant-select-disabled/);

		// Now the half the `ruleNameAppliedRef` / `yAxisUnitAppliedRef` guards exist for.
		// The prefill effect re-runs on *every* change to location.search, and the query
		// builder rewrites it constantly — without the refs, a hand-edited name would be
		// silently reverted to the URL's the next time that happened.
		const edited = 'e2e-cd-04-renamed-by-hand';
		await page.getByTestId('alert-name-input').fill(edited);

		// Switching the signal tab is a real user action that rewrites the URL *and*
		// changes `alertType`, which is also in the effect's dependency list.
		await page.getByTestId('logs-view').click();
		await page.waitForURL(/alertType=LOGS_BASED_ALERT/);

		await expect(page.getByTestId('alert-name-input')).toHaveValue(edited);
	});

	test('TC-05 evaluationWindowPreset=meter switches to the cumulative daily window', async ({
		authedPage: page,
	}) => {
		const compositeQuery = await harvestCompositeQuery(page, AlertType.METRICS);

		await page.goto(
			prefillUrl({
				compositeQuery,
				matchType: ThresholdMatchType.IN_TOTAL.value,
				evaluationWindowPreset: 'meter',
			}),
		);

		// `SET_INITIAL_STATE_FOR_METER` is a *cumulative* window starting at midnight
		// UTC — not one of the rolling presets — so the trigger button's whole text
		// changes shape, type included.
		await expect(evaluationSettingsButton(page)).toContainText('Cumulative');
		await expect(evaluationSettingsButton(page)).toContainText(
			'Current day, starting from 00:00:00 (UTC)',
		);
	});

	test('TC-06 URL prefill is ignored in edit mode', async ({
		authedPage: page,
		ownedRules,
	}) => {
		const ruleId = await ownedRules.threshold(`e2e-cd-06-${Date.now()}`, {
			target: 42,
		});

		await gotoAlertOverview(page, ruleId);
		// Append a prefill param to the *edit* URL, which is what a stale link or a copied
		// query string produces in practice.
		await page.goto(
			`${new URL(page.url()).pathname}?${new URLSearchParams({
				ruleId,
				thresholds: JSON.stringify([
					urlThreshold({ label: 'from-url', thresholdValue: 999 }),
				]),
			}).toString()}`,
		);

		await expect(page.getByTestId('threshold-value-input').first()).toBeVisible();

		// The effect early-returns in edit mode. Without that return the `RESET` at the
		// top of the block would wipe the loaded rule's thresholds every time the query
		// builder rewrote location.search.
		await expect(thresholdRows(page)).toHaveCount(1);
		await expect(page.getByTestId('threshold-name-input')).toHaveValue(
			'critical',
		);
		await expect(page.getByTestId('threshold-value-input')).toHaveValue('42');
		await expect(page.getByTestId('alert-name-input')).not.toHaveValue(
			'from-url',
		);
	});
});
