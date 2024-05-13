import { useFullScreenHandle } from 'react-full-screen';

import Description from './DashboardDescription';
import GridGraphs from './GridGraphs';

function NewDashboard(): JSX.Element {
	const handle = useFullScreenHandle();
	return (
		<div style={{ overflowX: 'hidden' }}>
			<Description handle={handle} />
			<GridGraphs handle={handle} />
		</div>
	);
}

export default NewDashboard;
