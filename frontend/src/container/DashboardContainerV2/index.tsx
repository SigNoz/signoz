import { FullScreen, useFullScreenHandle } from 'react-full-screen';

import DashboardDescriptionV2 from './DashboardDescriptionV2';
import GridCardLayoutV2 from './GridCardLayoutV2';
import type { V2Dashboard } from './utils';

interface Props {
	dashboard: V2Dashboard | undefined;
	onRefetch: () => void;
}

function DashboardContainerV2({ dashboard, onRefetch }: Props): JSX.Element {
	const fullScreenHandle = useFullScreenHandle();
	const spec = dashboard?.data?.spec;

	return (
		<FullScreen handle={fullScreenHandle}>
			<div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
				<DashboardDescriptionV2
					dashboard={dashboard}
					handle={fullScreenHandle}
					onRefetch={onRefetch}
				/>
				<div style={{ flex: 1, padding: '12px 24px', overflow: 'auto' }}>
					<GridCardLayoutV2
						layouts={spec?.layouts}
						panels={spec?.panels ?? undefined}
					/>
				</div>
			</div>
		</FullScreen>
	);
}

export default DashboardContainerV2;
