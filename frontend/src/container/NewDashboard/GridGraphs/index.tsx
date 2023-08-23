import GridGraphLayout from 'container/GridCardLayout';
import ComponentsSlider from 'container/NewDashboard/ComponentsSlider';
import { useDashboard } from 'providers/Dashboard/Dashboard';

import { GridComponentSliderContainer } from './styles';

function GridGraphs(): JSX.Element {
	const { isDashboardSliderOpen } = useDashboard();

	return (
		<GridComponentSliderContainer>
			{isDashboardSliderOpen && <ComponentsSlider />}

			<GridGraphLayout />
		</GridComponentSliderContainer>
	);
}

export default GridGraphs;
