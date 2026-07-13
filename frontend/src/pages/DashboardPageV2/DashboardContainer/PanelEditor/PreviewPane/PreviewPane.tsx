import { useState } from 'react';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import cx from 'classnames';
import { PanelMode } from 'container/DashboardContainer/visualization/panels/types';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import PanelBody from 'pages/DashboardPageV2/DashboardContainer/PanelsAndSectionsLayout/Panel/PanelBody/PanelBody';
import PanelHeader from 'pages/DashboardPageV2/DashboardContainer/PanelsAndSectionsLayout/Panel/PanelHeader/PanelHeader';
import type { AnyPanelInteractionProps } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/interactions';
import type { RenderablePanelDefinition } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelDefinition';
import { PANEL_KIND_TO_PANEL_TYPE } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelKind';
import type { DashboardPreference } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/rendererProps';
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
	/** Resolved definition for the panel kind; */
	panelDefinition: RenderablePanelDefinition;
	data: PanelQueryData;
	/** Any fetch in flight — drives the header spinner and the body's loading state. */
	isFetching: boolean;
	/** Showing a prior page's data while the next loads; forwarded so the list shows skeleton rows. */
	isPreviousData?: boolean;
	error: Error | null;
	/** Re-run the query (drives PanelBody's error-state retry). */
	refetch: () => void;
	/** Drag-to-zoom on a time-axis chart → updates the (URL-synced) time window. */
	onDragSelect: (start: number, end: number) => void;
	/** Server-side pager for raw/list panels; absent for non-paginated panels. */
	pagination?: PanelPagination;
	/** Render context — defaults to the editor's DASHBOARD_EDIT; the View modal passes STANDALONE_VIEW. */
	panelMode?: PanelMode;
	/** Hide the preview's top row entirely (query-type badge + time picker) — the View modal has its own header. */
	hideHeader?: boolean;
	/** Dashboard-wide preferences (cursor sync, …) forwarded to the body; the modal isolates cursor-sync. */
	dashboardPreference?: DashboardPreference;
	/** Close the standalone View modal — forwarded to the time-series/bar graph manager. */
	onCloseStandaloneView?: () => void;
	/** Opens the drill-down context menu; only the View modal wires it (the editor preview omits it). */
	onClick?: AnyPanelInteractionProps['onClick'];
	/** Arms the drill-down click on interactive renderers — the View modal enables it, the editor doesn't. */
	enableDrillDown?: boolean;
}

/**
 * Live preview for the panel editor: renders the draft through the same `PanelBody`
 * the dashboard grid uses (only `panelMode` differs), so the preview is the
 * production render path. The query result is owned by the editor root.
 */
function PreviewPane({
	panelId,
	panel,
	panelDefinition,
	data,
	isFetching,
	isPreviousData,
	error,
	refetch,
	onDragSelect,
	pagination,
	panelMode = PanelMode.DASHBOARD_EDIT,
	hideHeader = false,
	dashboardPreference,
	onCloseStandaloneView,
	onClick,
	enableDrillDown,
}: PreviewPaneProps): JSX.Element {
	const panelType = PANEL_KIND_TO_PANEL_TYPE[panel.spec.plugin.kind];
	const queryType = getPanelQueryType(panel);

	// Search term is ephemeral preview state, threaded to header + renderer but
	// not persisted to the draft spec. Only kinds that declare it render the box.
	const searchable = !!panelDefinition.actions.search;
	const [searchTerm, setSearchTerm] = useState('');

	return (
		<div className={styles.preview}>
			{!hideHeader && (
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
			)}
			<div className={styles.container}>
				<div
					className={cx(styles.surface, {
						[styles.surfaceStacked]: panelMode === PanelMode.STANDALONE_VIEW,
					})}
				>
					<PanelHeader
						panelId={panelId}
						panel={panel}
						data={data}
						isFetching={isFetching}
						error={error}
						warning={data.response?.data?.warning}
						searchable={searchable}
						searchTerm={searchTerm}
						onSearchChange={setSearchTerm}
						hideActions
					/>
					<PanelBody
						panelDefinition={panelDefinition}
						panel={panel}
						panelId={panelId}
						data={data}
						isFetching={isFetching}
						isPreviousData={isPreviousData}
						error={error}
						refetch={refetch}
						onDragSelect={onDragSelect}
						panelMode={panelMode}
						dashboardPreference={dashboardPreference}
						searchTerm={searchable ? searchTerm : undefined}
						pagination={pagination}
						onCloseStandaloneView={onCloseStandaloneView}
						onClick={onClick}
						enableDrillDown={enableDrillDown}
					/>
				</div>
			</div>
		</div>
	);
}

export default PreviewPane;
