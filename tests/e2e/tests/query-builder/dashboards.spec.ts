import { emptyDashboard, test as editorTest } from '../../drivers/panel-editor';
import {
	expect,
	EXPLORER,
	withQueryBuilder,
} from '../../drivers/query-builder';

const test = withQueryBuilder(editorTest);

const FILTER = "severity_text = 'ERROR'";
const AGGREGATION = 'count_distinct(service.name)';

interface StoredQuery {
	spec: {
		filter?: { expression?: string };
		aggregations?: { expression?: string }[];
	};
}

/** Where a non-List panel keeps its builder queries in the v2 dashboard spec. */
interface StoredPanel {
	spec: {
		queries: {
			spec: { plugin: { kind: string; spec: { queries: StoredQuery[] } } };
		}[];
	};
}

test.describe('Query builder — explorer to dashboard', () => {
	test('TC-05 a logs explorer query survives add to dashboard, save and reopen', async ({
		dashboards,
		editor,
		qb,
	}) => {
		const dashboard = emptyDashboard();
		const title = dashboard.spec.display.name;
		const id = await dashboards.seed(dashboard);

		await qb.openExplorer(EXPLORER.logs, { view: 'graph' });
		await qb.query('A').filter.type(FILTER);
		await qb.query('A').filter.press('Escape');
		await qb.query('A').aggregation.type(AGGREGATION);
		await qb.query('A').aggregation.press('Escape');
		await qb.run();

		await qb.addToDashboard(title);
		await expect.poll(() => qb.query('A').filter.expression()).toBe(FILTER);
		await expect
			.poll(() => qb.query('A').aggregation.expression())
			.toBe(AGGREGATION);

		await editor.save();
		// The shared spec types model only bare BuilderQuery plugins.
		const panels = (await dashboards.get(id)).spec.panels as unknown as Record<
			string,
			StoredPanel
		>;
		const [panelId] = Object.keys(panels);
		const plugin = panels[panelId].spec.queries[0].spec.plugin;
		expect(plugin.kind).toBe('signoz/CompositeQuery');
		expect(plugin.spec.queries[0].spec).toMatchObject({
			filter: { expression: FILTER },
			aggregations: [{ expression: AGGREGATION }],
		});

		await dashboards.openEditor(id, panelId);
		await expect.poll(() => qb.query('A').filter.expression()).toBe(FILTER);
		await expect
			.poll(() => qb.query('A').aggregation.expression())
			.toBe(AGGREGATION);
	});
});
