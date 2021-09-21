import { ActiveElement, Chart, ChartEvent, ChartOptions } from 'chart.js';
import Graph from 'components/Graph';
import React from 'react';
import { withRouter } from 'react-router';
import { RouteComponentProps } from 'react-router-dom';
import { metricItem } from 'store/actions/MetricsActions';
import styled from 'styled-components';

import { GraphContainer, GraphTitle } from './styles';

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

interface LatencyLineChartProps extends RouteComponentProps<any> {
	data: metricItem[];
	popupClickHandler: () => void;
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

	onClickhandler: ChartOptions['onClick'] = async (
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
					firstpoint_ts: this.props.data[firstPoint.index].timestamp,
				});
			} else {
				if (this.state.showpopUp) {
					this.setState({
						showpopUp: false,
					});
				}
			}
		}
	};

	render(): JSX.Element {
		const ndata = this.props.data;

		const data_chartJS = (): any => {
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
				{this.state.showpopUp && (
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
				)}

				<GraphTitle>Application latency in ms</GraphTitle>

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

export default withRouter(LatencyLineChart);
