import { useState } from 'react';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { PanelMode } from 'container/DashboardContainer/visualization/panels/types';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import PanelBody from 'pages/DashboardPageV2/DashboardContainer/PanelsAndSectionsLayout/Panel/PanelBody/PanelBody';
import PanelHeader from 'pages/DashboardPageV2/DashboardContainer/PanelsAndSectionsLayout/Panel/PanelHeader/PanelHeader';
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
	/** Background refresh in flight — drives the header's subtle refetch spinner. */
	isFetching: boolean;
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
	isFetching,
	error,
	refetch,
	onDragSelect,
	pagination,
}: PreviewPaneProps): JSX.Element {
	const panelType = PANEL_KIND_TO_PANEL_TYPE[panel.spec.plugin.kind];
	const queryType = getPanelQueryType(panel);

	// Header search: only kinds that declare it (e.g. tables/lists) render the
	// box. The term is ephemeral preview state — like the dashboard grid's
	// `Panel`, it's owned here and threaded to both the header (input) and the
	// renderer (filter), not persisted to the draft spec.
	const searchable = !!panelDef?.headerControls.search;
	const [searchTerm, setSearchTerm] = useState('');

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
						<>
							{/* Same header as the dashboard grid, minus the actions menu —
							    panel-level actions (View/Edit/Clone/Delete) don't apply in
							    the editor. The per-panel time pill is omitted too: the
							    preview owns its own time window (see resolvePanelTimeWindow). */}
							<PanelHeader
								name={panel.spec.display.name}
								description={panel.spec.display?.description}
								panelId={panelId}
								panelKind={panel.spec.plugin.kind}
								isFetching={isFetching}
								error={error}
								warning={data.response?.data?.warning}
								searchable={searchable}
								searchTerm={searchTerm}
								onSearchChange={setSearchTerm}
								hideActions
							/>
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
								searchTerm={searchable ? searchTerm : undefined}
								pagination={pagination}
							/>
						</>
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
