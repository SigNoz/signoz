import { useMemo, useState } from 'react';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import type {
	DashboardtypesPanelDTO,
	DashboardtypesTimePreferenceDTO,
	DashboardtypesPanelPluginKindDTO as PanelKind,
} from 'api/generated/services/sigNoz.schemas';
import { getPanelDefinition } from 'pages/DashboardPageV2/DashboardContainer/Panels/registry';
import { panelTimePreferenceLabel } from 'pages/DashboardPageV2/DashboardContainer/hooks/resolvePanelTimeWindow';
import { usePanelQuery } from 'pages/DashboardPageV2/DashboardContainer/hooks/usePanelQuery';

import type { DashboardSection } from '../../utils';
import { usePanelInteractions } from './hooks/usePanelInteractions';
import PanelBody from './PanelBody/PanelBody';
import UnsupportedPanelBody from './PanelBody/UnsupportedPanelBody';
import PanelHeader from './PanelHeader/PanelHeader';
import styles from './Panel.module.scss';

/**
 * Layout context for the panel actions menu — pure data, present only in
 * editable mode. No callbacks: the menu resolves its own mutations from
 * store-backed hooks (useDeletePanel / useMovePanelToSection), and edit is
 * URL-driven (useOpenPanelEditor).
 */
export interface PanelActionsConfig {
	currentLayoutIndex: number;
	sections: DashboardSection[];
}

interface PanelProps {
	panel: DashboardtypesPanelDTO;
	panelId: string;
	/** True once this panel's section enters the viewport — gates the fetch. */
	isVisible?: boolean;
	/** Move/delete actions — present only in editable sectioned mode. */
	panelActions?: PanelActionsConfig;
}

/**
 * A single dashboard panel: chrome (header) + content (body). Thin orchestrator
 * — data fetching lives in `usePanelQuery`, cross-panel interactions in
 * `usePanelInteractions`, and the loading/error/chart state machine in
 * `PanelBody`.
 */
function Panel({
	panel,
	panelId,
	isVisible,
	panelActions,
}: PanelProps): JSX.Element {
	const name = panel.spec.display?.name;
	const description = panel.spec.display?.description;
	const fullKind = panel.spec.plugin?.kind as unknown as PanelKind;
	const kind = fullKind?.replace(/^signoz\//, '') ?? 'unknown';
	const queryCount = panel.spec.queries?.length ?? 0;

	// A per-panel relative time preference (anything other than global_time) is
	// surfaced as a pill in the header. `visualization` is common to every
	// plugin-spec variant — localized cast reads it without narrowing on kind.
	const timePreference = (
		panel.spec.plugin?.spec as
			| { visualization?: { timePreference?: DashboardtypesTimePreferenceDTO } }
			| undefined
	)?.visualization?.timePreference;
	const timeLabel = panelTimePreferenceLabel(timePreference);

	const panelDefinition = getPanelDefinition(fullKind);

	// Header search: only kinds that declare it (e.g. tables) render the box; the
	// term is owned here and threaded to both the header (input) and the renderer
	// (filter), the two being siblings under this orchestrator.
	const searchable = !!panelDefinition?.actions.search;
	const [searchTerm, setSearchTerm] = useState('');

	const { data, isLoading, isFetching, error, refetch, pagination } =
		usePanelQuery({
			panel,
			panelId,
			// Lazy: only fetch once the section is on screen (undefined → treat as
			// visible) and a renderer exists for the kind.
			enabled: !!panelDefinition && isVisible !== false,
		});

	const { onDragSelect, dashboardPreference } = usePanelInteractions();

	const headerTitle = useMemo(() => {
		if (!description) {
			return name;
		}
		return (
			<TooltipSimple title={description}>
				<span>{name}</span>
			</TooltipSimple>
		);
	}, [name, description]);

	return (
		<div
			className={styles.panel}
			data-panel-visible={isVisible ? 'true' : 'false'}
		>
			<PanelHeader
				title={headerTitle}
				panelId={panelId}
				panelKind={fullKind}
				isFetching={isFetching}
				error={error}
				warning={data.response?.data?.warning}
				timeLabel={timeLabel}
				panelActions={panelActions}
				searchable={searchable}
				searchTerm={searchTerm}
				onSearchChange={setSearchTerm}
			/>
			{panelDefinition ? (
				<PanelBody
					panelDefinition={panelDefinition}
					panel={panel}
					panelId={panelId}
					data={data}
					isLoading={isLoading}
					error={error}
					refetch={refetch}
					onDragSelect={onDragSelect}
					dashboardPreference={dashboardPreference}
					searchTerm={searchable ? searchTerm : undefined}
					pagination={pagination}
				/>
			) : (
				// TODO: remove this after all panel kinds are supported
				<UnsupportedPanelBody kind={kind} queryCount={queryCount} />
			)}
		</div>
	);
}

export default Panel;
