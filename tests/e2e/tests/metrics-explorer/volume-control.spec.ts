import { expect, SEEDED_DATA_TIMEOUT, test } from '../../drivers/metrics';

// Volume control needs `enable_metrics_reduction`, which `e2e_env` in
// bootstrap/conftest.py turns on. A stack started without it skips rather than fails. Reduction
// semantics are tests/integration/tests/metricreduction; this spec keeps what
// the tab and the details drawer write and read back.

test.describe('Metrics explorer volume control', () => {
	test.beforeEach(async ({ volumeControl }) => {
		test.skip(
			!(await volumeControl.available()),
			'enable_metrics_reduction is off on this stack',
		);
	});

	test.afterEach(async ({ volumeControl, metricsCatalog: seed }) => {
		await volumeControl.removeRulesFor(seed.gauge);
	});

	test('TC-01 the tab lists a seeded rule as pending (smoke)', async ({
		volumeControl: vc,
		metricsCatalog: seed,
		noise,
	}) => {
		await vc.seedRule(seed.gauge, 'keep', ['service.name']);

		await vc.gotoTab();
		await vc.search(seed.gauge);

		await expect(vc.stats()).toBeVisible();
		await expect(vc.mode(seed.gauge)).toHaveText('Include');
		await expect(vc.badge(seed.gauge, 'pending')).toBeVisible();
		await expect(vc.chart()).toBeVisible();

		expect(noise.errors).toEqual([]);
		expect(noise.failedResponses).toEqual([]);
	});

	test('TC-02 a rule created from the details drawer shows as pending in both places', async ({
		metrics,
		volumeControl: vc,
		metricsCatalog: seed,
	}) => {
		await metrics.gotoSummary();
		await metrics.scopeTo(seed.scope);
		await metrics.openDetails(seed.gauge);

		await vc.section.setup();
		await vc.drawer.mode('include');
		await vc.drawer.pickLabels(['service.name']);
		await expect(vc.drawer.impact()).toContainText('Potential retained', {
			timeout: SEEDED_DATA_TIMEOUT,
		});

		const saved = await vc.drawer.save();
		expect(saved.request().method()).toBe('POST');
		expect(saved.ok()).toBe(true);
		expect(saved.request().postDataJSON()).toEqual({
			metricName: seed.gauge,
			matchType: 'keep',
			labels: ['service.name'],
		});
		await expect(vc.toast('Volume control rule saved')).toBeVisible();
		await expect(vc.section.pendingBanner()).toBeVisible();

		await vc.gotoTab();
		await vc.search(seed.gauge);
		await expect(vc.badge(seed.gauge, 'pending')).toBeVisible();
	});

	test('TC-03 managing from the tab updates and removes the rule', async ({
		volumeControl: vc,
		metricsCatalog: seed,
	}) => {
		await vc.reseedGauge(seed);
		await vc.seedRule(seed.gauge, 'keep', ['service.name']);
		await vc.gotoTab();
		await vc.search(seed.gauge);

		await vc.manage(seed.gauge);
		await vc.drawer.mode('exclude');
		await vc.drawer.pickLabels(['host']);
		const updated = await vc.drawer.save();
		expect(updated.request().method()).toBe('PUT');
		expect(updated.ok()).toBe(true);
		await expect(vc.mode(seed.gauge)).toHaveText('Exclude');

		await vc.manage(seed.gauge);
		const removed = await vc.drawer.remove();
		expect(removed.ok()).toBe(true);
		await expect(vc.toast('Volume control rule removed')).toBeVisible();
		await expect(vc.empty()).toBeVisible();
	});
});
