import { useMemo } from 'react';
import { FullScreen, useFullScreenHandle } from 'react-full-screen';

import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';

import DashboardDescription from './DashboardDescription';
import PanelsAndSectionsLayout from './PanelsAndSectionsLayout';
import styles from './DashboardContainer.module.scss';

interface Props {
	dashboard: DashboardtypesGettableDashboardV2DTO;
	refetch: () => void;
}

function DashboardContainer({ dashboard, refetch }: Props): JSX.Element {
	const fullScreenHandle = useFullScreenHandle();

	const { spec } = dashboard;
	const layouts = useMemo(() => spec?.layouts ?? [], [spec?.layouts]);
	const panels = useMemo(() => spec?.panels ?? {}, [spec?.panels]);

	return (
		<FullScreen handle={fullScreenHandle}>
			<div className={styles.container}>
				<DashboardDescription
					dashboard={dashboard}
					handle={fullScreenHandle}
					refetch={refetch}
				/>
				<PanelsAndSectionsLayout layouts={layouts} panels={panels} />
			</div>
		</FullScreen>
	);
}

export default DashboardContainer;
