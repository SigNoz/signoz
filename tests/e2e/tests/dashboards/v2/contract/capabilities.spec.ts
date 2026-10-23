import {
	clickhouseQuery,
	disabledReason,
	expect,
	GOLDEN,
	logsCountQuery,
	metricsQuery,
	PANEL_KINDS,
	PanelKind,
	type PostableDashboardV2,
	promqlQuery,
	type QueryType,
	type SelectOption,
	type Signal,
	SINGLE_PANEL_ID,
	singlePanelDashboard,
	test,
} from '../../../../drivers/panel-kinds';

// Scope: the panelKind × queryType × signal matrix as the type switcher shows
// it. Each kind is checked against each source query: selectable, or disabled
// with the reason getPanelTypeDisabledReason gives.

interface SourceQuery {
	name: string;
	queryType: QueryType;
	signal?: Signal;
	seed(): PostableDashboardV2;
}

const SOURCES: SourceQuery[] = [
	{
		name: 'a metrics builder query',
		queryType: 'builder',
		signal: 'metrics',
		seed: () => singlePanelDashboard({ query: metricsQuery() }),
	},
	{
		name: 'a logs builder query',
		queryType: 'builder',
		signal: 'logs',
		seed: () => singlePanelDashboard({ query: logsCountQuery() }),
	},
	{
		name: 'a PromQL query',
		queryType: 'promql',
		seed: () =>
			singlePanelDashboard({
				query: promqlQuery(`sum(rate(${GOLDEN.metrics.calls}[5m]))`),
			}),
	},
	{
		name: 'a ClickHouse query',
		queryType: 'clickhouse',
		seed: () =>
			singlePanelDashboard({
				kind: PanelKind.Table,
				query: clickhouseQuery(
					"SELECT now() AS ts, 'adservice' AS service, 1 AS A",
				),
			}),
	},
];

function optionFor(options: SelectOption[], label: string): SelectOption {
	const match = options.find((option) => option.label.startsWith(label));
	expect(
		match,
		`expected a "${label}" option in the type switcher`,
	).toBeDefined();
	return match as SelectOption;
}

test.describe('Dashboards V2 contract — editor capabilities matrix', () => {
	SOURCES.forEach((source, index) => {
		const number = String(index + 1).padStart(2, '0');

		for (const c of PANEL_KINDS) {
			const reason = disabledReason(c, source);
			if (reason === null) {
				test(`TC-${number} ${c.label}: ${source.name} keeps it selectable`, async ({
					dashboards,
					editor,
				}) => {
					await dashboards.seedAndEdit(source.seed(), SINGLE_PANEL_ID);

					const options = await editor.typeOptions();
					expect(optionFor(options, c.label).disabled).toBe(false);
				});
				continue;
			}

			test(`TC-${number} ${c.label}: ${source.name} disables it with a reason`, async ({
				dashboards,
				editor,
				panels,
			}) => {
				await dashboards.seedAndEdit(source.seed(), SINGLE_PANEL_ID);

				const options = await editor.typeOptions();
				expect(optionFor(options, c.label).disabled).toBe(true);

				await editor.typeOption(c.kind).hover();
				await expect(panels.tooltip.text(reason)).toBeVisible();
			});
		}
	});
});
