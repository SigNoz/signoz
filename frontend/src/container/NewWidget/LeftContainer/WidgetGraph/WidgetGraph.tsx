import { Card, Typography } from 'antd';
import { ChartData } from 'chart.js';
import GridGraphComponent from 'container/GridGraphComponent';
import { NewWidgetProps } from 'container/NewWidget';
import convertDateToAmAndPm from 'lib/convertDateToAmAndPm';
import convertIntoEpoc from 'lib/covertIntoEpoc';
import getLabelName from 'lib/getLabelName';
import getRandomColor, { colors } from 'lib/getRandomColor';
import React from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router';
import { AppState } from 'store/reducers';
import DashboardReducer from 'types/reducer/dashboards';

import { NotFoundContainer } from './styles';

const WidgetGraph = ({ selectedGraph }: WidgetGraphProps): JSX.Element => {
	const { dashboards } = useSelector<AppState, DashboardReducer>(
		(state) => state.dashboards,
	);

	const [selectedDashboard] = dashboards;
	const { data } = selectedDashboard;
	const { widgets = [] } = data;
	const { search } = useLocation();

	const params = new URLSearchParams(search);
	const widgetId = params.get('widgetId');

	const selectedWidget = widgets.find((e) => e.id === widgetId);

	if (selectedWidget === undefined) {
		return <Card>Invalid widget</Card>;
	}

	const { queryData, query } = selectedWidget;

	if (queryData.data.length === 0) {
		return (
			<NotFoundContainer>
				<Typography>No Data</Typography>
			</NotFoundContainer>
		);
	}

	const chartData = queryData.data.map((e, index) => {
		const { values, metric } = e;

		const labelNames = getLabelName(metric, (query[index] || {}).query);

		const dataValue = values?.map((e) => {
			const [first = 0, second = ''] = e || [];

			return {
				first: convertDateToAmAndPm(new Date(parseInt(convertIntoEpoc(first), 10))),
				second: Number(parseFloat(second).toFixed(2)),
			};
		});

		const color = colors[index] || 'red';

		return {
			label: labelNames,
			first: dataValue.map((e) => e.first),
			borderColor: color,
			second: dataValue.map((e) => e.second),
		};
	});

	const chartDataSet: ChartData = {
		labels: chartData[0].first,
		datasets: chartData.map((e) => ({
			label: e.label,
			data: e.second,
			borderColor: e.borderColor,
			pointRadius: 1,
		})),
	};

	return <GridGraphComponent data={chartDataSet} GRAPH_TYPES={selectedGraph} />;
};

type WidgetGraphProps = NewWidgetProps;

export default WidgetGraph;
