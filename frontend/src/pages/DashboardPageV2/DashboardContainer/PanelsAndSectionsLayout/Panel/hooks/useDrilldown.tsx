import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import type { FilterData } from 'container/QueryTable/Drilldown/drilldownUtils';
import useBaseDrilldownNavigate from 'container/QueryTable/Drilldown/useBaseDrilldownNavigate';
import type {
	Coordinates,
	PopoverPosition,
} from 'periscope/components/ContextMenu';
import type {
	DrilldownClickPayload,
	DrilldownContext,
	OpenDrilldownView,
} from 'pages/DashboardPageV2/DashboardContainer/Panels/types/drilldown';
import { PANEL_KIND_TO_PANEL_TYPE } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelKind';
import { getPanelDefinition } from 'pages/DashboardPageV2/DashboardContainer/Panels/registry';
import { buildAggregateData } from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/drilldown/buildAggregateData';
import { getBuilderQueries } from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/getBuilderQueries';
import { getPanelQueryType } from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/getPanelQueryType';
import { fromPerses } from 'pages/DashboardPageV2/DashboardContainer/queryV5/persesQueryAdapters';
import { EQueryType } from 'types/common/dashboard';

import DrilldownAggregateMenu from '../DrilldownMenu/DrilldownAggregateMenu';
import DrilldownBreakoutMenu from '../DrilldownMenu/DrilldownBreakoutMenu';
import DrilldownDashboardVariablesMenu from '../DrilldownMenu/DrilldownDashboardVariablesMenu';
import DrilldownFilterMenu from '../DrilldownMenu/DrilldownFilterMenu';
import { useDrilldownBreakout } from './useDrilldownBreakout';
import { useDrilldownCoordinates } from './useDrilldownCoordinates';
import { useDrilldownDashboardVariables } from './useDrilldownDashboardVariables';
import { useDrilldownFilter } from './useDrilldownFilter';
import { useResolvedDrilldownQuery } from './useResolvedDrilldownQuery';
import { useViewPanel } from './useViewPanel';

/** Which menu the popover shows; extend as submenus are added (e.g. dashboard variables). */
enum DrilldownSubMenu {
	Base = 'base',
	Breakout = 'breakout',
	DashboardVariables = 'dashboardVariables',
}

/** Stable empty-filters ref so the dashboard-variables hook doesn't re-run on every no-click render. */
const EMPTY_FILTERS: FilterData[] = [];

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

export interface UseDrilldownOptions {
	/**
	 * How filter-by-value / breakout hand off the refined query. Defaults to navigating to the View
	 * modal (grid); the View modal passes its own handler so those actions refine the view in place.
	 */
	openDrilldownView?: OpenDrilldownView;
}

/**
 * Orchestrates panel drill-down: owns the popover + which submenu is open, and routes the clicked
 * point to the base aggregate menu (View in Logs/Traces), the group filter menu, or the breakout picker.
 */
export function useDrilldown(
	panel: DashboardtypesPanelDTO,
	panelId: string,
	options?: UseDrilldownOptions,
): UseDrilldownResult {
	const kind = panel.spec.plugin.kind;
	const panelType = PANEL_KIND_TO_PANEL_TYPE[kind];
	const queries = panel.spec.queries;

	// Drilldown only for builder-authored panels with a query to drill into (PromQL /
	// ClickHouse have no builder context to refine).
	const enableDrillDown = useMemo(
		() =>
			getPanelDefinition(kind).actions.drilldown &&
			getPanelQueryType(panel) === EQueryType.QUERY_BUILDER &&
			getBuilderQueries(queries).length > 0,
		[kind, panel, queries],
	);

	const v1Query = useMemo(
		() => fromPerses(queries, panelType),
		[queries, panelType],
	);

	const {
		coordinates,
		popoverPosition,
		clickedData: context,
		onClick,
		onClose,
	} = useDrilldownCoordinates<DrilldownContext>();

	const aggregateData = useMemo(
		() => (context ? buildAggregateData(context) : null),
		[context],
	);

	// A fresh click and any close reset to the base menu.
	const [subMenu, setSubMenu] = useState<DrilldownSubMenu>(
		DrilldownSubMenu.Base,
	);
	const openBreakout = useCallback(
		(): void => setSubMenu(DrilldownSubMenu.Breakout),
		[],
	);
	const backToBase = useCallback(
		(): void => setSubMenu(DrilldownSubMenu.Base),
		[],
	);
	const openDashboardVariables = useCallback(
		(): void => setSubMenu(DrilldownSubMenu.DashboardVariables),
		[],
	);

	const onPanelClick = useCallback(
		(payload: DrilldownClickPayload): void => {
			setSubMenu(DrilldownSubMenu.Base);
			onClick(payload.coordinates, payload.context);
		},
		[onClick],
	);

	const handleClose = useCallback((): void => {
		setSubMenu(DrilldownSubMenu.Base);
		onClose();
	}, [onClose]);

	// Default handoff navigates to the View modal (grid); the modal overrides this to refine in place.
	const { openViewWithQuery: navigateToView } = useViewPanel();
	const openViewWithQuery = options?.openDrilldownView ?? navigateToView;

	const breakout = useDrilldownBreakout({
		panelId,
		v1Query,
		panelType,
		aggregateData,
		openViewWithQuery,
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

	const dashboardVariables = useDrilldownDashboardVariables({
		filters: context?.filters ?? EMPTY_FILTERS,
		signal: context?.signal,
		onClose: handleClose,
	});

	// The aggregate menu (View in Logs/Traces) shows for a non-group click on the base menu; the
	// group click routes to filter-by-value instead. Only that menu resolves variables —
	// filter/breakout open the View modal, which resolves at query-run time.
	const showAggregateMenu =
		subMenu === DrilldownSubMenu.Base && !!context && !filter.isGroupColumnClick;

	const { resolvedQuery, isResolving } = useResolvedDrilldownQuery({
		queries,
		panelType,
		v1Query,
		enabled: showAggregateMenu,
	});

	const navigate = useBaseDrilldownNavigate({
		resolvedQuery,
		aggregateData,
		callback: handleClose,
	});

	const items = useMemo<ReactNode>(() => {
		if (subMenu === DrilldownSubMenu.Breakout) {
			return breakout.queryData ? (
				<DrilldownBreakoutMenu
					queryData={breakout.queryData}
					onBreakout={breakout.onBreakout}
					onBack={backToBase}
				/>
			) : null;
		}
		if (subMenu === DrilldownSubMenu.DashboardVariables) {
			return (
				<DrilldownDashboardVariablesMenu
					actions={dashboardVariables.actions}
					onBack={backToBase}
				/>
			);
		}
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
				links={panel.spec.links}
				canSetDashboardVariables={dashboardVariables.hasFieldVariables}
				onViewLogs={(): void => navigate('view_logs')}
				onViewTraces={(): void => navigate('view_traces')}
				onBreakout={openBreakout}
				onSetDashboardVariables={openDashboardVariables}
				onClose={handleClose}
			/>
		);
	}, [
		subMenu,
		breakout.queryData,
		breakout.onBreakout,
		dashboardVariables.actions,
		dashboardVariables.hasFieldVariables,
		filter.isGroupColumnClick,
		filter.onFilter,
		context,
		v1Query,
		isResolving,
		panel.spec.links,
		navigate,
		openBreakout,
		openDashboardVariables,
		backToBase,
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
