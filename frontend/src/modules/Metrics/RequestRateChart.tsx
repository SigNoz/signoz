import { ActiveElement, Chart, ChartEvent } from 'chart.js';
import Graph from 'components/Graph';
import ROUTES from 'constants/routes';
import history from 'lib/history';
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

interface RequestRateChartProps {
	data: metricItem[];
}

const RequestRateChart = ({ data }: RequestRateChartProps): JSX.Element => {
	const [state, setState] = useState({
		xcoordinate: 0,
		ycoordinate: 0,
		showpopUp: false,
	});
	const gotoTracesHandler = (): void => {
		history.push(ROUTES.TRACES);
	};

	const onClickHandler = async (
		event: ChartEvent,
		elements: ActiveElement[],
		charts: Chart,
	): Promise<void> => {
		if (event.native) {
			const points = charts.getElementsAtEventForMode(
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

	const GraphTracePopUp = (): JSX.Element | null => {
		if (state.showpopUp) {
			return (
				<ChartPopUpUnique
					xcoordinate={state.xcoordinate}
					ycoordinate={state.ycoordinate}
				>
					<PopUpElements onClick={gotoTracesHandler}>View Traces</PopUpElements>
				</ChartPopUpUnique>
			);
		} else return null;
	};

	const data_chartJS: Chart['data'] = useMemo(() => {
		return {
			labels: data.map((s) => new Date(s.timestamp / 1000000)),
			datasets: [
				{
					label: 'Request per sec',
					data: data.map((s) => s.callRate),
					pointRadius: 0.5,
					borderColor: 'rgba(250,174,50,1)', // Can also add transparency in border color
					borderWidth: 2,
				},
			],
		};
	}, [data]);

	return (
		<>
			<div>
				{GraphTracePopUp()}
				<div style={{ textAlign: 'center' }}>Request per sec</div>
				<GraphContainer>
					<Graph
						onClickHandler={onClickHandler}
						xAxisType="timeseries"
						type="line"
						data={data_chartJS}
					/>
				</GraphContainer>
			</div>
		</>
	);
};

export default RequestRateChart;
