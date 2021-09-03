import { Card } from 'antd';
import GridGraphComponent from 'container/GridGraphComponent';
import React from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import DashboardReducer from 'types/reducer/dashboards';

import { NewWidgetProps } from '../index';
import QuerySection from './QuerySection';
import { QueryContainer } from './styles';

const LeftContainer = ({ selectedGraph }: NewWidgetProps): JSX.Element => {
	const { dashboards } = useSelector<AppState, DashboardReducer>(
		(state) => state.dashboards,
	);
	const [selectedDashboard] = dashboards;

	const { data } = selectedDashboard;

	const { widgets } = data;

	return (
		<>
			<Card>
				<GridGraphComponent
					data={{
						datasets: [],
					}}
					GRAPH_TYPES={selectedGraph}
				/>
			</Card>

			<QueryContainer>
				<QuerySection />
			</QueryContainer>
		</>
	);
};

export default LeftContainer;
