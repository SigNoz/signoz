import {
	histogramBucketSizes,
	NULL_EXPAND,
	NULL_REMOVE,
	NULL_RETAIN,
} from 'constants/histogramPanel';
import { DEFAULT_BUCKET_COUNT } from 'constants/histogramPanel';
import { PANEL_TYPES } from 'constants/queryBuilder';
import BarPanel from 'container/DashboardContainer/visualization/panels/BarPanel/BarPanel';
import HistogramPanel from 'container/DashboardContainer/visualization/panels/HistogramPanel/HistogramPanel';

import TimeSeriesPanel from '../DashboardContainer/visualization/panels/TimeSeriesPanel/TimeSeriesPanel';
import ListPanelWrapper from './ListPanelWrapper';
import PiePanelWrapper from './PiePanelWrapper';
import TablePanelWrapper from './TablePanelWrapper';
import ValuePanelWrapper from './ValuePanelWrapper';

export {
	DEFAULT_BUCKET_COUNT,
	histogramBucketSizes,
	NULL_EXPAND,
	NULL_REMOVE,
	NULL_RETAIN,
};

export const PanelTypeVsPanelWrapper = {
	[PANEL_TYPES.TIME_SERIES]: TimeSeriesPanel,
	[PANEL_TYPES.TABLE]: TablePanelWrapper,
	[PANEL_TYPES.LIST]: ListPanelWrapper,
	[PANEL_TYPES.VALUE]: ValuePanelWrapper,
	[PANEL_TYPES.TRACE]: null,
	[PANEL_TYPES.EMPTY_WIDGET]: null,
	[PANEL_TYPES.PIE]: PiePanelWrapper,
	[PANEL_TYPES.BAR]: BarPanel,
	[PANEL_TYPES.HISTOGRAM]: HistogramPanel,
};
