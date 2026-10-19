import { ALERTS_LIST_PATH, expect, test } from '../../drivers/alerts';

// The Alerts page shell: the four top-level tabs and how they map to `?tab=`.
// Tab *internals* (channel CRUD, planned downtime, routing policies) each
// deserve their own spec.

const TAB = {
	triggered: /triggered alerts/i,
	rules: /alert rules/i,
	channels: /notification channels/i,
	configuration: /configuration/i,
};

test.describe('Alerts page shell', () => {
	test('TC-01 the four tabs render and Alert Rules is the default', async ({
		authedPage: page,
		alerts,
	}) => {
		await alerts.shell.goto();

		for (const name of Object.values(TAB)) {
			await expect(alerts.shell.tab(name)).toBeVisible();
		}
		// No `tab` param at all — `getActiveKey()` falls back to AlertRules. The
		// rules table writes its own `limit`, so the URL is not bare.
		await expect(page).toHaveURL(
			(url) => url.pathname === ALERTS_LIST_PATH && !url.searchParams.has('tab'),
		);
		await expect(alerts.shell.tab(TAB.rules)).toHaveAttribute(
			'aria-selected',
			'true',
		);
		// This spec seeds no rules, so the pane may render either the table or the
		// empty state depending on what neighbouring specs have in flight.
		await expect(
			alerts.shell.rulesHeading().or(alerts.list.search()),
		).toBeVisible();
	});

	test('TC-02 tab switch writes ?tab= and clears subTab', async ({
		authedPage: page,
		alerts,
	}) => {
		await alerts.shell.goto();

		await alerts.shell.tab(TAB.triggered).click();
		await expect(page).toHaveURL(/[?&]tab=TriggeredAlerts/);

		await alerts.shell.tab(TAB.channels).click();
		await expect(page).toHaveURL(/[?&]tab=Channels/);

		// Entering Configuration adds the default subTab…
		await alerts.shell.tab(TAB.configuration).click();
		await expect(page).toHaveURL(/[?&]tab=Configuration/);
		await expect(page).toHaveURL(/[?&]subTab=planned-downtime/);

		// …and leaving it drops subTab entirely, because `onChange` rebuilds the
		// search from scratch rather than mutating the existing params.
		await alerts.shell.tab(TAB.rules).click();
		await expect(page).toHaveURL(/[?&]tab=AlertRules/);
		await expect(page).not.toHaveURL(/subTab=/);
	});

	test('TC-03 Configuration deep-links to its sub-tabs', async ({ alerts }) => {
		// Without subTab the inner Tabs falls back to planned-downtime for its
		// activeKey without writing it to the URL, so assert the rendered tab.
		await alerts.shell.goto({ tab: 'Configuration' });
		await expect(alerts.shell.tab(/planned downtime/i)).toHaveAttribute(
			'aria-selected',
			'true',
		);

		await alerts.shell.goto({
			tab: 'Configuration',
			subTab: 'routing-policies',
		});
		await expect(alerts.shell.tab(/routing policies/i)).toHaveAttribute(
			'aria-selected',
			'true',
		);
	});

	test('TC-04 the Triggered Alerts tab mounts clean', async ({
		alerts,
		noise,
	}) => {
		await alerts.shell.goto({ tab: 'TriggeredAlerts' });

		// A fresh stack has no firing instances, so either the table or the empty
		// state is correct; what matters is that the tab mounts.
		await expect(alerts.shell.triggeredSearch()).toBeVisible();
		// Known application defect, out of scope here: an icon on this tab renders
		// with a NaN dimension.
		expect(
			noise.errors.filter(
				(error) => !error.includes('attribute viewBox: Expected number'),
			),
		).toEqual([]);
		expect(noise.failedResponses).toEqual([]);
	});

	test('TC-05 the Channels tab lists channels and survives a reload', async ({
		authedPage: page,
		alerts,
		alertChannel,
	}) => {
		await alerts.shell.goto({ tab: 'Channels' });

		await expect(alerts.channels.entry(alertChannel.name)).toBeVisible();
		await expect(alerts.channels.newButton()).toBeVisible();

		await page.reload();

		await expect(page).toHaveURL(/[?&]tab=Channels/);
		await expect(alerts.shell.tab(TAB.channels)).toHaveAttribute(
			'aria-selected',
			'true',
		);
	});
});
