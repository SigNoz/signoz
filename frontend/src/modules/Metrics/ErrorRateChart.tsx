import React from 'react';
import { Line as ChartJSLine } from 'react-chartjs-2';
import { ChartOptions } from 'chart.js';
import { withRouter } from 'react-router';
import { RouteComponentProps } from 'react-router-dom';
import styled from 'styled-components';
import ROUTES from 'Src/constants/routes';

import { metricItem } from '../../store/actions/MetricsActions';

const ChartPopUpUnique = styled.div<{
	ycoordinate: number;
	xcoordinate: number;
}>`
	background-color: white;
	border: 1px solid rgba(219, 112, 147, 0.5);
	zindex: 10;
	position: absolute;
	top: ${(props) => props.ycoordinate}px;
	left: ${(props) => props.xcoordinate}px;
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

// PNOTE - Check if this should be the case
const theme = 'dark';

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

	options_charts: ChartOptions = {
		onClick: this.onClickhandler,

		maintainAspectRatio: true,
		responsive: true,

		title: {
			display: true,
			text: '',
			fontSize: 20,
			position: 'top',
			padding: 2,
			fontFamily: 'Arial',
			fontStyle: 'regular',
			fontColor: theme === 'dark' ? 'rgb(200, 200, 200)' : 'rgb(20, 20, 20)',
		},

		legend: {
			display: true,
			position: 'bottom',
			align: 'center',

			labels: {
				fontColor: theme === 'dark' ? 'rgb(200, 200, 200)' : 'rgb(20, 20, 20)',
				fontSize: 10,
				boxWidth: 10,
				usePointStyle: true,
			},
		},

		tooltips: {
			mode: 'label',
			bodyFontSize: 12,
			titleFontSize: 12,

			callbacks: {
				label: function (tooltipItem, data) {
					if (typeof tooltipItem.yLabel === 'number') {
						return (
							data.datasets![tooltipItem.datasetIndex!].label +
							' : ' +
							tooltipItem.yLabel.toFixed(2)
						);
					} else {
						return '';
					}
				},
			},
		},

		scales: {
			yAxes: [
				{
					stacked: false,
					ticks: {
						beginAtZero: false,
						fontSize: 10,
						autoSkip: true,
						maxTicksLimit: 6,
					},

					//   scaleLabel: {
					//     display: true,
					//     labelString: 'latency in ms',
					//     fontSize: 6,
					//     padding: 4,
					//   },
					gridLines: {
						// You can change the color, the dash effect, the main axe color, etc.
						borderDash: [1, 4],
						color: '#D3D3D3',
						lineWidth: 0.25,
					},
				},
			],
			xAxes: [
				{
					type: 'time',
					// time: {
					//     unit: 'second'
					// },
					distribution: 'linear',
					ticks: {
						beginAtZero: false,
						fontSize: 10,
						autoSkip: true,
						maxTicksLimit: 10,
					},
					// gridLines: false, --> not a valid option
				},
			],
		},
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

		const data_chartJS = (canvas: any) => {
			const ctx = canvas.getContext('2d');
			const gradient = ctx.createLinearGradient(0, 0, 0, 100);
			gradient.addColorStop(0, 'rgba(250,174,50,1)');
			gradient.addColorStop(1, 'rgba(250,174,50,1)');
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
				<ChartJSLine
					ref={this.chartRef}
					data={data_chartJS}
					options={this.options_charts}
				/>
			</div>
		);
	}
}

export default withRouter(ErrorRateChart);
