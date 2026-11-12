import {
	expect,
	type Locator,
	type Page,
	type Response,
} from '@playwright/test';

import { driver, kit, SEEDED_DATA_TIMEOUT, type Layer } from './kit';
import {
	isQueryRange,
	metricsExplorerDriver,
	type MetricsExplorer,
} from './metrics/driver';
import { savedViewsDriver, type SavedViews } from './savedviews';

/**
 * The cost meter: the `/meter` breakdown, the meter explorer and its views.
 *
 * Nothing writes `signoz_meter.*` on the e2e stack (the seeder has no meter
 * endpoint), so the breakdown and explorer are exercised on their empty state.
 * Meter query semantics are tests/integration/tests/queriermetrics/09_cost_meter.py.
 */

export const METER_PATH = '/meter';
export const METER_EXPLORER_PATH = '/meter/explorer';

export type MeterSection = 'total' | 'logs' | 'traces' | 'metrics';

const SECTION_TITLES: Record<MeterSection, string> = {
	total: 'Total',
	logs: 'Logs',
	traces: 'Traces',
	metrics: 'Metrics',
};

export interface MeterBreakdown {
	/** Open `/meter` and return the `query_range` responses its widgets fire. */
	goto(): Promise<Response[]>;
	section(name: MeterSection): Locator;
}

export interface Meter {
	breakdown: MeterBreakdown;
	explorer: MetricsExplorer;
	/** Resolve the meter metric-name list the explorer's selector requests. */
	nextMetricList(): Promise<Response>;
	views: SavedViews;
}

export function meterDriver(page: Page): Meter {
	const breakdown: MeterBreakdown = {
		goto: async () => {
			const responses: Response[] = [];
			const collect = (res: Response): void => {
				if (isQueryRange(res.request())) {
					responses.push(res);
				}
			};
			page.on('response', collect);
			await page.goto(METER_PATH);
			await expect(breakdown.section('metrics')).toBeVisible();
			await expect
				.poll(() => responses.length, { timeout: SEEDED_DATA_TIMEOUT })
				.toBeGreaterThan(0);
			page.off('response', collect);
			return responses;
		},
		// The breakdown is a system dashboard: section ids derive from panel ids, so match the title.
		section: (name) =>
			page.locator('[data-testid^="dashboard-section-sec-"]').filter({
				has: page
					.locator('[data-testid^="dashboard-section-toggle-"]')
					.filter({ hasText: SECTION_TITLES[name] }),
			}),
	};

	return {
		breakdown,
		explorer: metricsExplorerDriver(page, { path: METER_EXPLORER_PATH }),
		nextMetricList: () =>
			page.waitForResponse((res) => {
				const url = new URL(res.url());
				return (
					url.pathname === '/api/v2/metrics' &&
					res.request().method() === 'GET' &&
					url.searchParams.get('source') === 'meter'
				);
			}),
		views: savedViewsDriver(page, 'meter'),
	};
}

export const withMeter: Layer<{ meter: Meter }> = driver('meter', ({ page }) =>
	meterDriver(page),
);

/** The meter `test`. */
export const test = withMeter(kit);
export { expect } from './kit';
