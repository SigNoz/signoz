import {
	ActiveElement,
	Chart,
	ChartData,
	ChartEvent,
	ChartOptions,
} from 'chart.js';
import React, { useMemo, useState } from 'react';
import { metricItem } from 'store/actions/MetricsActions';
import styled from 'styled-components';

import { GraphTitle } from '../styles';
import LatencyLine from './LatencyLine';

const ChartPopUpUnique = styled.div<{
	ycoordinate: number;
	xcoordinate: number;
	showPopUp: boolean;
}>`
	background-color: white;
	border: 1px solid rgba(219, 112, 147, 0.5);
	z-index: 10;
	position: absolute;
	top: ${(props): number => props.ycoordinate}px;
	left: ${(props): number => props.xcoordinate}px;
	font-size: 12px;
	border-radius: 2px;
	display: ${({ showPopUp }): string => (showPopUp ? 'block' : 'none')};
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

interface LatencyLineChartProps {
	data: metricItem[];
	popupClickHandler: (props: any) => void;
}

const LatencyLineChart = ({
	data,
	popupClickHandler,
}: LatencyLineChartProps): JSX.Element => {
	const [state, setState] = useState({
		xcoordinate: 0,
		ycoordinate: 0,
		showpopUp: false,
		firstpoint_ts: 0,
	});

	const onClickhandler: ChartOptions['onClick'] = async (
		event: ChartEvent,
		elements: ActiveElement[],
		chart: Chart,
	): Promise<void> => {
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
			} else {
				if (state.showpopUp) {
					setState((state) => ({
						...state,
						showpopUp: false,
					}));
				}
			}
		}
	};

	const chartData: ChartData<'line'> = useMemo(() => {
		return {
			labels: data.map((s) => new Date(s.timestamp / 1000000)),
			datasets: [
				{
					label: 'p99 Latency',
					data: data.map((s) => s.p99 / 1000000), //converting latency from nano sec to ms
					pointRadius: 0.5,
					borderColor: 'rgba(250,174,50,1)', // Can also add transparency in border color
					borderWidth: 2,
				},
				{
					label: 'p95 Latency',
					data: data.map((s) => s.p95 / 1000000), //converting latency from nano sec to ms
					pointRadius: 0.5,
					borderColor: 'rgba(227, 74, 51, 1.0)',
					borderWidth: 2,
				},
				{
					label: 'p50 Latency',
					data: data.map((s) => s.p50 / 1000000), //converting latency from nano sec to ms
					pointRadius: 0.5,
					borderColor: 'rgba(57, 255, 20, 1.0)',
					borderWidth: 2,
				},
			],
		};
	}, [data]);

	return (
		<>
			<ChartPopUpUnique
				xcoordinate={state.xcoordinate}
				ycoordinate={state.ycoordinate}
				showPopUp={state.showpopUp}
			>
				<PopUpElements
					onClick={(): void => {
						popupClickHandler(state.firstpoint_ts);
					}}
				>
					View Traces
				</PopUpElements>
			</ChartPopUpUnique>

			<GraphTitle>Application latency in ms</GraphTitle>

			<LatencyLine data={chartData} onClickhandler={onClickhandler} />
		</>
	);
};

export default LatencyLineChart;
