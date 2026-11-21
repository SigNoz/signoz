/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesDisplayDTO } from './dashboardtypesDisplayDTO';
import type { DashboardtypesLinkDTO } from './dashboardtypesLinkDTO';
import type { DashboardtypesPanelPluginDTO } from './dashboardtypesPanelPluginDTO';
import type { DashboardtypesQueryDTO } from './dashboardtypesQueryDTO';

export interface DashboardtypesPanelSpecDTO {
	/**
	 * @description The panel title and description.
	 */
	display: DashboardtypesDisplayDTO;
	/**
	 * @type array,null
	 * @description Context links offered in the data point drilldown menu of the panel, with dashboard variables resolved in the URL.
	 */
	links?: DashboardtypesLinkDTO[] | null;
	/**
	 * @description The visualization: kind is one of signoz/TimeSeriesPanel, signoz/BarChartPanel, signoz/AreaChartPanel, signoz/NumberPanel, signoz/PieChartPanel, signoz/TablePanel, signoz/HistogramPanel, signoz/ListPanel, signoz/TextPanel or signoz/HeatmapPanel, and spec holds that kind's options ({} accepts every default).
	 */
	plugin: DashboardtypesPanelPluginDTO;
	/**
	 * @type array
	 * @description The queries the panel runs. Use exactly one entry for a data panel and [] for signoz/TextPanel. To run several named queries or formulas, use one entry whose spec.plugin.kind is signoz/CompositeQuery and put the constituent queries in its plugin spec.
	 */
	queries: DashboardtypesQueryDTO[];
}
