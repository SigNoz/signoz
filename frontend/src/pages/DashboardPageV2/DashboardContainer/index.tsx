import { useCallback, useEffect, useMemo } from 'react';
import { FullScreen, useFullScreenHandle } from 'react-full-screen';
import { useLocation } from 'react-router-dom';

import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';
import { QueryParams } from 'constants/query';
import PanelTypeSelectionModal from 'container/DashboardContainer/PanelTypeSelectionModal';
import useComponentPermission from 'hooks/useComponentPermission';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import { useAppContext } from 'providers/App/App';

import DashboardPageToolbar from './DashboardPageToolbar';
import PanelEditorContainer from './PanelEditor';
import PanelsAndSectionsLayout from './PanelsAndSectionsLayout';
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

	const spec = dashboard.spec;
	const image = dashboard.image || Base64Icons[0];
	const name = spec.display.name;

	// The panel editor renders as an overlay driven by the `editPanelId` query
	// param — the dashboard stays mounted underneath instead of navigating to a
	// separate page. Resolve the panel from the already-loaded dashboard so the
	// overlay needs no extra fetch.
	const { pathname } = useLocation();
	const { safeNavigate } = useSafeNavigate();
	const urlQuery = useUrlQuery();
	const editPanelId = urlQuery.get(QueryParams.editPanelId) ?? undefined;
	const editPanel = editPanelId ? spec.panels[editPanelId] : undefined;

	const closeEditor = useCallback((): void => {
		urlQuery.delete(QueryParams.editPanelId);
		const search = urlQuery.toString();
		safeNavigate(search ? `${pathname}?${search}` : pathname);
	}, [urlQuery, safeNavigate, pathname]);

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
			{/* Shared panel-type picker (V1 component): opened from any "New Panel"
			    trigger; navigates to the widget editor route on selection. */}
			<PanelTypeSelectionModal />
			{editPanelId && editPanel && dashboard.id && (
				<PanelEditorContainer
					dashboardId={dashboard.id}
					panelId={editPanelId}
					panel={editPanel}
					onClose={closeEditor}
					onSaved={refetch}
				/>
			)}
		</FullScreen>
	);
}

export default DashboardContainer;
