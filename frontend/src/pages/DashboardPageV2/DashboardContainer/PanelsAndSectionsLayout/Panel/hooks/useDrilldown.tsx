import { useCallback, useMemo, useState } from 'react';
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
import { useDrilldownBreakout } from './useDrilldownBreakout';
import { useDrilldownFilter } from './useDrilldownFilter';
import { useViewPanel } from './useViewPanel';

/** Which menu the popover shows; extend the union as submenus are added (e.g. dashboard variables). */
type DrilldownSubMenu = 'base' | 'breakout';

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
 * Orchestrates panel drill-down: owns the popover + which submenu is open, and routes the clicked
 * point to the base aggregate menu, the group filter menu, or the breakout picker.
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

	// A fresh click and any close reset to the base menu.
	const [subMenu, setSubMenu] = useState<DrilldownSubMenu>('base');
	const openBreakout = useCallback((): void => setSubMenu('breakout'), []);
	const backToBase = useCallback((): void => setSubMenu('base'), []);

	const onPanelClick = useCallback(
		(payload: DrilldownClickPayload): void => {
			setSubMenu('base');
			onClick(payload.coordinates, payload.context);
		},
		[onClick],
	);

	const handleClose = useCallback((): void => {
		setSubMenu('base');
		onClose();
	}, [onClose]);

	const navigate = useBaseDrilldownNavigate({
		resolvedQuery: v1Query,
		aggregateData,
		callback: handleClose,
	});

	const { openViewWithQuery } = useViewPanel();

	const breakout = useDrilldownBreakout({
		panelId,
		v1Query,
		panelType,
		aggregateData,
		openViewWithQuery,
		onBack: backToBase,
		onClose: handleClose,
	});

	const filter = useDrilldownFilter({
		context,
		v1Query,
		panelId,
		panelType,
		openViewWithQuery,
		onClose: handleClose,
	});

	const items = useMemo<ReactNode>(() => {
		if (subMenu === 'breakout') {
			return breakout.items;
		}
		if (filter.items) {
			return filter.items;
		}
		if (!context) {
			return null;
		}
		return (
			<DrilldownAggregateMenu
				context={context}
				query={v1Query}
				links={panel.spec.links}
				onViewLogs={(): void => navigate('view_logs')}
				onViewTraces={(): void => navigate('view_traces')}
				onBreakout={openBreakout}
				onClose={handleClose}
			/>
		);
	}, [
		subMenu,
		breakout.items,
		filter.items,
		context,
		v1Query,
		panel.spec.links,
		navigate,
		openBreakout,
		handleClose,
	]);

	return {
		enableDrillDown,
		onPanelClick,
		contextMenuProps: {
			coordinates,
			popoverPosition,
			items,
			onClose: handleClose,
		},
	};
}
