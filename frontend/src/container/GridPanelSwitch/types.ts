import { ChartData } from 'chart.js';
import { GraphOnClickHandler, StaticLineProps } from 'components/Graph';
import { GridGraphComponentProps } from 'container/GridGraphComponent/types';
import { GridValueComponentProps } from 'container/GridValueComponent/types';
import { ITEMS } from 'container/NewDashboard/ComponentsSlider/menuItems';

import { PANEL_TYPES } from '../../constants/queryBuilder';

export type GridPanelSwitchProps = {
	panelType: ITEMS;
	data: ChartData;
	title?: string;
	opacity?: string;
	isStacked?: boolean;
	onClickHandler?: GraphOnClickHandler;
	name: string;
	yAxisUnit?: string;
	staticLine?: StaticLineProps;
	onDragSelect?: (start: number, end: number) => void;
};

export type PropsTypePropsMap = {
	[PANEL_TYPES.TIME_SERIES]: GridGraphComponentProps;
	[PANEL_TYPES.VALUE]: GridValueComponentProps;
	[PANEL_TYPES.TABLE]: null;
	[PANEL_TYPES.TRACE]: null;
	[PANEL_TYPES.LIST]: null;
	[PANEL_TYPES.EMPTY_WIDGET]: null;
};
