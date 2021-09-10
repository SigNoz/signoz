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

	const getInitialValue = (): boolean => {
		if (widget === undefined) {
			return false;
		}

		if (widget.length !== 0) {
			return true;
		}

		return false;
	};

	const [displaySlider, setDisplaySlider] = useState(getInitialValue());

	const onToggleHandler = useCallback(() => {
		setDisplaySlider(true);
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
