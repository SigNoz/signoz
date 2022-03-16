import { ActiveElement, Chart, ChartData, ChartEvent, ChartType } from 'chart.js';
import React from 'react';
import { GraphTitle, GraphContainer } from './styles';
import Graph from 'components/Graph';
import { colors } from 'lib/getRandomColor';
import { QueryEndpointData } from 'types/api/metrics/getQueryEndpoint';
import dayjs from 'dayjs';

const DashboardGraph = ({
	endpointData,
	type,
	title,
	label,
	onClickhandler,
	eventFrom,
	name,
}: GraphProps): JSX.Element => {
	return (
		<>
			<GraphTitle>{title}</GraphTitle>
			<GraphContainer>
				<Graph
					onClickHandler={(event, activeElements, chart, data): void => {
						if (onClickhandler !== undefined && eventFrom !== undefined) {
							onClickhandler(event, activeElements, chart, data, eventFrom);
						}
					}}
					name={name}
					type={type}
					data={{
						datasets: endpointData.map((data, index) => {
							return {
								data: data.values.map((value) => Number(parseFloat(value[1]))),
								borderColor: colors[index % colors.length],
								label: label,
								showLine: true,
								borderWidth: 1.5,
								spanGaps: true,
								pointRadius: 0,
							};
						}),
						labels:
							endpointData[0] === undefined
								? []
								: endpointData[0].values.map((data) => {
										return dayjs(data[0] * 1000).toDate();
								  }),
					}}
				/>
			</GraphContainer>
		</>
	);
};

interface GraphProps {
	type: ChartType;
	endpointData: QueryEndpointData[];
	title?: string;
	label?: string;
	eventFrom?: string;
	onClickhandler?: graphOnClickHandler;
	name: string;
}

export type graphOnClickHandler = (
	event: ChartEvent,
	elements: ActiveElement[],
	chart: Chart,
	data: ChartData,
	eventFrom: string,
) => void;

export default DashboardGraph;
