import { useState } from 'react';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import ContextMenu from 'periscope/components/ContextMenu';
import { isPanelKindSupported } from 'pages/DashboardPage/DashboardContainer/Panels/registry';
import type { RenderableQueryPanelDefinition } from 'pages/DashboardPage/DashboardContainer/Panels/types/panelDefinition';
import {
	getPanelTimePreference,
	panelTimePreferenceLabel,
} from 'pages/DashboardPage/DashboardContainer/hooks/resolvePanelTimeWindow';
import { usePanelQuery } from 'pages/DashboardPage/DashboardContainer/hooks/usePanelQuery';

import type { PanelActionsConfig } from './Panel';
import { useDrilldown } from './hooks/useDrilldown';
import { usePanelInteractions } from './hooks/usePanelInteractions';
import PanelBody from './PanelBody/PanelBody';
import PanelHeader from './PanelHeader/PanelHeader';
import styles from './Panel.module.scss';

interface QueryPanelProps {
	panel: DashboardtypesPanelDTO;
	panelId: string;
	/** The kind's definition, narrowed to the query arm by `Panel`'s fork. */
	panelDefinition: RenderableQueryPanelDefinition;
	/** True once this panel enters the viewport — gates the fetch (owned by SectionGridItem). */
	isVisible?: boolean;
	/** Move/delete actions — present only in editable sectioned mode. */
	panelActions?: PanelActionsConfig;
}

/**
 * A query-backed dashboard panel (header + body). Thin orchestrator: fetching
 * lives in `usePanelQuery`, interactions in `usePanelInteractions`, state in
 * `PanelBody`.
 */
function QueryPanel({
	panel,
	panelId,
	panelDefinition,
	isVisible,
	panelActions,
}: QueryPanelProps): JSX.Element {
	const timeLabel = panelTimePreferenceLabel(getPanelTimePreference(panel));

	const panelKind = panel.spec.plugin.kind;

	// Header search: only kinds that declare it render the box. The term is owned
	// here and threaded to both the header (input) and renderer (filter).
	const searchable = panelDefinition.actions.search;
	const [searchTerm, setSearchTerm] = useState('');

	// Only an explicit false defers the fetch: `isVisible` is undefined wherever no
	// observer reports visibility (the View modal, the editor preview), and those panels
	// are on screen by construction.
	const isOffScreen = isVisible === false;

	const { data, isFetching, isPreviousData, error, refetch, pagination } =
		usePanelQuery({
			panel,
			panelId,
			queryCapabilities: panelDefinition.queryCapabilities,
			// Lazy: fetch once on screen, and never for a kind this build can't render —
			// the data would have nothing to render into.
			enabled: isPanelKindSupported(panelKind) && !isOffScreen,
		});

	const { onDragSelect, dashboardPreference } = usePanelInteractions();
	const drilldown = useDrilldown(panel, panelId);

	return (
		<div
			className={styles.panel}
			data-panel-visible={isOffScreen ? 'false' : 'true'}
			// Stable locator so the "Download as PNG" action can find this node to
			// capture, without threading a ref through the header/actions chain.
			data-panel-root={panelId}
		>
			<PanelHeader
				panelId={panelId}
				panel={panel}
				data={data}
				isFetching={isFetching}
				error={error}
				warning={data.response?.data?.warning}
				timeLabel={timeLabel}
				panelActions={panelActions}
				searchable={searchable}
				searchTerm={searchTerm}
				onSearchChange={setSearchTerm}
			/>
			<PanelBody
				Renderer={panelDefinition.Renderer}
				panel={panel}
				panelId={panelId}
				data={data}
				isFetching={isFetching}
				isVisible={isVisible}
				isPreviousData={isPreviousData}
				error={error}
				refetch={refetch}
				onDragSelect={onDragSelect}
				dashboardPreference={dashboardPreference}
				searchTerm={searchable ? searchTerm : undefined}
				pagination={pagination}
				onClick={drilldown.onPanelClick}
				enableDrillDown={drilldown.enableDrillDown}
			/>
			<ContextMenu {...drilldown.contextMenuProps} />
		</div>
	);
}

export default QueryPanel;
