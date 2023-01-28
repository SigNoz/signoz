import { Typography } from 'antd';
import { ChartData } from 'chart.js';
import Graph, { GraphOnClickHandler, StaticLineProps } from 'components/Graph';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import ValueGraph from 'components/ValueGraph';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import history from 'lib/history';
import React from 'react';

import { TitleContainer, ValueContainer } from './styles';

function GridGraphComponent({
	GRAPH_TYPES: graphType,
	data,
	title,
	opacity,
	isStacked,
	onClickHandler,
	name,
	yAxisUnit,
	staticLine,
	onDragSelect,
}: GridGraphComponentProps): JSX.Element | null {
	const location = history.location.pathname;

	const isDashboardPage = location.split('/').length === 3;

	if (graphType === 'TIME_SERIES') {
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
			/>
		);
	}

	if (graphType === 'VALUE') {
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
}

GridGraphComponent.defaultProps = {
	title: undefined,
	opacity: undefined,
	isStacked: undefined,
	onClickHandler: undefined,
	yAxisUnit: undefined,
	staticLine: undefined,
	onDragSelect: undefined,
};

export default GridGraphComponent;
