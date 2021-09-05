import { Card } from 'antd';
import { ChartData } from 'chart.js';
import GridGraphComponent from 'container/GridGraphComponent';
import { NewWidgetProps } from 'container/NewWidget';
import convertIntoEpoc from 'lib/covertIntoEpoc';
import getRandomColor from 'lib/getRandomColor';
import React from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router';
import { AppState } from 'store/reducers';
import DashboardReducer from 'types/reducer/dashboards';

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

	const { queryData } = selectedWidget;

	const chartData = queryData.data.map((e) => {
		const { values, metric } = e;

		const label = `${metric?.state} ${metric?.__name__}`;

		const dataValue = values?.map((e) => {
			const [first = 0, second = ''] = e || [];

			return {
				first: parseInt(convertIntoEpoc(first), 10),
				second,
			};
		});

		return {
			label,
			first: dataValue.map((e) => e.first),
			borderColor: getRandomColor(),
			second: dataValue.map((e) => e.second),
		};
	});

	const chartDataSet: ChartData = {
		labels: chartData[0].second,
		datasets: chartData.map((e) => ({
			label: e.label,
			data: e.first.map((val, index) => ({
				x: val,
				y: e['second'][index],
			})),
			borderColor: e.borderColor,
		})),
	};

	return <GridGraphComponent data={chartDataSet} GRAPH_TYPES={selectedGraph} />;
};

type WidgetGraphProps = NewWidgetProps;

export default WidgetGraph;
