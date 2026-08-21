import { PANEL_TYPES } from 'constants/queryBuilder';
import BarPanel from 'container/WidgetCard/PanelWrapper/panels/BarPanel/BarPanel';
import HistogramPanel from 'container/WidgetCard/PanelWrapper/panels/HistogramPanel/HistogramPanel';

import TimeSeriesPanel from 'container/WidgetCard/PanelWrapper/panels/TimeSeriesPanel/TimeSeriesPanel';
import ListPanelWrapper from 'container/WidgetCard/PanelWrapper/ListPanelWrapper';
import PiePanelWrapper from 'container/WidgetCard/PanelWrapper/PiePanelWrapper';
import TablePanelWrapper from 'container/WidgetCard/PanelWrapper/TablePanelWrapper';
import ValuePanelWrapper from 'container/WidgetCard/PanelWrapper/ValuePanelWrapper';

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
