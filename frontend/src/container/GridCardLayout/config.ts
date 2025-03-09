import { PANEL_TYPES } from 'constants/queryBuilder';
import { MenuItemKeys } from 'container/GridCardLayout/WidgetHeader/contants';

export const ViewMenuAction = [MenuItemKeys.View];

export const EditMenuAction = [
	MenuItemKeys.Clone,
	MenuItemKeys.Delete,
	MenuItemKeys.Edit,
	MenuItemKeys.CreateAlerts,
];

export const headerMenuList = [...ViewMenuAction];

export const EMPTY_WIDGET_LAYOUT = {
	i: PANEL_TYPES.EMPTY_WIDGET,
	w: 6,
	x: 0,
	h: 6,
	y: 0,
};
