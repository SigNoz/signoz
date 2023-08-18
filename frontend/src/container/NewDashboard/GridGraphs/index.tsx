import GridGraphLayout from 'container/GridGraphLayout';
import ComponentsSlider from 'container/NewDashboard/ComponentsSlider';
import { useDashboard } from 'providers/Dashboard';

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
