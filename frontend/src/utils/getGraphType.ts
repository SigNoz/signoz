import { PANEL_TYPES } from 'constants/queryBuilder';

export const getGraphType = (panelType: PANEL_TYPES): PANEL_TYPES => {
	// backend don't support graphType as bar, as we consume time series data, sending graphType as time_series whenever we use bar as panel_type
	if (panelType === PANEL_TYPES.BAR) {
		return PANEL_TYPES.TIME_SERIES;
	}
	return panelType;
};
