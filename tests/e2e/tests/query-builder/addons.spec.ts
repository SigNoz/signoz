import {
	expect,
	EXPLORER,
	SUM_METRIC,
	test,
} from '../../drivers/query-builder';

const HAVING = ['count() > 10', 'count() IN [1, 2]', 'count() NOT IN [1, 2]'];

test.describe('Query builder — add-ons', () => {
	for (const explorer of ['logs', 'traces'] as const) {
		test(`TC-21 ${explorer} group by keeps order through removal and reload`, async ({
			qb,
		}) => {
			await qb.openExplorer(EXPLORER[explorer], { view: 'graph' });
			const addOns = qb.query('A').addOns;
			await addOns.open('group_by');

			await addOns.groupBy.add('service.name');
			await addOns.groupBy.add('deployment.environment');
			await addOns.groupBy.add('k8s.namespace.name');
			await addOns.groupBy.remove('service.name');
			const fired = await qb.run();

			const expected = ['deployment.environment', 'k8s.namespace.name'];
			expect(qb.spec(fired, 'A').groupBy?.map((key) => key.name)).toEqual(
				expected,
			);
			const reloaded = await qb.openExplorer(EXPLORER[explorer], {
				view: 'graph',
				query: qb.urlQuery(),
			});
			expect(qb.spec(reloaded, 'A').groupBy?.map((key) => key.name)).toEqual(
				expected,
			);
			expect(await qb.query('A').addOns.groupBy.values()).toEqual(expected);
		});
	}

	test('TC-21 metrics group by offers the metric’s own attributes', async ({
		qb,
	}) => {
		await qb.openExplorer(EXPLORER.metrics);
		const query = qb.query('A');
		await query.metric.select(SUM_METRIC);

		await query.addOns.groupBy.add('operation');
		const fired = await qb.run();

		expect(qb.spec(fired, 'A').groupBy?.map((key) => key.name)).toEqual([
			'operation',
		]);
	});

	for (const having of HAVING) {
		test(`TC-22 having "${having}" is sent verbatim and accepted`, async ({
			qb,
		}) => {
			await qb.openExplorer(EXPLORER.logs, { view: 'graph' });
			const addOns = qb.query('A').addOns;
			await addOns.open('group_by');
			await addOns.groupBy.add('service.name');
			await addOns.open('having');

			await addOns.having.type(having);
			await addOns.having.press('Escape');
			const fired = await qb.run();

			expect(qb.spec(fired, 'A').having?.expression).toBe(having);
			expect(qb.console.failedResponses).toEqual([]);
		});
	}

	test('TC-23 the logs list orders by timestamp then id, traces by timestamp only', async ({
		qb,
	}) => {
		const logs = await qb.openExplorer(EXPLORER.logs, { view: 'list' });
		expect(qb.spec(logs, 'A').order?.map((o) => o.key.name)).toEqual([
			'timestamp',
			'id',
		]);

		const traces = await qb.openExplorer(EXPLORER.traces, { view: 'list' });
		expect(qb.spec(traces, 'A').order?.map((o) => o.key.name)).toEqual([
			'timestamp',
		]);
	});

	test('TC-24 a positive limit is sent; empty and zero send none', async ({
		qb,
	}) => {
		await qb.openExplorer(EXPLORER.logs, { view: 'graph' });
		const addOns = qb.query('A').addOns;
		await addOns.open('group_by');
		await addOns.groupBy.add('service.name');
		await addOns.open('limit');

		await addOns.limit().fill('10');
		expect(qb.spec(await qb.run(), 'A').limit).toBe(10);

		await addOns.limit().fill('');
		expect(qb.spec(await qb.run(), 'A')).not.toHaveProperty('limit');

		await addOns.limit().fill('3');
		await qb.run();
		await addOns.limit().fill('0');
		expect(qb.spec(await qb.run(), 'A')).not.toHaveProperty('limit');
	});

	test('TC-24 a negative limit means no limit', async ({ qb }) => {
		await qb.openExplorer(EXPLORER.logs, { view: 'graph' });
		const addOns = qb.query('A').addOns;
		await addOns.open('group_by');
		await addOns.groupBy.add('service.name');
		await addOns.open('limit');
		await addOns.limit().fill('10');
		expect(qb.spec(await qb.run(), 'A').limit).toBe(10);

		await addOns.limit().fill('-5');
		const fired = await qb.run();

		expect(qb.spec(fired, 'A')).not.toHaveProperty('limit');
		expect(qb.console.failedResponses).toEqual([]);
	});

	test('TC-25 the legend prefills from group by and a custom one is kept', async ({
		qb,
	}) => {
		await qb.openExplorer(EXPLORER.logs, { view: 'graph' });
		const addOns = qb.query('A').addOns;
		await addOns.open('group_by');
		await addOns.groupBy.add('service.name');
		await addOns.groupBy.add('deployment.environment');

		await addOns.open('legend_format');
		await expect(addOns.legend()).toHaveValue(
			'service.name = {{service.name}}, deployment.environment = {{deployment.environment}}',
		);

		await addOns.legend().fill('{{service.name}} logs');
		await addOns.groupBy.add('k8s.namespace.name');
		await expect(addOns.legend()).toHaveValue('{{service.name}} logs');
		expect(qb.spec(await qb.run(), 'A').legend).toBe('{{service.name}} logs');
	});

	test('TC-25 the legend opens empty without a group by', async ({ qb }) => {
		await qb.openExplorer(EXPLORER.logs, { view: 'graph' });

		await qb.query('A').addOns.open('legend_format');

		await expect(qb.query('A').addOns.legend()).toHaveValue('');
	});
});
