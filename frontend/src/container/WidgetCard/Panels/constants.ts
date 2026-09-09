import { PANEL_TYPES } from 'constants/queryBuilder';
import BarPanel from 'container/WidgetCard/Panels/BarPanel/BarPanel';
import HistogramPanel from 'container/WidgetCard/Panels/HistogramPanel/HistogramPanel';

import TimeSeriesPanel from 'container/WidgetCard/Panels/TimeSeriesPanel/TimeSeriesPanel';
import ListPanelWrapper from 'container/WidgetCard/Panels/ListPanelWrapper';
import PiePanelWrapper from 'container/WidgetCard/Panels/PiePanelWrapper';
import TablePanelWrapper from 'container/WidgetCard/Panels/TablePanelWrapper';
import ValuePanelWrapper from 'container/WidgetCard/Panels/ValuePanelWrapper';

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
