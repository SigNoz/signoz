import { useCallback, useMemo } from 'react';
// eslint-disable-next-line no-restricted-imports -- TODO: migrate global time dispatch off redux
import { useDispatch } from 'react-redux';
import { useLocation, useParams } from 'react-router-dom';
import { Tooltip, Spin } from 'antd';
import { Badge } from '@signozhq/ui/badge';
import { Typography } from '@signozhq/ui/typography';
import { PenLine, Loader } from '@signozhq/icons';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { QueryParams } from 'constants/query';
import { PanelMode } from 'container/DashboardContainer/visualization/panels/types';
import { getPanelDefinition } from 'container/DashboardContainerV2/Panels';
import type { DashboardPreference } from 'container/DashboardContainerV2/Panels/types';
import { usePanelQuery } from 'container/DashboardContainerV2/hooks/usePanelQuery';
import { useDashboardCursorSyncMode } from 'hooks/dashboard/useDashboardCursorSyncMode';
import { useSyncTooltipFilterMode } from 'hooks/dashboard/useSyncTooltipFilterMode';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import { UpdateTimeInterval } from 'store/actions';

interface Props {
	panel: DashboardtypesPanelDTO | undefined;
	panelId: string;
}

function PanelV2({ panel, panelId }: Props): JSX.Element {
	const name = panel?.spec?.display?.name || `Panel ${panelId.slice(0, 6)}`;
	const description = panel?.spec?.display?.description;
	const fullKind = panel?.spec?.plugin?.kind;
	const kind = fullKind?.replace(/^signoz\//, '') ?? 'unknown';
	const queryCount = panel?.spec?.queries?.length ?? 0;

	const panelDef = getPanelDefinition(fullKind);

	const { data, isLoading, error } = usePanelQuery({
		panel,
		panelId,
		enabled: !!panelDef,
	});

	const dispatch = useDispatch();
	const { pathname } = useLocation();
	const { safeNavigate } = useSafeNavigate();
	const urlQuery = useUrlQuery();

	// Dashboard-wide preferences propagated to every panel renderer on this
	// dashboard. The hooks key off the dashboard id from the route param so
	// preferences (cursor sync, tooltip filter) persist per-dashboard.
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
	 * Handler for drag-selecting a time range on the chart. Updates the URL + global
	 * time interval so every panel re-fetches against the same window.
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

	/**
	 * Opens the V2 panel editor overlay by setting the `editPanelId` query param
	 * on the current dashboard URL (the dashboard stays mounted underneath).
	 * Stops propagation so the click on the drag-handle row doesn't start a grid
	 * drag.
	 */
	const onEdit = useCallback(
		(e: React.MouseEvent): void => {
			e.stopPropagation();
			urlQuery.set(QueryParams.editPanelId, panelId);
			safeNavigate(`${pathname}?${urlQuery.toString()}`);
		},
		[urlQuery, safeNavigate, pathname, panelId],
	);

	const headerTitle = useMemo(() => {
		if (!description) {
			return name;
		}
		return (
			<Tooltip title={description}>
				<span>{name}</span>
			</Tooltip>
		);
	}, [name, description]);

	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				height: '100%',
				width: '100%',
				background: 'var(--bg-ink-400, #0b0c0e)',
				border: '1px solid var(--bg-slate-400, #1d212d)',
				borderRadius: 4,
				overflow: 'hidden',
			}}
		>
			<div
				className="drag-handle"
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					padding: '8px 12px',
					borderBottom: '1px solid var(--bg-slate-400, #1d212d)',
					cursor: 'grab',
				}}
			>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 8,
						minWidth: 0,
					}}
				>
					<Typography.Text
						style={{
							margin: 0,
							whiteSpace: 'nowrap',
							overflow: 'hidden',
							textOverflow: 'ellipsis',
						}}
					>
						{headerTitle}
					</Typography.Text>
					<Badge style={{ marginInlineEnd: 0 }}>{kind}</Badge>
				</div>
				<button
					type="button"
					data-testid="panel-v2-edit"
					aria-label="Edit panel"
					onClick={onEdit}
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						padding: 4,
						background: 'none',
						border: 'none',
						cursor: 'pointer',
						color: 'inherit',
					}}
				>
					<PenLine size={14} />
				</button>
			</div>

			<div
				style={{
					flex: 1,
					display: 'flex',
					minHeight: 0,
				}}
			>
				{/* eslint-disable-next-line no-nested-ternary -- 3-way branch on shell state */}
				{!panelDef ? (
					<div
						data-testid="panel-v2-unknown-kind-fallback"
						style={{
							flex: 1,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							padding: 12,
							color: 'var(--bg-vanilla-400, #8993ae)',
							fontSize: 12,
							textAlign: 'center',
						}}
					>
						<div>
							<div style={{ marginBottom: 6 }}>{kind} panel</div>
							<div>
								{queryCount} {queryCount === 1 ? 'query' : 'queries'} · not yet
								supported in V2
							</div>
						</div>
					</div>
				) : isLoading && !data ? (
					// First-load only. During background refetches `data` is still
					// populated, so the chart stays mounted and the user sees fresh
					// data swap in without the panel blinking.
					<div
						data-testid="panel-v2-loading"
						style={{
							flex: 1,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							padding: 12,
						}}
					>
						<Spin indicator={<Loader size={14} className="animate-spin" />} />
					</div>
				) : (
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
				)}
			</div>
		</div>
	);
}

export default PanelV2;
