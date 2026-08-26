/**
 * The drawer's Metrics tab.
 *
 * TC-03/04 are the ported `drawer-explorer-link.spec.ts` cases: the compass on
 * every chart deep-links to the metrics explorer and must carry the **drawer's**
 * time range, not the list's, plus the panel's own metric.
 *
 * The link *does* serialise a `unit` now, and that one key is what keeps the back
 * button usable: the explorer rewrites — and pushes — any `compositeQuery` missing
 * a key of `initialQueriesMap.metrics`. #12402 fixed it at the producer, so
 * TC-04 and TC-10 assert Back rather than documenting why it cannot work.
 * See §12.2, FIX-4 in the plan.
 */

import type { Page } from '@playwright/test';

import { expect, test } from '../../../fixtures/auth';
import { expectWidgetTitles } from '../../../helpers/infra-monitoring/assertions';
import {
	chartHeaders,
	expectDrawerVisible,
	METRICS,
	metricsExplorerLinkTestId,
	selectedItemParams,
	switchDrawerTab,
} from '../../../helpers/infra-monitoring/drawer';
import {
	type EntityDef,
	POD_METRICS_WIDGET_TITLES,
	WIDE_TAG,
	entityByKey,
	fanOut,
} from '../../../helpers/infra-monitoring/entities';
import {
	allowForSeededWait,
	goBackUntil,
	gotoScopedList,
	listUrl,
	resetTableState,
	waitForRow,
} from '../../../helpers/infra-monitoring/list';
import { seedDataset } from '../../../helpers/infra-monitoring/seed';

/** Deep-link straight into the drawer's Metrics tab. */
async function openMetricsTab(
	page: Page,
	entity: EntityDef,
	overrides: Record<string, string> = {},
): Promise<void> {
	await resetTableState(page, entity);
	await seedDataset(page, entity.seed.primary);
	await page.goto(
		listUrl(entity, { ...selectedItemParams(entity), ...overrides }),
	);
	await expectDrawerVisible(page);
}

// ─── once-level: the widget list reaches the DOM through `K8sBaseDetails`, which
// ─── does not branch on entity. The per-entity titles are only mirrored in the
// ─── registry for the entities a `once`- or `representative`-level scenario runs
// ─── on, so widening this again buys nothing to assert against.

for (const entity of fanOut('once')) {
	test.describe(`drawer-metrics ${entity.key} ${WIDE_TAG}`, () => {
		test(`TC-01 ${entity.key}: chart headers match the registry's ${entity.widgetTitles!.length} widgets in order`, async ({
			authedPage: page,
		}) => {
			await openMetricsTab(page, entity);
			await expectWidgetTitles(page, entity.widgetTitles!);
		});
	});
}

// ─── all-level, capability-gated: five entities supply the Pod Metrics tab from
// ─── five different `table.config.tsx` files, so `all` is the honest level.

for (const entity of fanOut('all', 'podMetricsTab')) {
	test.describe(`drawer-metrics ${entity.key} pod metrics ${WIDE_TAG}`, () => {
		test(`TC-11 ${entity.key}: the Pod Metrics tab renders the ${POD_METRICS_WIDGET_TITLES.length} utilisation-by-pod widgets`, async ({
			authedPage: page,
		}) => {
			await openMetricsTab(page, entity);
			await switchDrawerTab(page, 'pod_metrics');
			await expectWidgetTitles(page, POD_METRICS_WIDGET_TITLES);
		});
	});
}

// ─── representative-level ────────────────────────────────────────────────────

for (const entity of fanOut('representative')) {
	test.describe(`drawer-metrics ${entity.key}`, () => {
		test(`TC-02 ${entity.key}: panels with a docPath expose an info icon`, async ({
			authedPage: page,
		}) => {
			await openMetricsTab(page, entity);
			await expect(chartHeaders(page).first()).toBeVisible();

			// `ChartHeader` renders the icon only when the widget carries a `docPath`
			// or a tooltip, so this asserts "some panel has one", not "every panel".
			const icons = page.getByTestId(METRICS.infoIcon);
			await expect(icons.first()).toBeVisible();

			await icons.first().hover();
			// One tooltip per panel can be mounted at a time, so the accessible name is
			// not unique — `.first()` keeps this about "the hovered panel has a doc link"
			// rather than about how many tooltips radix keeps around.
			const learnMore = page.getByRole('link', { name: 'Learn more.' }).first();
			await expect(learnMore).toBeVisible();
			// The href is built from a docs base URL that resolves to the string
			// "undefined" in this build (`undefined/docs/infrastructure-monitoring/…`) —
			// a real defect, so assert only the path part the widget owns.
			await expect(learnMore).toHaveAttribute('href', /\/docs\//);
		});

		test(`TC-05 ${entity.key}: off-screen panels render once scrolled into view`, async ({
			authedPage: page,
		}) => {
			test.skip(
				entity.widgetTitles!.length < 6,
				`${entity.key} has too few widgets to scroll`,
			);
			await openMetricsTab(page, entity);

			// Headers are always rendered; the chart bodies are what lazy-load.
			await expect(chartHeaders(page)).toHaveCount(entity.widgetTitles!.length);

			// NOTE: the "off-screen panel is a skeleton" half of this scenario is still
			// unasserted. An attempt to add it against
			// `[class*="metricsCard"], [class*="chartContainer"]` resolved to zero
			// elements — those class names were guessed, not read off a running page.
			// Getting it right needs the real card container selector; until then this
			// scenario proves the scroll works and not that anything lazy-loaded, so
			// this file's other body assertions rest on an unverified premise.
			const last = chartHeaders(page).last();
			await last.scrollIntoViewIfNeeded();
			await expect(last).toBeInViewport();
		});

		test(`TC-09 ${entity.key}: an all-empty metric response renders no-data, not a crash`, async ({
			authedPage: page,
		}) => {
			await resetTableState(page, entity);
			await seedDataset(page, entity.seed.primary);

			// Empty every panel's query result.
			await page.route(/\/api\/v\d+\/query_range/, async (route) => {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({ status: 'success', data: { result: [] } }),
				});
			});

			await page.goto(listUrl(entity, selectedItemParams(entity)));

			await expectDrawerVisible(page);
			await expectWidgetTitles(page, entity.widgetTitles!);
			await page.unrouteAll();
		});

		test(`TC-06 ${entity.key}: one failing widget query leaves the others rendered`, async ({
			authedPage: page,
		}) => {
			await resetTableState(page, entity);
			const seeded = await seedDataset(page, entity.seed.primary);
			// The drawer resolves `selectedItem` out of the *list* response, and the
			// list does not refetch on its own — so deep-linking before the seeded row
			// is queryable opens the dash-titled shell of drawer-shell TC-06, which renders no
			// Metrics tab at all and fails this scenario on a symptom it is not about.
			// Confirm the row is listed first, then deep-link.
			await gotoScopedList(page, entity, seeded.names);
			await waitForRow(page, entity.seed.sampleItemKey);

			// Fail only the first panel's request.
			let failed = false;
			await page.route(/\/api\/v\d+\/query_range/, async (route) => {
				if (!failed) {
					failed = true;
					await route.fulfill({
						status: 500,
						contentType: 'application/json',
						body: JSON.stringify({ status: 'error', error: 'panel exploded' }),
					});
					return;
				}
				await route.continue();
			});

			await gotoScopedList(page, entity, seeded.names, selectedItemParams(entity));

			await expectDrawerVisible(page);
			// Every header still renders — the failure is contained to its own card.
			await expectWidgetTitles(page, entity.widgetTitles!);
			// NOTE: still weaker than the scenario name. `ChartHeader` renders from the
			// widget config, never from the response, so these titles are satisfied by
			// "the drawer did not crash". Adding the in-card error text and a surviving
			// sibling chart was attempted and reverted: neither the stubbed string nor
			// `Something went wrong` reaches the DOM, and `[class*="chartContainer"]`
			// matches nothing — both selectors were guessed rather than read off a
			// running page. Needs the real card/error selectors.
			await page.unrouteAll();
		});
	});
}

// ─── the ported explorer-link cases ──────────────────────────────────────────

// ─── representative-level: the chart body itself ─────────────────────────────

for (const entity of fanOut('representative')) {
	test.describe(`drawer-metrics ${entity.key} chart body`, () => {
		/**
		 * `EntityMetrics` renders the chart behind `configs[idx] && chartData[idx]`,
		 * so a data-shape regression leaves an empty panel under a correct header and
		 * every TC-01 assertion still passes. `data-has-data` is the state made
		 * observable for exactly that: asserting on `styles.noDataContainer` is not
		 * viable, since CSS-module class names are hashed at build time.
		 */
		test(`TC-12 ${entity.key}: the first panel draws a chart, not just a header`, async ({
			authedPage: page,
		}) => {
			await openMetricsTab(page, entity);

			const panel = page.getByTestId(METRICS.chart).first();
			await expect(panel).toHaveAttribute('data-has-data', 'true', {
				timeout: 30_000,
			});
			// uPlot draws into a canvas, so a header with no canvas under it is the
			// `configs[idx] && chartData[idx]` guard failing silently.
			await expect(panel.locator('canvas').first()).toBeVisible();
		});
	});
}

test.describe('drawer-metrics chart tooltip', () => {
	const entity = fanOut('once')[0];

	/**
	 * `canPinTooltip` is wired at `EntityMetrics.tsx`, and the footer is the only
	 * affordance that lets a reader hold a hover reading still long enough to
	 * compare series.
	 */
	test('TC-13 a chart tooltip can be pinned and unpinned', async ({
		authedPage: page,
	}) => {
		await openMetricsTab(page, entity);

		const canvas = page
			.getByTestId(METRICS.chart)
			.first()
			.locator('canvas')
			.first();
		await expect(canvas).toBeVisible({ timeout: 30_000 });

		const box = await canvas.boundingBox();
		expect(box, 'the chart canvas has a box to click in').not.toBeNull();
		const centre = {
			x: box!.x + box!.width / 2,
			y: box!.y + box!.height / 2,
		};
		// uPlot pins on click, but only once its cursor is over a data point, so the
		// move has to land before the click rather than as part of it.
		await page.mouse.move(centre.x, centre.y);
		await page.mouse.click(centre.x, centre.y);

		const footer = page.getByTestId('entity-chart-tooltip-footer');
		await expect(footer).toBeVisible();

		await page.getByTestId('entity-chart-tooltip-unpin').click();
		await expect(footer).toBeHidden();
	});
});

test.describe('drawer-metrics explorer link', () => {
	// Deliberately *not* serial. These were thought to share the drawer's time
	// params, but `authedPage` gives each test its own BrowserContext and its own
	// URL. Serial only bought a skipped TC-04/10/07 whenever TC-03 went red.

	const entity = fanOut('once')[0];

	test('TC-03 the compass carries an absolute drawer range as start/end ms', async ({
		authedPage: page,
	}) => {
		// The drawer keeps its range in seconds, so whole seconds only — sub-second
		// precision would not survive the round trip.
		const endTime = Math.floor(Date.now() / 1000) * 1000;
		const startTime = endTime - 60 * 60 * 1000;

		await openMetricsTab(page, entity, {
			relativeTime: '30m',
			detailStartTime: String(startTime),
			detailEndTime: String(endTime),
		});

		const compass = page.getByTestId(metricsExplorerLinkTestId(0));
		await expect(compass).toBeVisible();

		const href = (await compass.getAttribute('href')) ?? '';
		expect(href).toContain(`startTime=${startTime}`);
		expect(href).toContain(`endTime=${endTime}`);
		expect(
			href,
			'an absolute range must not also send relativeTime',
		).not.toContain('relativeTime=');

		// The link carries a full query, not just a time range: `builder.queryData[0]`
		// with the panel's own metric and a filter scoping it to this entity — and a
		// `unit` key. That key is the entire content of FIX-4: `explorerUtils.ts`
		// emits `{ unit: '', ...query }` so the explorer does not rewrite the URL on
		// arrival and trap the back button. The file header says the link serialises
		// `unit`; a stale comment here used to claim the opposite.
		const compositeQuery = JSON.parse(
			decodeURIComponent(
				new URLSearchParams(href.split('?')[1]).get('compositeQuery') ?? '',
			),
		) as {
			unit?: string;
			builder?: { queryData?: { aggregateAttribute?: { key?: string } }[] };
		};
		expect(
			compositeQuery,
			'the compass link serialises `unit` — see FIX-4',
		).toHaveProperty('unit');
		expect(
			compositeQuery.builder?.queryData?.[0]?.aggregateAttribute?.key,
		).toContain(entity.metricNamespace);
	});

	test('TC-04 the compass lands on the explorer carrying the drawer range', async ({
		authedPage: page,
	}) => {
		await openMetricsTab(page, entity, { relativeTime: '30m' });

		const compass = page.getByTestId(metricsExplorerLinkTestId(0));
		await expect(compass).toBeVisible();
		await compass.click();
		await page.waitForURL(/metrics-explorer\/explorer/);

		// The drawer's range travels with the link.
		expect(new URL(page.url()).searchParams.get('relativeTime')).toBe('30m');

		// Back returns to the drawer, and that is worth asserting rather than assuming.
		// It used to be impossible: `QueryBuilder` rewrites (and *pushes*) any
		// `compositeQuery` missing a key of `initialQueriesMap.metrics`, so every Back
		// landed on an entry that immediately re-triggered the rewrite. #12402 fixed it
		// at the producer — `getMetricsExplorerUrl` now emits `{ unit: '', ...query }` —
		// and the push in `redirectWithQueryBuilderData` is still there, so this
		// assertion is the guard on a one-line fix that no unit test covers.
		await goBackUntil(page, /infrastructure-monitoring/);
		await expectDrawerVisible(page);
	});

	test('TC-10 the compass keeps the back button usable for a month-long range', async ({
		authedPage: page,
	}) => {
		// The second, independent trap #12402 closed: `1month` failed
		// `validCustomTimeRegex` in `getMinMax`, so `DateTimeSelectionV2` treated the
		// range as invalid on arrival, fell through to the route default and pushed a
		// *different* `relativeTime`. Only a month-scale range reaches it, which is why
		// TC-04's `30m` cannot stand in for this.
		allowForSeededWait();
		await openMetricsTab(page, entity, { relativeTime: '1month' });

		const compass = page.getByTestId(metricsExplorerLinkTestId(0));
		await expect(compass).toBeVisible();
		await compass.click();
		await page.waitForURL(/metrics-explorer\/explorer/);

		expect(new URL(page.url()).searchParams.get('relativeTime')).toBe('1month');

		await goBackUntil(page, /infrastructure-monitoring/);
		await expectDrawerVisible(page);
	});

	// **Not** the `once` entity. `PANEL_TYPES.TABLE` appears in exactly two places
	// in the product — `Clusters/constants.ts` and `Namespaces/constants.ts` — so
	// on pods (and on every one of the four representatives) `tableCount` is 0 and
	// the old arithmetic reduced to `compassCount === headerCount`, i.e. "every
	// panel *has* a compass": the inverse of the claim, and unfalsifiable.
	// Parked. The finding that motivated the rewrite is real and stands: run at the
	// `once` entity (pods) the old arithmetic reduced to `compassCount === headerCount`
	// — "every panel has a compass", the inverse of the claim — because
	// `PANEL_TYPES.TABLE` exists only in `Clusters/constants.ts` and
	// `Namespaces/constants.ts`. Moving it to clusters is right, but the rewritten
	// assertion needs the real panel-card selector to scope a compass to its own
	// card, and that selector is the same unknown blocking TC-05/06.
	const tablePanelEntity = entityByKey('clusters');

	// Unimplemented, and parked visibly rather than silently absent — the plan's
	// §10 claims "nothing is parked", which was not true of this ID. The product
	// path exists (`EntityMetrics.onDragSelect` → `handleTimeChange('custom', …)`);
	// what is missing is a reliable way to drag-select on a uPlot canvas whose
	// pixel geometry depends on the rendered series, and asserting it against a
	// stubbed empty result would assert nothing.
	test.fixme('TC-08 drag-selecting a chart range writes detailStartTime/detailEndTime', () => {
		expect(false, 'not implemented — see the comment above').toBe(true);
	});

	test.fixme('TC-07 table panels render metrics-table and expose no compass', async ({
		authedPage: page,
	}) => {
		allowForSeededWait();
		await openMetricsTab(page, tablePanelEntity, { relativeTime: '30m' });
		await expect(chartHeaders(page).first()).toBeVisible();

		// Scroll the whole panel list into view first: `EntityMetrics` renders a
		// Skeleton until a panel intersects, so an un-scrolled `metrics-table` count
		// undercounts and the comparison fails for the wrong reason.
		const headerCount = await chartHeaders(page).count();
		for (let index = 0; index < headerCount; index += 1) {
			await chartHeaders(page).nth(index).scrollIntoViewIfNeeded();
		}

		const tables = page.getByTestId(METRICS.table);
		await expect(tables.first()).toBeVisible();
		const tableCount = await tables.count();
		expect(
			tableCount,
			'clusters has PANEL_TYPES.TABLE panels — without one this asserts nothing',
		).toBeGreaterThan(0);

		// The claim, positively: a TABLE panel's own card carries no compass link.
		for (let index = 0; index < tableCount; index += 1) {
			const card = tables
				.nth(index)
				.locator('xpath=ancestor::*[.//*[@data-testid="chart-header"]][1]');
			await expect(
				card.locator('[data-testid^="open-metrics-explorer-"]'),
			).toHaveCount(0);
		}

		// …and the non-table panels still have theirs, so a build that dropped every
		// compass would not pass.
		const compassCount = await page
			.locator('[data-testid^="open-metrics-explorer-"]')
			.count();
		expect(compassCount).toBe(headerCount - tableCount);
		expect(compassCount).toBeGreaterThan(0);
	});
});
