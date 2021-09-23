import { ActiveElement, Chart, ChartEvent } from 'chart.js';
import Graph from 'components/Graph';
import React, { useMemo, useState } from 'react';
import { metricItem } from 'store/actions/MetricsActions';
import styled from 'styled-components';

import { GraphContainer } from './styles';

const ChartPopUpUnique = styled.div<{
	ycoordinate: number;
	xcoordinate: number;
}>`
	background-color: white;
	border: 1px solid rgba(219, 112, 147, 0.5);
	z-index: 10;
	position: absolute;
	top: ${(props): number => props.ycoordinate}px;
	left: ${(props): number => props.xcoordinate}px;
	font-size: 12px;
	border-radius: 2px;
`;

const PopUpElements = styled.p`
	color: black;
	margin-bottom: 0px;
	padding-left: 4px;
	padding-right: 4px;
	&:hover {
		cursor: pointer;
	}
`;

interface ErrorRateChartProps {
	data: metricItem[];
	onTracePopupClick: (props: number) => void;
}

const ErrorRateChart = ({
	data,
	onTracePopupClick,
}: ErrorRateChartProps): JSX.Element => {
	const [state, setState] = useState({
		xcoordinate: 0,
		ycoordinate: 0,
		showpopUp: false,
		firstpoint_ts: 0,
	});

	const gotoTracesHandler = (): void => {
		onTracePopupClick(state.firstpoint_ts);
	};

	const data_chartJS: Chart['data'] = useMemo(() => {
		return {
			labels: data.map((s) => new Date(s.timestamp / 1000000)),
			datasets: [
				{
					label: 'Error Percentage (%)',
					data: data.map((s: { errorRate: any }) => s.errorRate),
					pointRadius: 0.5,
					borderColor: 'rgba(227, 74, 51,1)', // Can also add transparency in border color
					borderWidth: 2,
				},
			],
		};
	}, [data]);

	const onClickhandler = (
		event: ChartEvent,
		elements: ActiveElement[],
		chart: Chart,
	): void => {
		{
			if (event.native) {
				const points = chart.getElementsAtEventForMode(
					event.native,
					'nearest',
					{ intersect: true },
					true,
				);
				if (points.length) {
					const firstPoint = points[0];
					setState({
						xcoordinate: firstPoint.element.x,
						ycoordinate: firstPoint.element.y,
						showpopUp: true,
						firstpoint_ts: data[firstPoint.index].timestamp,
					});
				}
			}
		}
	};

	return (
		<div>
			{state.showpopUp && (
				<ChartPopUpUnique
					xcoordinate={state.xcoordinate}
					ycoordinate={state.ycoordinate}
				>
					<PopUpElements onClick={gotoTracesHandler}>View Traces</PopUpElements>
				</ChartPopUpUnique>
			)}
			<div style={{ textAlign: 'center' }}>Error Percentage (%)</div>

			<GraphContainer>
				<Graph
					onClickHandler={onClickhandler}
					xAxisType="timeseries"
					type="line"
					data={data_chartJS}
				/>
			</GraphContainer>
		</div>
	);
};

export default ErrorRateChart;
