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

/**
 * Saved before the v5 builder: structured filters, a having array and an
 * aggregate operator. The old having filter wrote `columnName` upper-cased
 * (`COUNT()`).
 */
const legacyLogsQuery = (having: unknown[]): unknown => ({
	queryType: 'builder',
	promql: [],
	clickhouse_sql: [],
	builder: {
		queryFormulas: [],
		queryData: [
			{
				queryName: 'A',
				dataSource: 'logs',
				expression: 'A',
				disabled: false,
				aggregateOperator: 'count',
				aggregateAttribute: { key: '', dataType: '', type: '', isColumn: false },
				filters: {
					op: 'AND',
					items: [
						{
							id: 'f1',
							key: {
								key: 'severity_text',
								dataType: 'string',
								type: '',
								isColumn: true,
							},
							op: '=',
							value: 'ERROR',
						},
					],
				},
				having,
				groupBy: [],
				orderBy: [],
				functions: [],
				legend: '',
				limit: null,
				stepInterval: 60,
				reduceTo: 'avg',
			},
		],
	},
});

const FIRST = "service.name = 'frontend'";
const SECOND = "service.name = 'cartservice'";

type UrlBuilder = { queryData?: { filter?: { expression?: string } }[] };

interface UrlQuery {
	queryType?: string;
	builder?: UrlBuilder;
	builder_ai_query?: UrlBuilder;
}

const LLM_FILTER = "gen_ai.request.model = 'gpt-4o'";

/** An AI explorer link from before AI queries had their own slot: tagged queries inside `builder`. */
const olderAIExplorerLink = {
	queryType: 'builder',
	promql: [],
	clickhouse_sql: [],
	builder: {
		queryFormulas: [],
		queryData: [
			{
				queryName: 'A',
				dataSource: 'traces',
				builderQueryType: 'builder_ai_query',
				expression: 'A',
				disabled: false,
				aggregations: [{ expression: 'count()' }],
				filter: { expression: LLM_FILTER },
				groupBy: [],
				orderBy: [],
				functions: [],
				legend: '',
				limit: null,
				stepInterval: null,
				having: { expression: '' },
			},
		],
	},
};

test.describe('Query builder — URL handling', () => {
	for (const [label, raw] of Object.entries(MALFORMED)) {
		test(`TC-01 logs explorer survives ${label} and still runs`, async ({
			qb,
		}) => {
			await qb.openExplorer(EXPLORER.logs, { raw });

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
			const loaded = await qb.openExplorer(EXPLORER.logs, { query });

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

	test('TC-03 legacy filters and aggregate operator convert to v5 expressions', async ({
		qb,
	}) => {
		const loaded = await qb.openExplorer(EXPLORER.logs, {
			view: 'graph',
			query: legacyLogsQuery([]),
		});

		const spec = qb.spec(loaded, 'A');
		expect(spec.filter?.expression).toMatch(/^severity_text\s*=\s*'ERROR'$/);
		expect(spec.aggregations?.[0]?.expression).toBe('count()');
		expect(spec).not.toHaveProperty('filters');
		await expect
			.poll(() => qb.query('A').filter.expression())
			.toMatch(/^severity_text\s*=\s*'ERROR'$/);
		expect(qb.console.errors).toEqual([]);
	});

	test('TC-03 a legacy having as the old builder stored it still runs', async ({
		qb,
	}) => {
		const loaded = await qb.openExplorer(EXPLORER.logs, {
			view: 'graph',
			query: legacyLogsQuery([{ columnName: 'COUNT()', op: '>', value: 5 }]),
		});

		expect(qb.spec(loaded, 'A').having?.expression).toBe('count() > 5');
		expect(qb.console.failedResponses).toEqual([]);
	});

	for (const explorer of ['logs', 'traces'] as const) {
		test(`TC-04 ${explorer} explorer query follows back, forward and reload`, async ({
			authedPage: page,
			qb,
		}) => {
			await qb.openExplorer(EXPLORER[explorer]);
			const filter = qb.query('A').filter;
			const urlFilter = (): unknown =>
				(qb.urlQuery() as UrlQuery | null)?.builder?.queryData?.[0]?.filter
					?.expression;

			await filter.type(FIRST);
			await qb.run();
			await filter.type(SECOND);
			await qb.run();

			await page.goBack();
			await expect.poll(urlFilter).toBe(FIRST);
			await expect.poll(() => filter.expression()).toBe(FIRST);

			await page.goForward();
			await expect.poll(urlFilter).toBe(SECOND);
			await expect.poll(() => filter.expression()).toBe(SECOND);

			await filter.type("service.name = 'unsaved'");
			const sentBefore = qb.sent().length;
			await page.reload();
			await expect.poll(() => filter.expression()).toBe(SECOND);
			await expect
				.poll(() => qb.sent().slice(sentBefore).length)
				.toBeGreaterThan(0);
			expect(qb.spec(qb.sent().slice(sentBefore), 'A').filter?.expression).toBe(
				SECOND,
			);
		});
	}

	test('TC-05 the AI explorer moves an older link into the AI slot', async ({
		qb,
	}) => {
		await qb.openExplorer(EXPLORER.ai, { query: olderAIExplorerLink });

		await expect
			.poll(() => (qb.urlQuery() as UrlQuery)?.queryType)
			.toBe('builder_ai_query');
		const url = qb.urlQuery() as UrlQuery;
		expect(url.builder_ai_query?.queryData?.[0]?.filter?.expression).toBe(
			LLM_FILTER,
		);
		await expect(qb.query('A').filter.content()).toBeVisible();
		await expect.poll(() => qb.query('A').filter.expression()).toBe(LLM_FILTER);

		const fired = await qb.run();
		const sentA = fired
			.flatMap((body) => body.compositeQuery.queries)
			.find((query) => query.spec.name === 'A');
		expect(sentA?.type).toBe('builder_ai_query');
		expect(sentA?.spec.filter?.expression).toBe(LLM_FILTER);
		expect(qb.console.failedResponses).toEqual([]);
	});

	test('TC-06 an AI explorer filter goes out as an AI query and stays in the AI slot', async ({
		qb,
	}) => {
		await qb.openExplorer(EXPLORER.ai);
		await expect(qb.query('A').filter.content()).toBeVisible();

		await qb.query('A').filter.type(LLM_FILTER);
		const fired = await qb.run();

		const sentA = fired
			.flatMap((body) => body.compositeQuery.queries)
			.find((query) => query.spec.name === 'A');
		expect(sentA?.type).toBe('builder_ai_query');
		expect(sentA?.spec.filter?.expression).toBe(LLM_FILTER);

		await expect
			.poll(
				() =>
					(qb.urlQuery() as UrlQuery)?.builder_ai_query?.queryData?.[0]?.filter
						?.expression,
			)
			.toBe(LLM_FILTER);
		const url = qb.urlQuery() as UrlQuery;
		expect(url.queryType).toBe('builder_ai_query');
		expect(url.builder?.queryData?.[0]?.filter?.expression ?? '').not.toBe(
			LLM_FILTER,
		);
	});
});
