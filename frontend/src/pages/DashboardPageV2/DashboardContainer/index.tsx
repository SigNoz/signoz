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
	const spec = dashboard.spec;
	const image = dashboard.image || Base64Icons[0];
	const name = spec.display.name;

	useEffect(() => {
		document.title = name;
	}, [name]);

	const fullScreenHandle = useFullScreenHandle();

	const { user } = useAppContext();
	const [editDashboardPermission] = useComponentPermission(
		['edit_dashboard'],
		user.role,
	);

	// Seed during render (not an effect) so the first Panel render already sees the id —
	// useDashboardFetchRequired throws on a missing id. setEditContext self-guards.
	const setEditContext = useDashboardStore((s) => s.setEditContext);
	setEditContext({
		dashboardId: dashboard.id,
		isEditable: !dashboard.locked && editDashboardPermission,
		refetch,
	});

	// Resolve the variable selection into the V5 query payload and publish it to
	// the store, so each panel's query substitutes the bar's selected values.
	useResolvedVariables(dashboard);

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
