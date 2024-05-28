import { FullScreenHandle } from 'react-full-screen';

import GraphLayoutContainer from './GridCardLayout';

interface GridGraphProps {
	handle: FullScreenHandle;
}
function GridGraph(props: GridGraphProps): JSX.Element {
	const { handle } = props;
	return <GraphLayoutContainer handle={handle} />;
}

export default GridGraph;
