import React from 'react';
import { Line as ChartJSLine } from 'react-chartjs-2';
import { ChartOptions } from 'chart.js';
import { withRouter } from 'react-router';
import { RouteComponentProps } from 'react-router-dom';
import styled from 'styled-components';
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

const theme = 'dark';

interface LatencyLineChartProps extends RouteComponentProps<any> {
	data: metricItem[];
	popupClickHandler: Function;
}

class LatencyLineChart extends React.Component<LatencyLineChartProps> {
	private chartRef: React.RefObject<HTMLElement>;
	constructor(props: LatencyLineChartProps) {
		super(props);
		this.chartRef = React.createRef();
	}

	state = {
		xcoordinate: 0,
		ycoordinate: 0,
		showpopUp: false,
		firstpoint_ts: 0,
	};

	onClickhandler = async (e: any, event: any) => {
		let firstPoint;
		if (this.chartRef) {
			firstPoint = this.chartRef.current.chartInstance.getElementAtEvent(e)[0];
		}

		if (firstPoint) {
			this.setState({
				xcoordinate: e.offsetX + 20,
				ycoordinate: e.offsetY,
				showpopUp: true,
				firstpoint_ts: this.props.data[firstPoint._index].timestamp,
			});
		} else {
			// if clicked outside of the graph line, then firstpoint is undefined -> close popup.
			// Only works for clicking in the same chart - as click handler only detects clicks in that chart
			this.setState({
				showpopUp: false,
			});
		}
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
			padding: 8,
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
					distribution: 'linear',
					//'linear': data are spread according to their time (distances can vary)
					// From https://www.chartjs.org/docs/latest/axes/cartesian/time.html
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
					<PopUpElements
						onClick={() => {
							this.props.popupClickHandler(this.state.firstpoint_ts);
						}}
					>
						View Traces
					</PopUpElements>
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
				labels: ndata.map((s) => new Date(s.timestamp / 1000000)),
				datasets: [
					{
						label: 'p99 Latency',
						data: ndata.map((s) => s.p99 / 1000000), //converting latency from nano sec to ms
						pointRadius: 0.5,
						borderColor: 'rgba(250,174,50,1)', // Can also add transparency in border color
						borderWidth: 2,
					},
					{
						label: 'p95 Latency',
						data: ndata.map((s) => s.p95 / 1000000), //converting latency from nano sec to ms
						pointRadius: 0.5,
						borderColor: 'rgba(227, 74, 51, 1.0)',
						borderWidth: 2,
					},
					{
						label: 'p50 Latency',
						data: ndata.map((s) => s.p50 / 1000000), //converting latency from nano sec to ms
						pointRadius: 0.5,
						borderColor: 'rgba(57, 255, 20, 1.0)',
						borderWidth: 2,
					},
				],
			};
		};

		return (
			<div>
				{this.GraphTracePopUp()}
				<div>
					<div style={{ textAlign: 'center' }}>Application latency in ms</div>
					<ChartJSLine
						ref={this.chartRef}
						data={data_chartJS}
						options={this.options_charts}
					/>
				</div>
			</div>
		);
	}
}

export default withRouter(LatencyLineChart);
