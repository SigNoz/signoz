import { expect, test } from '../../fixtures/alerts/alert-rules';
import { ALERTS_LIST_PATH } from '../../helpers/alerts/constants';
import { watchConsole } from '../../helpers/common';

// TC-* — the Alerts page shell: the four top-level tabs, how they map to
// `?tab=`, and a navigation smoke check per tab. Tab *internals* (channel CRUD,
// planned downtime, routing policies) are deliberately out of scope — each
// deserves its own spec file.

const TAB_NAMES = {
	triggered: /triggered alerts/i,
	rules: /alert rules/i,
	channels: /notification channels/i,
	configuration: /configuration/i,
};

test.describe('Alerts page shell', () => {
	test('TC-01 all four top-level tabs render', async ({ authedPage: page }) => {
		await page.goto(ALERTS_LIST_PATH);

		for (const name of Object.values(TAB_NAMES)) {
			await expect(page.getByRole('tab', { name })).toBeVisible();
		}
	});

	test('TC-02 default tab is Alert Rules', async ({ authedPage: page }) => {
		await page.goto(ALERTS_LIST_PATH);

		// No `tab` param at all — `getActiveKey()` falls back to AlertRules.
		await expect(page).toHaveURL(ALERTS_LIST_PATH);
		await expect(
			page.getByRole('tab', { name: TAB_NAMES.rules }),
		).toHaveAttribute('aria-selected', 'true');
		// This spec seeds no rules, so the pane may render either the table (with
		// its search input) or `AlertsEmptyState` depending on what neighbouring
		// specs have in flight. Assert the pane itself, not one of its variants —
		// `ListAlertRules` hides the search input entirely in the empty state.
		await expect(
			page
				.getByRole('heading', { name: 'Alert Rules' })
				.or(page.getByTestId('list-alerts-search-input')),
		).toBeVisible();
	});

	test('TC-03 tab switch writes ?tab= and clears subTab', async ({
		authedPage: page,
	}) => {
		await page.goto(ALERTS_LIST_PATH);

		await page.getByRole('tab', { name: TAB_NAMES.triggered }).click();
		await expect(page).toHaveURL(/[?&]tab=TriggeredAlerts/);

		await page.getByRole('tab', { name: TAB_NAMES.channels }).click();
		await expect(page).toHaveURL(/[?&]tab=Channels/);

		// Entering Configuration adds the default subTab...
		await page.getByRole('tab', { name: TAB_NAMES.configuration }).click();
		await expect(page).toHaveURL(/[?&]tab=Configuration/);
		await expect(page).toHaveURL(/[?&]subTab=planned-downtime/);

		// ...and leaving it drops subTab entirely (onChange rebuilds the search
		// from scratch rather than mutating the existing params).
		await page.getByRole('tab', { name: TAB_NAMES.rules }).click();
		await expect(page).toHaveURL(/[?&]tab=AlertRules/);
		await expect(page).not.toHaveURL(/subTab=/);
	});

	test('TC-04 Configuration deep-link', async ({ authedPage: page }) => {
		// Deep-linking without subTab: the inner Tabs falls back to
		// planned-downtime for its activeKey without writing it to the URL, so
		// assert the rendered tab, not the param.
		await page.goto(`${ALERTS_LIST_PATH}?tab=Configuration`);
		await expect(
			page.getByRole('tab', { name: /planned downtime/i }),
		).toHaveAttribute('aria-selected', 'true');

		await page.goto(
			`${ALERTS_LIST_PATH}?tab=Configuration&subTab=routing-policies`,
		);
		await expect(
			page.getByRole('tab', { name: /routing policies/i }),
		).toHaveAttribute('aria-selected', 'true');
	});

	test('TC-05 Triggered Alerts tab smoke', async ({ authedPage: page }) => {
		// Known application defect, out of scope here: an icon on this tab renders
		// with a NaN dimension ("<svg> attribute viewBox: Expected number, \"0 0 32
		// NaN\""). Ignore that one string so the rest of the console guard still
		// has teeth.
		const watch = watchConsole(page, {
			ignore: ['attribute viewBox: Expected number'],
		});

		await page.goto(`${ALERTS_LIST_PATH}?tab=TriggeredAlerts`);

		// A fresh stack has no firing instances, so either the table or the empty
		// state is correct — what matters is that the tab mounts and its controls
		// render.
		await expect(page.getByTestId('triggered-alerts-search-input')).toBeVisible();
		expect(watch.errors).toEqual([]);
		expect(watch.failedResponses).toEqual([]);
	});

	test('TC-06 Notification Channels tab smoke', async ({
		authedPage: page,
		alertChannel,
	}) => {
		// The worker's channel gives this tab a row to render.
		await page.goto(`${ALERTS_LIST_PATH}?tab=Channels`);

		await expect(page.getByText(alertChannel.name)).toBeVisible();
		await expect(
			page.getByRole('button', { name: /new alert channel/i }),
		).toBeVisible();
	});

	test('TC-07 tab state survives reload', async ({ authedPage: page }) => {
		await page.goto(`${ALERTS_LIST_PATH}?tab=Channels`);
		await expect(
			page.getByRole('tab', { name: TAB_NAMES.channels }),
		).toHaveAttribute('aria-selected', 'true');

		await page.reload();

		await expect(page).toHaveURL(/[?&]tab=Channels/);
		await expect(
			page.getByRole('tab', { name: TAB_NAMES.channels }),
		).toHaveAttribute('aria-selected', 'true');
	});
});
