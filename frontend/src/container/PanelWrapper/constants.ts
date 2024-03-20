import { PANEL_TYPES } from 'constants/queryBuilder';

import ListPanelWrapper from './ListPanelWrapper';
import TablePanelWrapper from './TablePanelWrapper';
import UplotPanelWrapper from './UplotPanelWrapper';
import ValuePanelWrapper from './ValuePanelWrapper';

export const PanelTypeVsPanelWrapper = {
	[PANEL_TYPES.TIME_SERIES]: UplotPanelWrapper,
	[PANEL_TYPES.TABLE]: TablePanelWrapper,
	[PANEL_TYPES.LIST]: ListPanelWrapper,
	[PANEL_TYPES.VALUE]: ValuePanelWrapper,
	[PANEL_TYPES.TRACE]: null,
	[PANEL_TYPES.EMPTY_WIDGET]: null,
	[PANEL_TYPES.BAR]: UplotPanelWrapper,
};
