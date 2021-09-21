import { ActiveElement, Chart, ChartData, ChartEvent } from 'chart.js';
import Graph from 'components/Graph';
import ROUTES from 'constants/routes';
import React, { memo, useMemo } from 'react';
import { withRouter } from 'react-router';
import { RouteComponentProps } from 'react-router-dom';
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

interface ErrorRateChartProps extends RouteComponentProps<any> {
	data: metricItem[];
	onTracePopupClick: Function;
}

interface ErrorRateChart {
	chartRef: any;
}

class ErrorRateChart extends React.Component<ErrorRateChartProps> {
	constructor(props: ErrorRateChartProps) {
		super(props);
		this.chartRef = React.createRef();
	}

	state = {
		// data: props.data,
		xcoordinate: 0,
		ycoordinate: 0,
		showpopUp: false,
		firstpoint_ts: 0,
		// graphInfo:{}
	};

	onClickhandler = (
		event: ChartEvent,
		elements: ActiveElement[],
		chart: Chart,
	): void => {
		if (event.native) {
			const points = chart.getElementsAtEventForMode(
				event.native,
				'nearest',
				{ intersect: true },
				true,
			);

			if (points.length) {
				const firstPoint = points[0];

				this.setState({
					xcoordinate: firstPoint.element.x,
					ycoordinate: firstPoint.element.y,
					showpopUp: true,
					firstpoint_ts: this.props.data[firstPoint.index].timestamp,
				});
			}
		}
	};

	gotoTracesHandler = () => {
		this.props.onTracePopupClick(this.state.firstpoint_ts);
	};

	render(): JSX.Element {
		const ndata = this.props.data;

		const data_chartJS = (): ChartData => {
			return {
				labels: ndata.map((s) => new Date(s.timestamp / 1000000)), // converting from nano second to mili second
				datasets: [
					{
						label: 'Error Percentage (%)',
						data: ndata.map((s) => s.errorRate),
						pointRadius: 0.5,
						borderColor: 'rgba(227, 74, 51,1)', // Can also add transparency in border color
						borderWidth: 2,
					},
				],
			};
		};

		const data = data_chartJS();

		return (
			<div>
				{this.state.showpopUp && (
					<ChartPopUpUnique
						xcoordinate={this.state.xcoordinate}
						ycoordinate={this.state.ycoordinate}
					>
						<PopUpElements onClick={this.gotoTracesHandler}>
							View Traces
						</PopUpElements>
					</ChartPopUpUnique>
				)}
				<div style={{ textAlign: 'center' }}>Error Percentage (%)</div>

				<GraphContainer>
					<Graph
						onClickHandler={this.onClickhandler}
						xAxisType="timeseries"
						type="line"
						data={data}
					/>
				</GraphContainer>
			</div>
		);
	}
}

export default withRouter(ErrorRateChart);
