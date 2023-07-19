import { ChartData } from 'chart.js';
import { GraphOnClickHandler, StaticLineProps } from 'components/Graph';
import { ITEMS } from 'container/NewDashboard/ComponentsSlider/menuItems';

export type GridPanelSwitchProps = {
	GRAPH_TYPES: ITEMS;
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
