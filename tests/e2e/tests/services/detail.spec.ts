import {
	DB_PANELS,
	expect,
	EXTERNAL_PANELS,
	OVERVIEW_PANELS,
	SEEDED_DATA_TIMEOUT,
	test,
} from '../../drivers/apm';

test.describe('Services, detail', () => {
	test('TC-01 key operations lists seeded operations with real call counts', async ({
		apm,
		apmSeed,
	}) => {
		const { checkout, cart } = apmSeed.ops;
		await apm.gotoService(apmSeed.service);
		await apm.keyOps.reveal();

		await expect(apm.keyOps.row(checkout.name)).toBeVisible({
			timeout: SEEDED_DATA_TIMEOUT,
		});
		expect(await apm.keyOps.cell(checkout.name, 'Calls')).toBe(
			String(checkout.calls),
		);
		expect(await apm.keyOps.cell(checkout.name, 'Errors')).toBe(
			String(checkout.errors),
		);
		expect(await apm.keyOps.cell(cart.name, 'Calls')).toBe(String(cart.calls));
		await expect(apm.keyOps.rows()).toHaveCount(2);
	});

	test('TC-02 the overview panels render', async ({ apm, apmSeed, noise }) => {
		await apm.gotoService(apmSeed.service);

		for (const panel of OVERVIEW_PANELS) {
			// eslint-disable-next-line no-await-in-loop
			await apm.expectPanelRendered(panel);
		}
		expect(noise.failedResponses).toEqual([]);
		expect(noise.errors).toEqual([]);
	});

	test('TC-03 a key operation drills into the traces explorer filtered to it', async ({
		apm,
		apmSeed,
	}) => {
		const { checkout } = apmSeed.ops;
		await apm.gotoService(apmSeed.service);
		await apm.keyOps.reveal();
		await expect(apm.keyOps.row(checkout.name)).toBeVisible({
			timeout: SEEDED_DATA_TIMEOUT,
		});

		await apm.openKeyOp(checkout.name);

		const rows = apm.explorerRows();
		await expect(rows.first()).toBeVisible({ timeout: SEEDED_DATA_TIMEOUT });
		await expect(rows).toHaveCount(checkout.calls);
		await expect(apm.explorerRowNames()).toHaveText(
			Array.from({ length: checkout.calls }, () => checkout.name),
		);
	});

	test('TC-04 DB Call and External tabs render their panels', async ({
		apm,
		apmSeed,
		noise,
	}) => {
		await apm.gotoService(apmSeed.service);

		await apm.openTab('DB Call Metrics');
		for (const panel of DB_PANELS) {
			// eslint-disable-next-line no-await-in-loop
			await apm.expectPanelRendered(panel);
		}

		await apm.openTab('External Metrics');
		for (const panel of EXTERNAL_PANELS) {
			// eslint-disable-next-line no-await-in-loop
			await apm.expectPanelRendered(panel);
		}

		expect(noise.failedResponses).toEqual([]);
		expect(noise.errors).toEqual([]);
	});

	// Needs the migrator's `top_level_operations` materialized view to fill from
	// `signoz_index_v3`; the seeder has no route for it.
	test('TC-05 top-level operations page lists the seeded root operation', async ({
		apm,
		apmSeed,
	}) => {
		await apm.gotoTopLevelOps(apmSeed.service);

		await expect(apm.servicesBreadcrumb()).toHaveAttribute('href', '/services');
		await expect(apm.topLevelOpsTable()).toContainText(apmSeed.entryOp, {
			timeout: SEEDED_DATA_TIMEOUT,
		});
	});
});
