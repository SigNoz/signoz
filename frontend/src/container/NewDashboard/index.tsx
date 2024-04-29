import { useFullScreenHandle } from 'react-full-screen';

import Description from './DashboardDescription';
import GridGraphs from './GridGraphs';

function NewDashboard(): JSX.Element {
	const handle = useFullScreenHandle();
	return (
		<>
			<Description handle={handle} />
			<GridGraphs handle={handle} />
		</>
	);
}

export default NewDashboard;
