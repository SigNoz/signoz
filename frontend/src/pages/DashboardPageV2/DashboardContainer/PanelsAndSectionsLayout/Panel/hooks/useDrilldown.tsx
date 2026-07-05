import { useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import useBaseDrilldownNavigate from 'container/QueryTable/Drilldown/useBaseDrilldownNavigate';
import { useCoordinates } from 'periscope/components/ContextMenu';
import type {
	Coordinates,
	PopoverPosition,
} from 'periscope/components/ContextMenu';
import type {
	DrilldownClickPayload,
	DrilldownContext,
} from 'pages/DashboardPageV2/DashboardContainer/Panels/types/drilldown';
import {
	PANEL_KIND_TO_PANEL_TYPE,
	type PanelKind,
} from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelKind';
import { getPanelDefinition } from 'pages/DashboardPageV2/DashboardContainer/Panels/registry';
import { buildAggregateData } from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/drilldown/buildAggregateData';
import { getBuilderQueries } from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/getBuilderQueries';
import { fromPerses } from 'pages/DashboardPageV2/DashboardContainer/queryV5/persesQueryAdapters';

import DrilldownAggregateMenu from '../DrilldownMenu/DrilldownAggregateMenu';
import DrilldownFilterMenu from '../DrilldownMenu/DrilldownFilterMenu';
import { useDrilldownFilter } from './useDrilldownFilter';
import { useResolvedDrilldownQuery } from './useResolvedDrilldownQuery';
import { useViewPanel } from './useViewPanel';

/** Props the panel shell spreads onto `<ContextMenu>`. */
export interface DrilldownContextMenuProps {
	coordinates: Coordinates | null;
	popoverPosition: PopoverPosition | null;
	items: ReactNode;
	onClose: () => void;
}

export interface UseDrilldownResult {
	/** Whether interactive renderers should arm the drill-down click. */
	enableDrillDown: boolean;
	/** Renderer `onClick` handler — opens the menu at the clicked point. */
	onPanelClick: (payload: DrilldownClickPayload) => void;
	contextMenuProps: DrilldownContextMenuProps;
}

/**
 * Orchestrates panel drill-down: owns the popover and routes the clicked point to the base
 * aggregate menu (View in Logs/Traces) or the group filter-by-value menu.
 */
export function useDrilldown(
	panel: DashboardtypesPanelDTO,
	panelId: string,
): UseDrilldownResult {
	const kind = panel.spec.plugin.kind as PanelKind;
	const panelType = PANEL_KIND_TO_PANEL_TYPE[kind];
	// Stable ref so the conversions below don't re-run every render (the `?? []` fallback would
	// otherwise be a fresh array each time).
	const queries = useMemo(() => panel.spec.queries ?? [], [panel.spec.queries]);

	// Kind must opt in via its capability AND have a builder query to drill into.
	const enableDrillDown = useMemo(
		() =>
			getPanelDefinition(kind).actions.drilldown &&
			getBuilderQueries(queries).length > 0,
		[kind, queries],
	);

	const v1Query = useMemo(
		() => fromPerses(queries, panelType),
		[queries, panelType],
	);

	const { coordinates, popoverPosition, clickedData, onClick, onClose } =
		useCoordinates();
	const context = clickedData as DrilldownContext | null;

	const aggregateData = useMemo(
		() => (context ? buildAggregateData(context) : null),
		[context],
	);

	const { openViewWithQuery } = useViewPanel();

	const filter = useDrilldownFilter({
		context,
		v1Query,
		panelId,
		panelType,
		openViewWithQuery,
		onClose,
	});

	// The aggregate menu (View in Logs/Traces) shows for a non-group click; the group click
	// routes to filter-by-value instead. Only that menu resolves variables — filter/breakout
	// open the View modal, which resolves at query-run time.
	const showAggregateMenu = !!context && !filter.isGroupColumnClick;

	const { resolvedQuery, isResolving } = useResolvedDrilldownQuery({
		queries,
		panelType,
		v1Query,
		enabled: showAggregateMenu,
	});

	const navigate = useBaseDrilldownNavigate({
		resolvedQuery,
		aggregateData,
		callback: onClose,
	});

	const items = useMemo<ReactNode>(() => {
		if (filter.isGroupColumnClick && context?.clickedKey) {
			return (
				<DrilldownFilterMenu
					v1Query={v1Query}
					clickedKey={context.clickedKey}
					onFilter={filter.onFilter}
				/>
			);
		}
		if (!context) {
			return null;
		}
		return (
			<DrilldownAggregateMenu
				context={context}
				query={v1Query}
				isResolving={isResolving}
				onViewLogs={(): void => navigate('view_logs')}
				onViewTraces={(): void => navigate('view_traces')}
			/>
		);
	}, [
		filter.isGroupColumnClick,
		filter.onFilter,
		context,
		v1Query,
		isResolving,
		navigate,
	]);

	const onPanelClick = useCallback(
		(payload: DrilldownClickPayload): void =>
			onClick(payload.coordinates, payload.context),
		[onClick],
	);

	return {
		enableDrillDown,
		onPanelClick,
		contextMenuProps: { coordinates, popoverPosition, items, onClose },
	};
}
