import { Spline } from '@signozhq/icons';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { PanelMode } from 'container/DashboardContainer/visualization/panels/types';
import QueryTypeTag from 'container/NewWidget/LeftContainer/QueryTypeTag';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import PanelBody from 'pages/DashboardPageV2/DashboardContainer/PanelsAndSectionsLayout/Panel/PanelBody/PanelBody';
import type { RenderablePanelDefinition } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelDefinition';
import type {
	PanelPagination,
	PanelQueryData,
} from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';
import { EQueryType } from 'types/common/dashboard';

import styles from './PreviewPane.module.scss';

interface PreviewPaneProps {
	panelId: string;
	panel: DashboardtypesPanelDTO;
	/** Resolved definition for the panel kind; undefined when the kind is unsupported. */
	panelDef: RenderablePanelDefinition | undefined;
	data: PanelQueryData;
	isLoading: boolean;
	error: Error | null;
	/** Re-run the query (drives PanelBody's error-state retry). */
	refetch: () => void;
	/** Drag-to-zoom on a time-axis chart → updates the (URL-synced) time window. */
	onDragSelect: (start: number, end: number) => void;
	/** Server-side pager for raw/list panels; absent for non-paginated panels. */
	pagination?: PanelPagination;
}

/**
 * Live preview for the panel editor. Presentational: the draft panel renders
 * through `PanelBody` — the very same body the dashboard grid uses — so the
 * preview is the production render path (loading / error-retry / renderer), with
 * `panelMode={DASHBOARD_EDIT}` the only difference. The query result is owned by
 * the editor root (`usePanelQuery`) and passed in, shared with the config pane.
 */
function PreviewPane({
	panelId,
	panel,
	panelDef,
	data,
	isLoading,
	error,
	refetch,
	onDragSelect,
	pagination,
}: PreviewPaneProps): JSX.Element {
	return (
		<div className={styles.preview}>
			<div className={styles.header}>
				<div className={styles.queryType}>
					<Spline size={14} />
					Plotted with <QueryTypeTag queryType={EQueryType.QUERY_BUILDER} />
				</div>
				<DateTimeSelectionV2 showAutoRefresh hideShareModal />
			</div>
			<div className={styles.container}>
				<div className={styles.surface}>
					{panelDef ? (
						<PanelBody
							panelDefinition={panelDef}
							panel={panel}
							panelId={panelId}
							data={data}
							isLoading={isLoading}
							error={error}
							refetch={refetch}
							onDragSelect={onDragSelect}
							panelMode={PanelMode.DASHBOARD_EDIT}
							pagination={pagination}
						/>
					) : (
						<div className={styles.state} data-testid="panel-editor-v2-unknown-kind">
							This panel type is not yet supported in V2.
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export default PreviewPane;
