import GridGraphLayout from 'container/GridGraphLayout';
import ComponentsSlider from 'container/NewDashboard/ComponentsSlider';
import React, { useState } from 'react';

import AddWidgets from './AddWidgets';
import { GridComponentSliderContainer } from './styles';

const GridGraphs = (): JSX.Element => {
	const [isAddWidgets, setIsAddWidgets] = useState<boolean>(false);

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
