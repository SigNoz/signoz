import GridGraphLayout from 'container/GridCardLayout';
import { FullScreenHandle } from 'react-full-screen';

import { GridComponentSliderContainer } from './styles';

interface GridGraphsProps {
	handle: FullScreenHandle;
}

function GridGraphs(props: GridGraphsProps): JSX.Element {
	const { handle } = props;
	return (
		<GridComponentSliderContainer>
			<GridGraphLayout handle={handle} />
		</GridComponentSliderContainer>
	);
}

export default GridGraphs;
