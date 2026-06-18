import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { PanelMode } from 'container/DashboardContainer/visualization/panels/types';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import PanelBody from 'pages/DashboardPageV2/DashboardContainer/PanelsAndSectionsLayout/Panel/PanelBody/PanelBody';
import type { RenderablePanelDefinition } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelDefinition';
import { PANEL_KIND_TO_PANEL_TYPE } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelKind';
import { getPanelQueryType } from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/getPanelQueryType';
import type {
	PanelPagination,
	PanelQueryData,
} from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';

import PlotTag from './PlotTag';
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
 * Live preview for the panel editor. Renders the draft through the same `PanelBody`
 * the dashboard grid uses (only `panelMode={DASHBOARD_EDIT}` differs), so the preview
 * is the production render path. The query result is owned by the editor root.
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
	const panelType = PANEL_KIND_TO_PANEL_TYPE[panel.spec.plugin.kind];
	const queryType = getPanelQueryType(panel);

	return (
		<div className={styles.preview}>
			<div className={styles.header}>
				<PlotTag
					queryType={queryType}
					panelType={panelType}
					className={styles.queryType}
				/>
				<div className={styles.dateTimeSelector}>
					<DateTimeSelectionV2 showAutoRefresh hideShareModal />
				</div>
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
