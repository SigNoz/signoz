import { useEffect, useMemo } from 'react';
import { FullScreen, useFullScreenHandle } from 'react-full-screen';

import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';
import useComponentPermission from 'hooks/useComponentPermission';
import { useAppContext } from 'providers/App/App';

import DashboardDescription from './DashboardDescription';
import PanelsAndSectionsLayout from './PanelsAndSectionsLayout';
import { useDashboardStore } from './store/useDashboardStore';
import styles from './DashboardContainer.module.scss';

interface DashboardContainerProps {
	dashboard: DashboardtypesGettableDashboardV2DTO;
	refetch: () => void;
}

function DashboardContainer({ dashboard, refetch }: DashboardContainerProps): JSX.Element {
	const fullScreenHandle = useFullScreenHandle();

	const { user } = useAppContext();
	const [editDashboard] = useComponentPermission(['edit_dashboard'], user.role);
	const isEditable = !dashboard.locked && editDashboard;

	// Publish edit context to the store so hooks/components read it from there
	// instead of receiving dashboardId/isEditable/refetch as props down the tree.
	const setEditContext = useDashboardStore((s) => s.setEditContext);
	useEffect(() => {
		setEditContext({ dashboardId: dashboard.id ?? '', isEditable, refetch });
	}, [dashboard.id, isEditable, refetch, setEditContext]);

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
