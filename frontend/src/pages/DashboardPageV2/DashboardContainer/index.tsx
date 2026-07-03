import { useEffect } from 'react';
import { FullScreen, useFullScreenHandle } from 'react-full-screen';

import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';
import useComponentPermission from 'hooks/useComponentPermission';
import { useAppContext } from 'providers/App/App';

import DashboardPageToolbar from './DashboardPageToolbar';
import PanelsAndSectionsLayout from './PanelsAndSectionsLayout';
import { useResolvedVariables } from './hooks/useResolvedVariables';
import { useDashboardStore } from './store/useDashboardStore';
import styles from './DashboardContainer.module.scss';
import DashboardPageHeader from './components/DashboardPageHeader/DashboardPageHeader';
import { Base64Icons } from './DashboardSettings/Overview/utils';

interface DashboardContainerProps {
	dashboard: DashboardtypesGettableDashboardV2DTO;
	refetch: () => void;
}

function DashboardContainer({
	dashboard,
	refetch,
}: DashboardContainerProps): JSX.Element {
	useEffect(() => {
		document.title = dashboard.name;
	}, [dashboard.name]);

	const fullScreenHandle = useFullScreenHandle();

	const { user } = useAppContext();
	const [editDashboardPermission] = useComponentPermission(
		['edit_dashboard'],
		user.role,
	);

	// Publish edit context to the store so hooks/components read it from there
	// instead of receiving dashboardId/isEditable/refetch as props down the tree.
	const setEditContext = useDashboardStore((s) => s.setEditContext);
	useEffect(() => {
		setEditContext({
			dashboardId: dashboard.id,
			isEditable: !dashboard.locked && editDashboardPermission,
			refetch,
		});
	}, [
		dashboard.id,
		dashboard.locked,
		editDashboardPermission,
		refetch,
		setEditContext,
	]);

	// Resolve the variable selection into the V5 query payload and publish it to
	// the store, so each panel's query substitutes the bar's selected values.
	useResolvedVariables(dashboard);

	const spec = dashboard.spec;
	const image = dashboard.image || Base64Icons[0];
	const name = spec.display.name;

	return (
		<FullScreen handle={fullScreenHandle}>
			<div className={styles.container}>
				<DashboardPageHeader title={name} image={image} />
				<DashboardPageToolbar
					dashboard={dashboard}
					handle={fullScreenHandle}
					refetch={refetch}
				/>
				<PanelsAndSectionsLayout layouts={spec.layouts} panels={spec.panels} />
			</div>
		</FullScreen>
	);
}

export default DashboardContainer;
