import GridGraphLayout from 'container/GridCardLayout';
import { isDrilldownEnabled } from 'container/QueryTable/Drilldown/drilldownUtils';
import { FullScreenHandle } from 'react-full-screen';

import { GridComponentSliderContainer } from './styles';

interface GridGraphsProps {
	handle: FullScreenHandle;
}

function GridGraphs(props: GridGraphsProps): JSX.Element {
	const { handle } = props;
	return (
		<GridComponentSliderContainer>
			<GridGraphLayout handle={handle} enableDrillDown={isDrilldownEnabled()} />
		</GridComponentSliderContainer>
	);
}

export default GridGraphs;
