import { ActiveElement, Chart, ChartEvent, ChartOptions } from 'chart.js';
import Graph from 'components/Graph';
import ROUTES from 'constants/routes';
import React from 'react';
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

interface RequestRateChartProps extends RouteComponentProps<any> {
	data: metricItem[];
}

interface RequestRateChart {
	chartRef: any;
}

class RequestRateChart extends React.Component<RequestRateChartProps> {
	constructor(props: RequestRateChartProps) {
		super(props);
		this.chartRef = React.createRef();
	}

	state = {
		xcoordinate: 0,
		ycoordinate: 0,
		showpopUp: false,
		// graphInfo:{}
	};

	onClickhandler = async (
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

				this.setState({
					xcoordinate: firstPoint.element.x,
					ycoordinate: firstPoint.element.y,
					showpopUp: true,
				});
			} else {
				if (this.state.showpopUp) {
					this.setState((state) => ({
						...state,
						showpopUp: false,
					}));
				}
			}
		}
	};

	gotoTracesHandler = () => {
		this.props.history.push(ROUTES.TRACES);
	};

	gotoAlertsHandler = () => {
		this.props.history.push(ROUTES.SERVICE_MAP);
		// PNOTE - Keeping service map for now, will replace with alerts when alert page is made
	};

	GraphTracePopUp = (): JSX.Element | null => {
		if (this.state.showpopUp) {
			return (
				<ChartPopUpUnique
					xcoordinate={this.state.xcoordinate}
					ycoordinate={this.state.ycoordinate}
				>
					<PopUpElements onClick={this.gotoTracesHandler}>View Traces</PopUpElements>
					{/* <PopUpElements onClick={this.gotoAlertsHandler}>Set Alerts</PopUpElements> */}
				</ChartPopUpUnique>
			);
		} else return null;
	};

	render(): JSX.Element {
		const ndata = this.props.data;

		const data_chartJS = (): Chart['data'] => {
			return {
				labels: ndata.map((s) => new Date(s.timestamp / 1000000)),
				datasets: [
					{
						label: 'Request per sec',
						data: ndata.map((s) => s.callRate),
						pointRadius: 0.5,
						borderColor: 'rgba(250,174,50,1)', // Can also add transparency in border color
						borderWidth: 2,
					},
				],
			};
		};

		return (
			<div>
				{this.GraphTracePopUp()}
				<div style={{ textAlign: 'center' }}>Request per sec</div>
				<GraphContainer>
					<Graph
						onClickHandler={this.onClickhandler}
						xAxisType="timeseries"
						type="line"
						data={data_chartJS()}
					/>
				</GraphContainer>
			</div>
		);
	}
}

export default withRouter(RequestRateChart);
