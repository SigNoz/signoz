import GraphLayoutContainer from 'container/GridCardLayout/GridCardLayout';
import { isDrilldownEnabled } from 'container/QueryTable/Drilldown/drilldownUtils';
import { useFullScreenHandle } from 'react-full-screen';

import Description from './DashboardDescription';

function NewDashboard(): JSX.Element {
	const handle = useFullScreenHandle();
	return (
		<div>
			<Description handle={handle} />
			<GraphLayoutContainer
				handle={handle}
				enableDrillDown={isDrilldownEnabled()}
			/>
		</div>
	);
}

export default NewDashboard;
