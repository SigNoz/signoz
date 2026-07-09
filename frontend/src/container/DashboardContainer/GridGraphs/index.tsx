import { FullScreenHandle } from 'react-full-screen';
import GridGraphLayout from 'container/GridCardLayout';
import { isDrilldownEnabled } from 'container/QueryTable/Drilldown/drilldownUtils';

import { GridComponentSliderContainer } from './styles';

interface GridGraphsProps {
	handle: FullScreenHandle;
	isEmbedded?: boolean;
}

function GridGraphs(props: GridGraphsProps): JSX.Element {
	const { handle, isEmbedded } = props;
	return (
		<GridComponentSliderContainer>
			<GridGraphLayout
				handle={handle}
				enableDrillDown={isDrilldownEnabled()}
				isEmbedded={isEmbedded}
			/>
		</GridComponentSliderContainer>
	);
}

export default GridGraphs;
