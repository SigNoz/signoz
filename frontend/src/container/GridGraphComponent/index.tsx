import { Typography } from 'antd';
import { ChartData } from 'chart.js';
import Graph from 'components/Graph';
import {
	GraphOnClickHandler,
	StaticLineProps,
	ToggleGraphProps,
} from 'components/Graph/types';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import ValueGraph from 'components/ValueGraph';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

import { TitleContainer, ValueContainer } from './styles';

function GridGraphComponent({
	GRAPH_TYPES,
	data,
	title,
	opacity,
	isStacked,
	onClickHandler,
	name,
	yAxisUnit,
	staticLine,
	onDragSelect,
	graphsVisibilityStates,
}: GridGraphComponentProps): JSX.Element | null {
	const { pathname } = useLocation();

	const isDashboardPage = pathname.split('/').length === 3;

	const lineChartRef = useRef<ToggleGraphProps>();

	useEffect(() => {
		if (lineChartRef.current) {
			graphsVisibilityStates?.forEach((showLegendData, index) => {
				lineChartRef?.current?.toggleGraph(index, showLegendData);
			});
		}
	}, [graphsVisibilityStates]);

	if (GRAPH_TYPES === PANEL_TYPES.TIME_SERIES) {
		return (
			<Graph
				{...{
					data,
					title,
					type: 'line',
					isStacked,
					opacity,
					xAxisType: 'time',
					onClickHandler,
					name,
					yAxisUnit,
					staticLine,
					onDragSelect,
				}}
				ref={lineChartRef}
			/>
		);
	}

	if (GRAPH_TYPES === PANEL_TYPES.VALUE) {
		const value = (((data.datasets[0] || []).data || [])[0] || 0) as number;

		if (data.datasets.length === 0) {
			return (
				<ValueContainer isDashboardPage={isDashboardPage}>
					<Typography>No Data</Typography>
				</ValueContainer>
			);
		}

		return (
			<>
				<TitleContainer isDashboardPage={isDashboardPage}>
					<Typography>{title}</Typography>
				</TitleContainer>
				<ValueContainer isDashboardPage={isDashboardPage}>
					<ValueGraph
						value={
							yAxisUnit
								? getYAxisFormattedValue(String(value), yAxisUnit)
								: value.toString()
						}
					/>
				</ValueContainer>
			</>
		);
	}

	return null;
}

export interface GridGraphComponentProps {
	GRAPH_TYPES: GRAPH_TYPES;
	data: ChartData;
	title?: string;
	opacity?: string;
	isStacked?: boolean;
	onClickHandler?: GraphOnClickHandler;
	name: string;
	yAxisUnit?: string;
	staticLine?: StaticLineProps;
	onDragSelect?: (start: number, end: number) => void;
	graphsVisibilityStates?: boolean[];
}

GridGraphComponent.defaultProps = {
	title: undefined,
	opacity: undefined,
	isStacked: undefined,
	onClickHandler: undefined,
	yAxisUnit: undefined,
	staticLine: undefined,
	onDragSelect: undefined,
	graphsVisibilityStates: undefined,
};

export default GridGraphComponent;
