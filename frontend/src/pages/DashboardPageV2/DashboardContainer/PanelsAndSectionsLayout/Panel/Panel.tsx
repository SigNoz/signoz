import { useCallback, useMemo } from 'react';
// eslint-disable-next-line no-restricted-imports -- TODO: migrate global time dispatch off redux
import { useDispatch } from 'react-redux';
import { useLocation, useParams } from 'react-router-dom';
import { Spin } from 'antd';
import { Badge } from '@signozhq/ui/badge';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import { Typography } from '@signozhq/ui/typography';
import { EllipsisVertical, Loader } from '@signozhq/icons';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import cx from 'classnames';
import { QueryParams } from 'constants/query';
import { PanelMode } from 'container/DashboardContainer/visualization/panels/types';
import { getPanelDefinition } from 'pages/DashboardPageV2/DashboardContainer/Panels';
import type { DashboardPreference } from 'pages/DashboardPageV2/DashboardContainer/Panels/types';
import { usePanelQuery } from 'pages/DashboardPageV2/DashboardContainer/hooks/usePanelQuery';
import { useDashboardCursorSyncMode } from 'hooks/dashboard/useDashboardCursorSyncMode';
import { useSyncTooltipFilterMode } from 'hooks/dashboard/useSyncTooltipFilterMode';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import { UpdateTimeInterval } from 'store/actions';

import type { DashboardSection } from '../../utils';
import type { DeletePanelArgs } from './hooks/useDeletePanel';
import type { MovePanelArgs } from './hooks/useMovePanelToSection';
import PanelActionsMenu from './PanelActionsMenu/PanelActionsMenu';
import styles from './Panel.module.scss';

/** Panel action context — present together only in editable sectioned mode. */
export interface PanelActionsConfig {
	currentLayoutIndex: number;
	sections: DashboardSection[];
	onMovePanel: (args: MovePanelArgs) => void;
	onDeletePanel: (args: DeletePanelArgs) => void;
}

interface PanelProps {
	panel: DashboardtypesPanelDTO | undefined;
	panelId: string;
	/** True once this panel's section enters the viewport — gates the fetch. */
	isVisible?: boolean;
	/** Move/delete actions — present only in editable sectioned mode. */
	panelActions?: PanelActionsConfig;
}

function Panel({
	panel,
	panelId,
	isVisible,
	panelActions,
}: PanelProps): JSX.Element {
	const name = panel?.spec?.display?.name || `Panel ${panelId.slice(0, 6)}`;
	const description = panel?.spec?.display?.description;
	const fullKind = panel?.spec?.plugin?.kind;
	const kind = fullKind?.replace(/^signoz\//, '') ?? 'unknown';
	const queryCount = panel?.spec?.queries?.length ?? 0;

	const panelDef = getPanelDefinition(fullKind);

	const { data, isLoading, error } = usePanelQuery({
		panel,
		panelId,
		// Lazy: only fetch once the section is on screen (undefined → treat as
		// visible) and a renderer exists for the kind.
		enabled: !!panelDef && isVisible !== false,
	});

	const dispatch = useDispatch();
	const { pathname } = useLocation();
	const { safeNavigate } = useSafeNavigate();
	const urlQuery = useUrlQuery();

	// Dashboard-wide preferences propagated to the renderer (cursor sync,
	// tooltip filter), keyed off the dashboard id from the route.
	const { dashboardId } = useParams<{ dashboardId: string }>();
	const [syncMode] = useDashboardCursorSyncMode(
		dashboardId,
		PanelMode.DASHBOARD_VIEW,
	);
	const [syncFilterMode] = useSyncTooltipFilterMode(dashboardId);
	const dashboardPreference = useMemo<DashboardPreference>(
		() => ({ syncMode, syncFilterMode, dashboardId }),
		[syncMode, syncFilterMode, dashboardId],
	);

	/**
	 * Drag-select a time range on the chart → update the URL + global time so
	 * every panel re-fetches against the same window.
	 */
	const onDragSelect = useCallback(
		(start: number, end: number): void => {
			const startTimestamp = Math.trunc(start);
			const endTimestamp = Math.trunc(end);

			urlQuery.set(QueryParams.startTime, startTimestamp.toString());
			urlQuery.set(QueryParams.endTime, endTimestamp.toString());
			safeNavigate(`${pathname}?${urlQuery.toString()}`);

			if (startTimestamp !== endTimestamp) {
				dispatch(UpdateTimeInterval('custom', [startTimestamp, endTimestamp]));
			}
		},
		[dispatch, pathname, safeNavigate, urlQuery],
	);

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
			<div className={cx(styles.header, 'panel-drag-handle')}>
				<div className={styles.headerLeft}>
					<Typography.Text className={styles.headerTitle}>
						{headerTitle}
					</Typography.Text>
					<Badge className={styles.badge}>{kind}</Badge>
				</div>
				{panelActions ? (
					<PanelActionsMenu
						panelId={panelId}
						currentLayoutIndex={panelActions.currentLayoutIndex}
						sections={panelActions.sections}
						onMovePanel={panelActions.onMovePanel}
						onDeletePanel={panelActions.onDeletePanel}
					/>
				) : (
					<EllipsisVertical size={14} />
				)}
			</div>

			{/* eslint-disable-next-line no-nested-ternary -- 3-way branch on shell state */}
			{!panelDef ? (
				<div className={styles.body} data-testid="panel-unknown-kind-fallback">
					<div>
						<div className={styles.bodyKind}>{kind} panel</div>
						<div>
							{queryCount} {queryCount === 1 ? 'query' : 'queries'} · not yet
							supported in V2
						</div>
					</div>
				</div>
			) : isLoading && !data ? (
				// First-load only — background refetches keep `data` so the chart
				// stays mounted instead of blinking.
				<div className={styles.body} data-testid="panel-loading">
					<Spin indicator={<Loader size={14} className="animate-spin" />} />
				</div>
			) : (
				<div className={styles.chartBody}>
					<panelDef.Renderer
						panelId={panelId}
						panel={panel}
						data={data}
						isLoading={isLoading}
						error={error}
						onDragSelect={onDragSelect}
						panelMode={PanelMode.DASHBOARD_VIEW}
						enableDrillDown={false}
						dashboardPreference={dashboardPreference}
					/>
				</div>
			)}
		</div>
	);
}

export default Panel;
