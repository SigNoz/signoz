import type { PanelStatusDetail } from 'pages/DashboardPage/DashboardContainer/PanelsAndSectionsLayout/Panel/PanelStatus/types';
import type { PanelQueryData } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import type { PanelOfKind } from '../../../types/rendererProps';
import { getBuilderQueries } from '../../../utils/getBuilderQueries';
import { getScatterPlotData } from './getScatterPlotData';
import { findGroupByMismatch } from './groupByMismatch';
import { getScatterPlotWarning } from './messages';

export function getScatterPlotDataWarning(
	panel: PanelOfKind<'signoz/ScatterPlotPanel'>,
	data: PanelQueryData,
): PanelStatusDetail | null {
	return getScatterPlotWarning(
		getScatterPlotData(data, panel.spec.plugin.spec),
		findGroupByMismatch(getBuilderQueries(panel.spec.queries)),
	);
}
