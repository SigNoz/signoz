import { useState } from 'react';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import cx from 'classnames';
import { PanelMode } from 'lib/visualization/panels/types';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import PanelBody from 'pages/DashboardPage/DashboardContainer/PanelsAndSectionsLayout/Panel/PanelBody/PanelBody';
import PanelHeader from 'pages/DashboardPage/DashboardContainer/PanelsAndSectionsLayout/Panel/PanelHeader/PanelHeader';
import StaticPanelBody from 'pages/DashboardPage/DashboardContainer/PanelsAndSectionsLayout/Panel/StaticPanelBody/StaticPanelBody';
import { useTextBackground } from 'pages/DashboardPage/DashboardContainer/Panels/hooks/useTextBackground';
import type { AnyPanelInteractionProps } from 'pages/DashboardPage/DashboardContainer/Panels/types/interactions';
import type {
	RenderableQueryPanelDefinition,
	RenderableStaticPanelDefinition,
} from 'pages/DashboardPage/DashboardContainer/Panels/types/panelDefinition';
import type { DashboardPreference } from 'pages/DashboardPage/DashboardContainer/Panels/types/rendererProps';
import { getPanelQueryType } from 'pages/DashboardPage/DashboardContainer/Panels/utils/getPanelQueryType';
import { isPanelHeaderHidden } from 'pages/DashboardPage/DashboardContainer/Panels/utils/isPanelHeaderHidden';
import type {
	PanelPagination,
	PanelQueryData,
} from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import PlotTag from './PlotTag';
import styles from './PreviewPane.module.scss';

interface PreviewPaneBaseProps {
	panelId: string;
	panel: DashboardtypesPanelDTO;
	/** Render context — defaults to the editor's DASHBOARD_EDIT; the View modal passes STANDALONE_VIEW. */
	panelMode?: PanelMode;
}

interface QueryPreviewPaneProps extends PreviewPaneBaseProps {
	mode: 'query';
	/** The kind's definition, narrowed to the query arm — this preview is the query render path. */
	panelDefinition: RenderableQueryPanelDefinition;
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

interface StaticPreviewPaneProps extends PreviewPaneBaseProps {
	mode: 'static';
	/** The kind's definition, narrowed to the static arm — no query, no Run step. */
	panelDefinition: RenderableStaticPanelDefinition;
	/** Saves an edit made from the rendered body into the draft; absent = read-only. */
	onChangeText?: (text: string) => void;
}

type PreviewPaneProps = QueryPreviewPaneProps | StaticPreviewPaneProps;

/**
 * Live preview for the panel editor and the View modal: the draft rendered through
 * the same body the dashboard grid uses (only `panelMode` differs), so the preview
 * is the production render path. A query draft's result is owned by the editor
 * root; a static draft re-renders straight from the spec on every edit.
 */
function PreviewPane(props: PreviewPaneProps): JSX.Element {
	const { panelId, panel, panelMode = PanelMode.DASHBOARD_EDIT } = props;
	const query = props.mode === 'query' ? props : null;
	const staticDraft = props.mode === 'static' ? props : null;
	const background = useTextBackground(panel.spec);

	// Search term is ephemeral preview state, threaded to header + renderer but
	// not persisted to the draft spec. Only kinds that declare it render the box.
	const searchable = !!query?.panelDefinition.actions.search;
	const [searchTerm, setSearchTerm] = useState('');

	return (
		<div
			className={cx(styles.preview, { [styles.previewStatic]: !!staticDraft })}
		>
			{query && !query.hideHeader && (
				<div className={styles.header}>
					<PlotTag
						queryType={getPanelQueryType(panel)}
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
						[styles.surfaceStacked]:
							!!query && panelMode === PanelMode.STANDALONE_VIEW,
						[styles.surfaceStatic]: !!staticDraft,
					})}
					style={background.style}
				>
					{query ? (
						<>
							<PanelHeader
								mode="query"
								panelId={panelId}
								panel={panel}
								data={query.data}
								isFetching={query.isFetching}
								error={query.error}
								warning={query.data.response?.data?.warning}
								searchable={searchable}
								searchTerm={searchTerm}
								onSearchChange={setSearchTerm}
								hideActions
							/>
							<PanelBody
								Renderer={query.panelDefinition.Renderer}
								panel={panel}
								panelId={panelId}
								data={query.data}
								isFetching={query.isFetching}
								isPreviousData={query.isPreviousData}
								error={query.error}
								refetch={query.refetch}
								onDragSelect={query.onDragSelect}
								panelMode={panelMode}
								dashboardPreference={query.dashboardPreference}
								searchTerm={searchable ? searchTerm : undefined}
								pagination={query.pagination}
								onCloseStandaloneView={query.onCloseStandaloneView}
								onClick={query.onClick}
								enableDrillDown={query.enableDrillDown}
							/>
						</>
					) : (
						staticDraft && (
							<>
								{!isPanelHeaderHidden(panel.spec) && (
									<PanelHeader
										mode="static"
										panelId={panelId}
										panel={panel}
										hideActions
									/>
								)}
								<StaticPanelBody
									Renderer={staticDraft.panelDefinition.Renderer}
									panel={panel}
									panelId={panelId}
									panelMode={panelMode}
									onChangeText={staticDraft.onChangeText}
								/>
							</>
						)
					)}
				</div>
			</div>
		</div>
	);
}

export default PreviewPane;
