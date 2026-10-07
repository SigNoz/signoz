import type { PanelStatusDetail } from 'pages/DashboardPage/DashboardContainer/PanelsAndSectionsLayout/Panel/PanelStatus/types';
import type { PanelQueryData } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import type { PanelOfKind } from '../../../types/rendererProps';
import { getBuilderQueries } from '../../../utils/getBuilderQueries';
import { findGroupByMismatch } from './groupByMismatch';
import { getScatterPlotWarning } from './messages';
import { prepareScatterPlotData } from './prepareData';
import { getScatterTable } from './scatterTable';

export function getScatterPlotDataWarning(
	panel: PanelOfKind<'signoz/ScatterPlotPanel'>,
	data: PanelQueryData,
): PanelStatusDetail | null {
	const { dimensions, axes, formatting } = panel.spec.plugin.spec;
	return getScatterPlotWarning(
		prepareScatterPlotData({
			table: getScatterTable(data),
			dimensions,
			axes,
			columnUnits: formatting?.columnUnits ?? {},
		}),
		findGroupByMismatch(getBuilderQueries(panel.spec.queries)),
	);
}
