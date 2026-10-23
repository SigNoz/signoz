import {
	AXIS_CONTROLS,
	emptyDashboard,
	type EditorControl,
	expect,
	kindCase,
	logsCountQuery,
	metricsQuery,
	PANEL_KINDS,
	PanelKind,
	type PanelKindCase,
	type PostableDashboardV2,
	QUERYABLE_KINDS,
	QueryTab,
	Section,
	SINGLE_PANEL_ID,
	singlePanelDashboard,
	test,
	type ThresholdVariant,
} from '../../../../drivers/panel-kinds';

// Scope: what each kind declares in the editor — the picker tile, its config
// sections, query tabs, threshold variant and the List columns editor. Tabs a
// kind cannot use are hidden; the type switcher is the one that disables.

const THRESHOLD_VARIANTS: ThresholdVariant[] = ['label', 'comparison', 'table'];
const QUERY_TABS: string[] = Object.values(QueryTab);

/** A kind other than `c`, so switching to `c` is a real switch. */
function switchSourceKind(c: PanelKindCase): PanelKindCase {
	return kindCase(
		c.kind === PanelKind.TimeSeries ? PanelKind.BarChart : PanelKind.TimeSeries,
	);
}

/** The source kind over a query `c` accepts: List takes no metrics. */
function switchSource(
	c: PanelKindCase,
	source: PanelKindCase,
): PostableDashboardV2 {
	return singlePanelDashboard({
		kind: source.kind,
		query:
			c.signals.length === 0 || c.signals.includes('metrics')
				? metricsQuery()
				: logsCountQuery(),
	});
}

function partition<T>(all: T[], shown: T[]): [T[], T[]] {
	return [shown, all.filter((item) => !shown.includes(item))];
}

test.describe('Dashboards V2 contract — panel editor', () => {
	for (const c of PANEL_KINDS) {
		test(`TC-01 ${c.label}: the New panel drawer offers it and opens its editor`, async ({
			dashboards,
			editor,
			newPanel,
		}) => {
			const id = await dashboards.seed(emptyDashboard());
			await dashboards.openEmpty(id);

			await dashboards.emptyAddPanel().click();
			await expect(newPanel.root()).toBeVisible();
			await expect(newPanel.tiles()).toHaveCount(PANEL_KINDS.length);
			await expect(newPanel.tile(c.kind)).toBeVisible();
			await expect(newPanel.tile(c.kind)).toContainText(c.label);

			await newPanel.choose(c.kind);
			expect(dashboards.param('panelKind')).toBe(c.kind);
			await expect(editor.root()).toBeVisible();
		});
	}

	for (const c of PANEL_KINDS) {
		const [shownControls, hiddenControls] = partition<EditorControl>(
			['time-preference'],
			c.timePreference ? ['time-preference'] : [],
		);

		test(`TC-02 ${c.label}: declares its sections and no others`, async ({
			dashboards,
			editor,
		}) => {
			await dashboards.seedAndEdit(c.seed(), SINGLE_PANEL_ID);

			for (const title of c.sections) {
				await expect(editor.section.toggle(title)).toBeVisible();
			}
			for (const title of c.forbiddenSections) {
				await expect(editor.section.toggle(title)).toHaveCount(0);
			}

			await editor.section.expand(Section.visualization);
			for (const control of shownControls) {
				await expect(editor.control(control)).toBeVisible();
			}
			for (const control of hiddenControls) {
				await expect(editor.control(control)).toHaveCount(0);
			}
		});
	}

	for (const c of PANEL_KINDS.filter((k) => k.sections.includes(Section.axes))) {
		const [shown, hidden] = partition(AXIS_CONTROLS, c.axisControls);

		test(`TC-03 ${c.label}: Axes offers ${shown.join(', ')} only`, async ({
			dashboards,
			editor,
		}) => {
			await dashboards.seedAndEdit(c.seed(), SINGLE_PANEL_ID);

			await editor.section.expand(Section.axes);
			for (const control of shown) {
				await expect(editor.control(control)).toBeVisible();
			}
			for (const control of hidden) {
				await expect(editor.control(control)).toHaveCount(0);
			}
		});
	}

	for (const c of PANEL_KINDS) {
		const from = switchSourceKind(c);

		test(`TC-04 ${c.label}: switching to it from ${from.label} brings its sections`, async ({
			dashboards,
			editor,
		}) => {
			await dashboards.seedAndEdit(switchSource(c, from), SINGLE_PANEL_ID);
			for (const title of from.sections) {
				await expect(editor.section.toggle(title)).toBeVisible();
			}

			await editor.switchType(c.kind);
			for (const title of c.sections) {
				await expect(editor.section.toggle(title)).toBeVisible();
			}
			for (const title of c.forbiddenSections) {
				await expect(editor.section.toggle(title)).toHaveCount(0);
			}
		});
	}

	for (const c of QUERYABLE_KINDS) {
		const [shown, hidden] = partition(QUERY_TABS, c.queryTabs);

		test(`TC-05 ${c.label}: offers only the query tabs it supports`, async ({
			dashboards,
			editor,
		}) => {
			await dashboards.seedAndEdit(c.seed(), SINGLE_PANEL_ID);

			for (const tab of shown) {
				await expect(editor.query.tab(tab)).toBeVisible();
			}
			for (const tab of hidden) {
				await expect(editor.query.tab(tab)).toHaveCount(0);
			}
		});
	}

	for (const c of PANEL_KINDS.filter((k) => k.queryless)) {
		test(`TC-06 ${c.label}: has no query builder, tabs or columns editor`, async ({
			dashboards,
			editor,
			config,
		}) => {
			await dashboards.seedAndEdit(c.seed(), SINGLE_PANEL_ID);

			await expect(editor.text.pane()).toBeVisible();
			await expect(editor.query.builder()).toHaveCount(0);
			for (const tab of QUERY_TABS) {
				await expect(editor.query.tab(tab)).toHaveCount(0);
			}
			await expect(config.listColumns.editor()).toHaveCount(0);
		});
	}

	for (const c of PANEL_KINDS.filter((k) => k.thresholdVariant !== null)) {
		const variant = c.thresholdVariant as ThresholdVariant;
		const others = THRESHOLD_VARIANTS.filter((other) => other !== variant);

		test(`TC-07 ${c.label}: Thresholds uses the ${variant} variant`, async ({
			dashboards,
			editor,
			config,
		}) => {
			await dashboards.seedAndEdit(c.seed(), SINGLE_PANEL_ID);

			await editor.section.expand(Section.thresholds);
			await expect(config.thresholds.addButton(variant)).toBeVisible();
			for (const other of others) {
				await expect(config.thresholds.addButton(other)).toHaveCount(0);
			}
		});
	}

	for (const c of PANEL_KINDS.filter((k) => k.columnsEditor)) {
		test(`TC-08 ${c.label}: has the columns editor`, async ({
			dashboards,
			config,
		}) => {
			await dashboards.seedAndEdit(c.seed(), SINGLE_PANEL_ID);
			await expect(config.listColumns.editor()).toBeVisible();
		});
	}

	for (const c of QUERYABLE_KINDS.filter((k) => !k.columnsEditor)) {
		test(`TC-09 ${c.label}: has no columns editor`, async ({
			dashboards,
			editor,
			config,
		}) => {
			await dashboards.seedAndEdit(c.seed(), SINGLE_PANEL_ID);
			await expect(editor.query.builder()).toBeVisible();
			await expect(config.listColumns.editor()).toHaveCount(0);
		});
	}
});
