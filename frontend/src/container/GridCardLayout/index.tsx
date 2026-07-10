import { FullScreenHandle } from 'react-full-screen';

import GraphLayoutContainer from './GridCardLayout';

interface GridGraphProps {
	handle: FullScreenHandle;
	enableDrillDown?: boolean;
	isEmbedded?: boolean;
}
function GridGraph(props: GridGraphProps): JSX.Element {
	const { handle, enableDrillDown = false, isEmbedded = false } = props;
	return (
		<GraphLayoutContainer
			handle={handle}
			enableDrillDown={enableDrillDown}
			isEmbedded={isEmbedded}
		/>
	);
}

export default GridGraph;

GridGraph.defaultProps = {
	enableDrillDown: false,
	isEmbedded: false,
};
