import { InfoCircleOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import { Card } from 'container/GridGraphLayout/styles';
import React from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { AppState } from 'store/reducers';
import DashboardReducer from 'types/reducer/dashboards';

import { NewWidgetProps } from '../../index';
import { AlertIconContainer, Container } from './styles';

const WidgetGraph = ({ selectedGraph }: WidgetGraphProps): JSX.Element => {
	const { dashboards, isQueryFired } = useSelector<AppState, DashboardReducer>(
		(state) => state.dashboards,
	);
	const [selectedDashboard] = dashboards;
	const { search } = useLocation();

	const { data } = selectedDashboard;

	const { widgets = [] } = data;

	const params = new URLSearchParams(search);
	const widgetId = params.get('widgetId');

	const selectedWidget = widgets.find((e) => e.id === widgetId);

	if (selectedWidget === undefined) {
		return <Card>Invalid widget</Card>;
	}

	const { queryData } = selectedWidget;

	console.log(queryData.data);

	return (
		<Container>
			{queryData.error && (
				<AlertIconContainer title={queryData.errorMessage}>
					<InfoCircleOutlined />
				</AlertIconContainer>
			)}

			{!isQueryFired && <Typography>No Data</Typography>}
		</Container>
	);
};

type WidgetGraphProps = NewWidgetProps;

export default WidgetGraph;
