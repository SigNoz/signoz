import { Card, Typography } from 'antd';
import GridGraphComponent from 'container/GridGraphComponent';
import React from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import DashboardReducer from 'types/reducer/dashboards';

import { NewWidgetProps } from '../index';
import { timePreferance } from '../RightContainer/timeItems';
import QuerySection from './QuerySection';
import { NotFoundContainer, QueryContainer } from './styles';

const LeftContainer = ({
	selectedGraph,
	selectedTime,
}: LeftContainerProps): JSX.Element => {
	const { dashboards, isQueryFired } = useSelector<AppState, DashboardReducer>(
		(state) => state.dashboards,
	);
	const [selectedDashboard] = dashboards;

	const { data } = selectedDashboard;

	const { widgets } = data;

	const isDataPresent = !isQueryFired;

	return (
		<>
			<Card>
				{isDataPresent ? (
					<NotFoundContainer>
						<Typography>No Data</Typography>
					</NotFoundContainer>
				) : (
					<GridGraphComponent
						data={{
							datasets: [],
						}}
						GRAPH_TYPES={selectedGraph}
					/>
				)}
			</Card>

			<QueryContainer>
				<QuerySection selectedTime={selectedTime} />
			</QueryContainer>
		</>
	);
};

interface LeftContainerProps extends NewWidgetProps {
	selectedTime: timePreferance;
}

export default LeftContainer;
