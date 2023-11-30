import {
	ActiveElement,
	Chart,
	ChartData,
	ChartEvent,
	ChartOptions,
	ChartType,
	TimeUnit,
} from 'chart.js';
import { ForwardedRef, ReactNode } from 'react';

import {
	dragSelectPluginId,
	DragSelectPluginOptions,
} from './Plugin/DragSelect';
import {
	intersectionCursorPluginId,
	IntersectionCursorPluginOptions,
} from './Plugin/IntersectionCursor';

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
	toggleGraph(graphIndex: number, isVisible: boolean, reference?: string): void;
};

export type CustomChartOptions = ChartOptions & {
	plugins: {
		[dragSelectPluginId]: DragSelectPluginOptions | false;
		[intersectionCursorPluginId]: IntersectionCursorPluginOptions | false;
	};
};

export interface GraphProps {
	animate?: boolean;
	type: ChartType;
	data: Chart['data'];
	title?: ReactNode;
	isStacked?: boolean;
	onClickHandler?: GraphOnClickHandler;
	name: string;
	yAxisUnit?: string;
	forceReRender?: boolean | null | number;
	staticLine?: StaticLineProps | undefined;
	containerHeight?: string | number;
	onDragSelect?: (start: number, end: number) => void;
	dragSelectColor?: string;
	ref?: ForwardedRef<ToggleGraphProps | undefined>;
}

export interface IAxisTimeUintConfig {
	unitName: TimeUnit;
	multiplier: number;
}

export interface IAxisTimeConfig {
	unitName: TimeUnit;
	stepSize: number;
}

export interface ITimeRange {
	minTime: number | null;
	maxTime: number | null;
}
