import { DEFAULT_RELATIVE_TIME, expect, test } from '../../../drivers/alerts';

// The three read-only panels above the timeline: the stats cards, the top
// contributors card and the overall-status graph.
//
// The sparkline's populated branch has no scenario: whether the seed's ~2 minute
// firing wave lands in one stats bucket or two depends on where it falls
// relative to the bucket boundary, and the `timeSeries.length > 1` gate flips
// between runs. It needs a fixture that guarantees two points.

test.describe('Alert history — insights', () => {
	test('TC-01 the stats cards report the firing count and the empty resolution', async ({
		alerts,
		alertHistory,
	}) => {
		await alerts.history.goto(alertHistory.ruleId);

		const triggered = alerts.history.statsCard('Total Triggered');
		await expect(triggered).toHaveAttribute('data-empty', 'false');
		await expect(alerts.history.statsCardValue('Total Triggered')).toHaveText(
			String(alertHistory.total),
		);
		// No earlier window to compare against, and that has to read as words
		// rather than as a number.
		await expect(alerts.history.statsCardChange('Total Triggered')).toHaveText(
			'no previous data',
		);

		const resolution = alerts.history.statsCard('Avg. Resolution Time');
		await expect(resolution).toHaveAttribute('data-empty', 'true');
		const value = alerts.history.statsCardValue('Avg. Resolution Time');
		await expect(value).toHaveText('No Resolutions.');
		await expect(value).not.toHaveText(/NaN/);
		// An empty card never draws a sparkline.
		await expect(
			alerts.history.statsCardSparkline('Avg. Resolution Time'),
		).toHaveCount(0);
	});

	test('TC-02 the stats follow the time range', async ({
		alerts,
		alertHistory,
	}) => {
		const end = Date.now() - 24 * 60 * 60 * 1000;
		await alerts.history.goto(alertHistory.ruleId, {
			startTime: String(end - 30 * 60 * 1000),
			endTime: String(end),
		});

		await expect(alerts.history.statsCardValue('Total Triggered')).toHaveText(
			'None Triggered.',
		);
		await expect(
			alerts.history.statsCardValue('Avg. Resolution Time'),
		).toHaveText('No Resolutions.');

		await alerts.history.goto(alertHistory.ruleId);
		await expect(alerts.history.statsCardValue('Total Triggered')).toHaveText(
			String(alertHistory.total),
		);
	});

	test('TC-03 a resolved rule gets a formatted average and a firing-only count', async ({
		alerts,
		resolvedHistory,
	}) => {
		await alerts.history.goto(resolvedHistory.ruleId);

		const resolution = alerts.history.statsCard('Avg. Resolution Time');
		await expect(resolution).toHaveAttribute('data-empty', 'false');
		const value = alerts.history.statsCardValue('Avg. Resolution Time');
		await expect(value).not.toHaveText('No Resolutions.');
		await expect(value).not.toHaveText('');

		// Total Triggered counts firing rows only, while the table shows both.
		await expect(alerts.history.statsCardValue('Total Triggered')).toHaveText(
			String(resolvedHistory.firingCount),
		);
		await expect(alerts.history.rows()).toHaveCount(
			resolvedHistory.firingCount + resolvedHistory.resolvedCount,
		);
	});

	test('TC-04 top contributors shows three rows with their ratio and bar', async ({
		alerts,
		alertHistory,
	}) => {
		await alerts.history.goto(alertHistory.ruleId);

		const card = alerts.history.contributorsCard();
		await expect(card).toBeVisible();
		await expect(card).toContainText('top contributors');

		const rows = alerts.history.contributorRows(card);
		await expect(rows).toHaveCount(3);
		// The ratio text and the bar are rendered by different columns, so dropping
		// the bar's `/ total * 100` scaling would leave the text intact. Radix
		// surfaces the clamped percent as `aria-valuenow`.
		const percent = String((1 / alertHistory.total) * 100);
		for (let i = 0; i < 3; i += 1) {
			// eslint-disable-next-line no-await-in-loop
			await expect(alerts.history.contributorCount(rows.nth(i))).toHaveText(
				`1/${alertHistory.total}`,
			);
			// eslint-disable-next-line no-await-in-loop
			await expect(rows.nth(i)).toContainText('service.name');
			// eslint-disable-next-line no-await-in-loop
			await expect(alerts.history.contributorBar(rows.nth(i))).toHaveAttribute(
				'aria-valuenow',
				percent,
			);
		}

		// A logs rule's contributors carry a logs link and no traces link.
		await alerts.history.contributorCount(rows.first()).click();
		await expect(alerts.history.viewLogsLink()).toBeVisible();
		await expect(alerts.history.viewTracesLink()).toHaveCount(0);
	});

	test('TC-05 View all opens a paginated drawer and deep-links to it', async ({
		authedPage: page,
		alerts,
		alertHistory,
		metricsHistory,
	}) => {
		await alerts.history.goto(alertHistory.ruleId);
		await alerts.history.contributorsViewAll().click();

		await expect(page).toHaveURL(/[?&]viewAllTopContributors=true/);
		const drawer = alerts.history.contributorsDrawer();
		await expect(drawer).toBeVisible();
		await expect(alerts.history.contributorsDrawerTitle()).toBeVisible();
		await expect(alerts.history.contributorRows(drawer)).toHaveCount(10);
		await expect(alerts.history.contributorsDrawerTotal()).toHaveText(
			` of ${alertHistory.total}`,
		);

		await alerts.history.goto(alertHistory.ruleId, {
			viewAllTopContributors: 'true',
		});
		await expect(alerts.history.contributorsDrawer()).toBeVisible();

		// Three contributors or fewer and there is nothing to view all of.
		await alerts.history.goto(metricsHistory.ruleId);
		await expect(alerts.history.contributorsCard()).toBeVisible();
		await expect(alerts.history.contributorsViewAll()).toHaveCount(0);
	});

	test('TC-06 the graph draws the segments the status endpoint returns', async ({
		authedPage: page,
		alerts,
		alertHistory,
		noise,
	}) => {
		const status = page.waitForResponse((res) =>
			alerts.history.isRequest(res.request(), 'overall_status'),
		);
		await alerts.history.goto(alertHistory.ruleId);

		const body = (await (await status).json()) as {
			data: { state: string }[] | null;
		};
		// The rule was inactive until the seeded records arrived, then fired.
		expect((body.data ?? []).map((segment) => segment.state)).toEqual([
			'inactive',
			'firing',
		]);

		await expect(alerts.history.graph()).toBeVisible();
		await expect(alerts.history.graphCanvas()).toBeVisible();
		await expect(alerts.history.graphTitle()).toHaveText(
			`${alertHistory.total} triggers in ${DEFAULT_RELATIVE_TIME}`,
		);

		expect(noise.errors).toEqual([]);
		expect(noise.failedResponses).toEqual([]);
	});

	test('TC-07 a resolved and a nodata rule both draw without errors', async ({
		authedPage: page,
		alerts,
		noDataHistory,
		noise,
		resolvedHistory,
	}) => {
		const resolved = page.waitForResponse((res) =>
			alerts.history.isRequest(res.request(), 'overall_status'),
		);
		await alerts.history.goto(resolvedHistory.ruleId);
		const resolvedBody = (await (await resolved).json()) as {
			data: { state: string }[] | null;
		};
		expect((resolvedBody.data ?? []).map((segment) => segment.state)).toEqual([
			'inactive',
			'firing',
			'inactive',
		]);
		await expect(alerts.history.graphCanvas()).toBeVisible();

		const nodata = page.waitForResponse((res) =>
			alerts.history.isRequest(res.request(), 'overall_status'),
		);
		await alerts.history.goto(noDataHistory.ruleId);
		const nodataBody = (await (await nodata).json()) as {
			data: { state: string }[] | null;
		};
		const states = (nodataBody.data ?? []).map((segment) => segment.state);
		expect(states.length).toBeGreaterThan(0);
		for (const state of states) {
			expect([
				'firing',
				'inactive',
				'pending',
				'nodata',
				'recovering',
				'disabled',
			]).toContain(state);
		}
		await expect(alerts.history.graphCanvas()).toBeVisible();

		expect(noise.errors).toEqual([]);
		expect(noise.failedResponses).toEqual([]);
	});
});
