import {
	type DashboardtypesLegendDTO,
	type DashboardtypesLegendDTOCustomOrder,
	DashboardtypesLegendOrderDTO,
} from 'api/generated/services/sigNoz.schemas';
import getLabelName from 'lib/getLabelName';
import type { PanelSeries } from 'pages/DashboardPage/DashboardContainer/queryV5/types';
import type { BuilderQuery } from 'types/api/v5/queryRange';

import { resolveSeriesLabelV5 } from './resolveSeriesLabel';
import { seriesKey, sortSeriesByMeanDesc } from './sortSeriesByMean';

// A fixed locale so every viewer of a dashboard sees the same order; numeric so
// `GPU-2` sorts before `GPU-10`.
const labelCollator = new Intl.Collator('en', { numeric: true });

/** Natural-order comparison of two legend labels. */
export function compareLegendLabels(a: string, b: string): number {
	return labelCollator.compare(a, b);
}

/** A label's index in `legend.customOrder`; a label without an entry has index 0. */
export function legendOrderIndex(
	customOrder: DashboardtypesLegendDTOCustomOrder | undefined,
	label: string,
): number {
	return customOrder?.[label] ?? 0;
}

/**
 * Orders flattened V5 series for a uPlot panel. With `legend.order` unset or `value`
 * this is `sortSeriesByMeanDesc`. With `custom`, series sort by ascending index in
 * `legend.customOrder`, then by label in natural order, so with no indexes set the
 * legend is alphabetical and an index only needs setting on a label that should move.
 *
 * Labels resolve the way the config builders resolve them, since `customOrder` is
 * keyed by the label the legend shows. Call this before building the uPlot config and
 * aligned data, which index the list positionally.
 */
export function sortSeriesForLegend(
	series: PanelSeries[],
	builderQueries: BuilderQuery[],
	legend: Pick<DashboardtypesLegendDTO, 'order' | 'customOrder'> | undefined,
): PanelSeries[] {
	if (legend?.order !== DashboardtypesLegendOrderDTO.custom) {
		return sortSeriesByMeanDesc(series);
	}

	return series
		.map((item) => {
			const label = resolveSeriesLabelV5(
				item,
				builderQueries,
				getLabelName(item.labels, item.queryName, item.legend),
			);
			return {
				item,
				label,
				index: legendOrderIndex(legend.customOrder, label),
			};
		})
		.sort(
			(a, b) =>
				a.index - b.index ||
				compareLegendLabels(a.label, b.label) ||
				seriesKey(a.item).localeCompare(seriesKey(b.item)),
		)
		.map(({ item }) => item);
}
