import { FullScreenHandle } from 'react-full-screen';

import GraphLayoutContainer from './GridCardLayout';

interface GridGraphProps {
	handle: FullScreenHandle;
	enableDrillDown?: boolean;
}
function GridGraph(props: GridGraphProps): JSX.Element {
	const { handle, enableDrillDown = false } = props;
	return (
		<GraphLayoutContainer handle={handle} enableDrillDown={enableDrillDown} />
	);
}

export default GridGraph;

GridGraph.defaultProps = {
	enableDrillDown: false,
};
