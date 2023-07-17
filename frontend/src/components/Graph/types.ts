import { ActiveElement, Chart, ChartData, ChartEvent } from 'chart.js';

export interface StaticLineProps {
	yMin: number | undefined;
	yMax: number | undefined;
	borderColor: string;
	borderWidth: number;
	lineText: string;
	textColor: string;
}

export type GraphOnClickHandler = (
	event: ChartEvent,
	elements: ActiveElement[],
	chart: Chart,
	data: ChartData,
) => void;

export type ToggleGraphProps = {
	toggleGraph(graphIndex: number, isVisible: boolean): void;
};
