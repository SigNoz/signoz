import { expect, test } from '../../drivers/apm';

test.describe('Service map', () => {
	// Needs the migrator's `dependency_graph_minutes_v2` materialized view to
	// join the seeded parent and child spans; the seeder has no route for it.
	test('TC-01 service map draws the seeded caller to callee edge', async ({
		apm,
		apmSeed,
		noise,
	}) => {
		await apm.waitForServiceMapEdge(apmSeed.service, apmSeed.downstream);

		await expect(apm.serviceMap.root()).toBeVisible();
		await expect(apm.serviceMap.canvas()).toBeVisible();
		await expect(apm.serviceMap.empty()).toHaveCount(0);
		expect(noise.errors).toEqual([]);
		expect(noise.failedResponses).toEqual([]);
	});
});
