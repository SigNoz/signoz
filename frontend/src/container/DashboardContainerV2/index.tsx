import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { FullScreen, useFullScreenHandle } from 'react-full-screen';
import { QueryParams } from 'constants/query';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';

import DashboardDescriptionV2 from './DashboardDescriptionV2';
import GridCardLayoutV2 from './GridCardLayoutV2';
import PanelEditorContainer from './PanelEditor';
import type { V2Dashboard } from './utils';

interface Props {
	dashboard: V2Dashboard | undefined;
	onRefetch: () => void;
}

function DashboardContainerV2({ dashboard, onRefetch }: Props): JSX.Element {
	const fullScreenHandle = useFullScreenHandle();
	const spec = dashboard?.spec;

	const { pathname } = useLocation();
	const { safeNavigate } = useSafeNavigate();
	const urlQuery = useUrlQuery();

	// The panel editor renders as an overlay driven by the `editPanelId` query
	// param — the dashboard stays mounted underneath instead of navigating to a
	// separate page. Resolve the panel from the already-loaded dashboard so the
	// overlay needs no extra fetch.
	const editPanelId = urlQuery.get(QueryParams.editPanelId) ?? undefined;
	const editPanel = editPanelId ? spec?.panels?.[editPanelId] : undefined;

	const closeEditor = useCallback((): void => {
		urlQuery.delete(QueryParams.editPanelId);
		const search = urlQuery.toString();
		safeNavigate(search ? `${pathname}?${search}` : pathname);
	}, [urlQuery, safeNavigate, pathname]);

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
				{editPanelId && editPanel && dashboard?.id && (
					<PanelEditorContainer
						dashboardId={dashboard.id}
						panelId={editPanelId}
						panel={editPanel}
						onClose={closeEditor}
						onSaved={onRefetch}
					/>
				)}
			</div>
		</FullScreen>
	);
}

export default DashboardContainerV2;
