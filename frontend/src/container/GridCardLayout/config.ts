import { PANEL_TYPES } from 'constants/queryBuilder';
import { MenuItemKeys } from 'container/GridCardLayout/WidgetHeader/contants';

export const headerMenuList = [
	MenuItemKeys.View,
	MenuItemKeys.Clone,
	MenuItemKeys.Delete,
	MenuItemKeys.Edit,
];

export const EMPTY_WIDGET_LAYOUT = {
	i: PANEL_TYPES.EMPTY_WIDGET,
	w: 6,
	x: 0,
	h: 2,
	y: 0,
};
