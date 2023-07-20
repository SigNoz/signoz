import { ChartData } from 'chart.js';
import { GraphOnClickHandler, StaticLineProps } from 'components/Graph';

export interface GridGraphComponentProps {
	data: ChartData;
	title?: string;
	opacity?: string;
	isStacked?: boolean;
	onClickHandler?: GraphOnClickHandler;
	name: string;
	yAxisUnit?: string;
	staticLine?: StaticLineProps;
	onDragSelect?: (start: number, end: number) => void;
}
