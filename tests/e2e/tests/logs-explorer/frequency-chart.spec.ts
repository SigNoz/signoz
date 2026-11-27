import { expect, serviceFilter, sideService, test } from '../../drivers/logs';

// The counts must differ: uPlot ranges equal counts from zero on its own, and
// the axis can then never start above zero.
const BURSTS = [2, 5];

test.describe('Logs Explorer — frequency chart', () => {
	test('TC-01 the Y axis starts at zero when every bucket has logs', async ({
		logs,
		logsSeed,
	}) => {
		const service = sideService(logsSeed, `freq-${Date.now()}`);
		const body = `${service} burst`;
		await logs.seedBursts(service, body, BURSTS);

		await logs.gotoUntil(body, { expression: serviceFilter(service) });
		await logs.showFrequencyChart();

		await expect.poll(() => logs.frequency.values()).toEqual([BURSTS]);
		const { y } = await logs.frequency.scales();
		expect(y.min).toBe(0);
		expect(y.max).toBeGreaterThanOrEqual(Math.max(...BURSTS));
	});
});
