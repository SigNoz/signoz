import GridGraphLayout from 'container/GridGraphLayout';
import ComponentsSlider from 'container/NewDashboard/ComponentsSlider';
import React, { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import DashboardReducer from 'types/reducer/dashboards';

import { GridComponentSliderContainer } from './styles';

const GridGraphs = (): JSX.Element => {
	const { dashboards } = useSelector<AppState, DashboardReducer>(
		(state) => state.dashboards,
	);

	const [selectedDashboard] = dashboards;

	const data = selectedDashboard.data;

	const widget = data.widgets;

	const [displaySlider, setDisplaySlider] = useState(widget?.length === 0);

	const onToggleHandler = useCallback(() => {
		setDisplaySlider((value) => !value);
	}, []);

	return (
		<>
			<GridComponentSliderContainer>
				{displaySlider && <ComponentsSlider />}

				<GridGraphLayout onToggleHandler={onToggleHandler} />
			</GridComponentSliderContainer>
		</>
	);
};

export default GridGraphs;
