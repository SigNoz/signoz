import { useEffect } from 'react';
import { FullScreen, useFullScreenHandle } from 'react-full-screen';

import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';

import DashboardPageToolbar from './DashboardPageToolbar';
import PanelsAndSectionsLayout from './PanelsAndSectionsLayout';
import { useDashboardEditGuard } from './hooks/useDashboardEditGuard';
import { useResolvedVariables } from './hooks/useResolvedVariables';
import { useSyncVariablesForSuggestions } from './hooks/useSyncVariablesForSuggestions';
import { useDashboardStore } from './store/useDashboardStore';
import styles from './DashboardContainer.module.scss';
import DashboardPageHeader from './components/DashboardPageHeader/DashboardPageHeader';
import LockedIndicator from './components/LockedIndicator/LockedIndicator';
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

	const { isLocked, canEditDashboard } = useDashboardEditGuard(dashboard);

	// Seed during render (not an effect) so the first Panel render already sees the id —
	// useDashboardFetchRequired throws on a missing id. setEditContext self-guards.
	const setEditContext = useDashboardStore((s) => s.setEditContext);
	setEditContext({
		dashboardId: dashboard.id,
		isLocked,
		canEditDashboard,
		refetch,
	});

	// Resolve the variable selection into the V5 query payload and publish it to
	// the store, so each panel's query substitutes the bar's selected values.
	useResolvedVariables(dashboard);

	// Publish variables to the shared store so the query builder autocomplete
	// suggests them ($variable) in the panel editor and dashboards-page builder.
	useSyncVariablesForSuggestions(dashboard);

	// In full screen show only the sections and panels — the header/toolbar chrome
	// is hidden for a clean presentation view (exit with Esc).
	return (
		<FullScreen handle={fullScreenHandle}>
			<div className={styles.container}>
				{!fullScreenHandle.active && (
					<>
						<DashboardPageHeader title={name} image={image} />
						<DashboardPageToolbar dashboard={dashboard} handle={fullScreenHandle} />
					</>
				)}
				<PanelsAndSectionsLayout layouts={spec.layouts} panels={spec.panels} />
				{isLocked && <LockedIndicator />}
			</div>
		</FullScreen>
	);
}

export default DashboardContainer;
