import { expect, EXPLORER, test } from '../../drivers/query-builder';

// A shared or hand-edited explorer link must never take the page down: the
// param is parsed, repaired and rewritten before the builder mounts.

const MALFORMED: Record<string, string> = {
	'not JSON': 'not-json',
	'truncated JSON': '%7B',
	'a JSON string': encodeURIComponent('"a string"'),
	'a JSON array': encodeURIComponent('[]'),
	'JSON null': 'null',
	'an empty JSON string': '%22%22',
	'double encoded': encodeURIComponent(
		encodeURIComponent(JSON.stringify({ queryType: 'builder' })),
	),
};

const PARTIAL: Record<string, unknown> = {
	'an empty object': {},
	'builder with no builder block': { queryType: 'builder' },
	'builder with no queryData': { queryType: 'builder', builder: {} },
	'empty queryData': {
		queryType: 'builder',
		builder: { queryData: [], queryFormulas: [] },
	},
	'a query with no dataSource': {
		queryType: 'builder',
		builder: { queryData: [{ queryName: 'A' }] },
	},
	'an unknown queryType': { queryType: 'zzz' },
	'non-array promql and clickhouse blocks': {
		queryType: 'builder',
		promql: {},
		clickhouse_sql: 'x',
		builder: { queryData: [{ queryName: 'A', dataSource: 'logs' }] },
	},
};

test.describe('Query builder — URL handling', () => {
	for (const [label, raw] of Object.entries(MALFORMED)) {
		test(`TC-01 logs explorer survives ${label} and still runs`, async ({
			qb,
		}) => {
			await qb.openExplorer(EXPLORER.logs, raw);

			await expect(qb.query('A').filter.content()).toBeVisible();
			await qb.query('A').filter.type("severity_text = 'ERROR'");
			const fired = await qb.run();

			expect(qb.spec(fired, 'A').filter?.expression).toBe(
				"severity_text = 'ERROR'",
			);
			expect(qb.urlQuery()).toMatchObject({ queryType: 'builder' });
			expect(qb.console.errors).toEqual([]);
		});
	}

	for (const [label, query] of Object.entries(PARTIAL)) {
		test(`TC-02 logs explorer repairs ${label}`, async ({ qb }) => {
			const loaded = await qb.openExplorerWith(EXPLORER.logs, query);

			expect(qb.spec(loaded, 'A').signal).toBe('logs');
			await expect
				.poll(() => qb.urlQuery())
				.toMatchObject({
					queryType: 'builder',
					builder: { queryData: [{ queryName: 'A', dataSource: 'logs' }] },
				});
			expect(qb.console.errors).toEqual([]);
		});
	}
});
