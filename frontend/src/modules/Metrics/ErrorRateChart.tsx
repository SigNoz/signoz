import Graph from 'components/Graph';
import ROUTES from 'constants/routes';
import React from 'react';
import { withRouter } from 'react-router';
import { RouteComponentProps } from 'react-router-dom';
import { metricItem } from 'store/actions/MetricsActions';
import styled from 'styled-components';

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

	onClickhandler = async (e: any, event: any) => {
		let firstPoint;
		if (this.chartRef) {
			firstPoint = this.chartRef.current.chartInstance.getElementAtEvent(e)[0];
		}

		if (firstPoint) {
			// PNOTE - TODO - Is await needed in this expression?
			this.setState({
				xcoordinate: e.offsetX + 20,
				ycoordinate: e.offsetY,
				showpopUp: true,
				firstpoint_ts: this.props.data[firstPoint._index].timestamp,
				// graphInfo:{...event}
			});
		}
	};

	gotoTracesHandler = () => {
		this.props.onTracePopupClick(this.state.firstpoint_ts);
	};

	gotoAlertsHandler = () => {
		this.props.history.push(ROUTES.SERVICE_MAP);
		// PNOTE - Keeping service map for now, will replace with alerts when alert page is made
	};

	GraphTracePopUp = () => {
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

	render() {
		const ndata = this.props.data;

		const data_chartJS = () => {
			// const ctx = canvas.getContext('2d');
			// const gradient = ctx.createLinearGradient(0, 0, 0, 100);
			// gradient.addColorStop(0, 'rgba(250,174,50,1)');
			// gradient.addColorStop(1, 'rgba(250,174,50,1)');
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

		return (
			<div>
				{this.GraphTracePopUp()}
				<div style={{ textAlign: 'center' }}>Error Percentage (%)</div>
				<div>
					<Graph xAxisType="timeseries" type="line" data={data_chartJS()} />
				</div>
			</div>
		);
	}
}

export default withRouter(ErrorRateChart);
