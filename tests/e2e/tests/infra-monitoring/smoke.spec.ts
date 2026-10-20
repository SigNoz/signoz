import {
	assertDatasetFacts,
	BASE_ENTITY,
	entityByKey,
	expect,
	seedDataset,
	test,
} from '../../drivers/infra';

// The harness proving the data it claims. Every other spec in this directory
// scopes its list to names it seeded, so if the dataset facts are wrong those
// specs fail somewhere unrelated — this is where that failure belongs.

const ENTITIES_WITH_FIXTURES = [
	'hosts',
	'pods',
	'nodes',
	'namespaces',
	'clusters',
	'deployments',
	'statefulsets',
	'daemonsets',
	'jobs',
	'volumes',
];

test.describe('infra monitoring — harness', () => {
	test('TC-01 every dataset re-derives the facts the registry records', () => {
		for (const key of ENTITIES_WITH_FIXTURES) {
			const entity = entityByKey(key);
			for (const dataset of [
				entity.seed.primary,
				entity.seed.grouped,
				entity.seed.pagination,
				entity.seed.filter,
				entity.seed.orderBy,
			]) {
				// Throws, naming the dataset and the mismatch, if the fixture and the
				// transcribed facts have drifted.
				const facts = assertDatasetFacts(dataset);
				expect(facts.names.length, `${dataset} seeds names`).toBeGreaterThan(0);
			}
		}
	});

	test('TC-02 a seeded list renders its rows against the real backend', async ({
		authedPage: page,
		infra,
	}) => {
		const facts = await seedDataset(page, BASE_ENTITY.seed.primary);

		await infra.list.gotoScoped(BASE_ENTITY, facts.names);
		const table = infra.list.table(BASE_ENTITY);
		await table.waitForRows();

		// The one thing no cheaper layer sees: the real response reaching the real
		// table. Scoped by name, so a sibling worker's seed cannot change the count.
		expect(await table.rowKeys()).toEqual(
			expect.arrayContaining(
				facts.names.map((name) =>
					BASE_ENTITY.key === 'pods' ? `${name}-uid` : name,
				),
			),
		);
	});
});
