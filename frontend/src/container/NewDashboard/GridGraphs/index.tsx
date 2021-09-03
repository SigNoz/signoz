import GridGraphLayout from 'container/GridGraphLayout';
import ComponentsSlider from 'container/NewDashboard/ComponentsSlider';
import React, { useState } from 'react';

// import { useSelector } from 'react-redux';
// import { AppState } from 'store/reducers';
// import DashboardReducer from 'types/reducer/dashboards';
import AddWidgets from './AddWidgets';
import { GridComponentSliderContainer } from './styles';

const GridGraphs = (): JSX.Element => {
	const [isAddWidgets, setIsAddWidgets] = useState<boolean>(true);

	return (
		<>
			{isAddWidgets ? (
				<AddWidgets setIsAddWidgets={setIsAddWidgets} />
			) : (
				<GridComponentSliderContainer>
					<ComponentsSlider />
					<GridGraphLayout />
				</GridComponentSliderContainer>
			)}
		</>
	);
};

export default GridGraphs;
