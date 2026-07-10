import { useState } from 'react';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import ContextMenu from 'periscope/components/ContextMenu';
import { getPanelDefinition } from 'pages/DashboardPageV2/DashboardContainer/Panels/registry';
import {
	getPanelTimePreference,
	panelTimePreferenceLabel,
} from 'pages/DashboardPageV2/DashboardContainer/hooks/resolvePanelTimeWindow';
import { usePanelQuery } from 'pages/DashboardPageV2/DashboardContainer/hooks/usePanelQuery';

import type { DashboardSection } from '../../utils';
import { useDrilldown } from './hooks/useDrilldown';
import { usePanelInteractions } from './hooks/usePanelInteractions';
import PanelBody from './PanelBody/PanelBody';
import PanelHeader from './PanelHeader/PanelHeader';
import styles from './Panel.module.scss';

/**
 * Layout context for the panel actions menu — present only in editable mode. No
 * callbacks: the menu resolves its own mutations from store-backed hooks.
 */
export interface PanelActionsConfig {
	currentLayoutIndex: number;
	sections: DashboardSection[];
}

interface PanelProps {
	panel: DashboardtypesPanelDTO;
	panelId: string;
	/** True once this panel enters the viewport — gates the fetch (owned by SectionGridItem). */
	isVisible?: boolean;
	/** Move/delete actions — present only in editable sectioned mode. */
	panelActions?: PanelActionsConfig;
}

/**
 * A single dashboard panel (header + body). Thin orchestrator: fetching lives in
 * `usePanelQuery`, interactions in `usePanelInteractions`, state in `PanelBody`.
 */
function Panel({
	panel,
	panelId,
	isVisible,
	panelActions,
}: PanelProps): JSX.Element {
	const timeLabel = panelTimePreferenceLabel(getPanelTimePreference(panel));

	const panelKind = panel.spec.plugin.kind;
	const panelDefinition = getPanelDefinition(panelKind);

	// Header search: only kinds that declare it render the box. The term is owned
	// here and threaded to both the header (input) and renderer (filter).
	const searchable = !!panelDefinition?.actions.search;
	const [searchTerm, setSearchTerm] = useState('');

	const { data, isFetching, isPreviousData, error, refetch, pagination } =
		usePanelQuery({
			panel,
			panelId,
			// Lazy: fetch only once on screen (undefined → visible) and a renderer exists.
			enabled: !!panelDefinition && isVisible !== false,
		});

	const { onDragSelect, dashboardPreference } = usePanelInteractions();
	const drilldown = useDrilldown(panel, panelId);

	return (
		<div
			className={styles.panel}
			data-panel-visible={isVisible ? 'true' : 'false'}
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
			{panelDefinition && (
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
					dashboardPreference={dashboardPreference}
					searchTerm={searchable ? searchTerm : undefined}
					pagination={pagination}
					onClick={drilldown.onPanelClick}
					enableDrillDown={drilldown.enableDrillDown}
				/>
			)}
			<ContextMenu {...drilldown.contextMenuProps} />
		</div>
	);
}

export default Panel;
