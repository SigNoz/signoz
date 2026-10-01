import type {
	DashboardtypesScatterPlotAxesDTO,
	DashboardtypesScatterPlotDimensionsDTO,
} from 'api/generated/services/sigNoz.schemas';
import type { ScatterSeries } from 'lib/visualization/charts/Scatter/utils';
import type {
	ScatterChannels,
	ScatterPointLabel,
} from 'lib/uPlotV2/plugins/ScatterPlugin/types';
import type { PanelTable } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

export interface PrepareScatterPlotDataArgs {
	/** The joined scalar table (`formatTableResultForUI`). */
	table: PanelTable | undefined;
	dimensions: DashboardtypesScatterPlotDimensionsDTO | undefined;
	/** A `log` axis drops values ≤ 0, which it cannot place. */
	axes?: DashboardtypesScatterPlotAxesDTO;
	columnUnits: Record<string, string>;
}

export enum ScatterPlotDataStatus {
	Ready = 'ready',
	/** Fewer than two value columns: nothing to put on y. */
	NeedsSecondValue = 'needsSecondValue',
}

export type ScatterPlotData =
	| {
			status: ScatterPlotDataStatus.NeedsSecondValue;
			totalGroups: number;
	  }
	| {
			status: ScatterPlotDataStatus.Ready;
			/** One per colour group. */
			series: ScatterSeries[];
			/** `[seriesIndex][dataIndex]`: the point's group-by labels. */
			pointLabels: ScatterPointLabel[][][];
			channels: ScatterChannels;
			/** The query each axis's column comes from, for drilldown. */
			axisQueries: { x: string; y: string };
			/** Rows the query returned. */
			totalGroups: number;
			/** Rows plotted. */
			drawnGroups: number;
			/** Rows missing a finite x or y, e.g. a group absent from one query. */
			missingValueGroups: number;
			/** Rows with a value ≤ 0 on a `log` axis. */
			nonPositiveOnLogGroups: number;
	  };
