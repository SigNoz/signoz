import { type ReactNode, useCallback, useMemo } from 'react';
import {
	Bell,
	Copy,
	FolderInput,
	Fullscreen,
	PenLine,
	Trash2,
} from '@signozhq/icons';
import type { MenuItem } from '@signozhq/ui/dropdown-menu';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import useComponentPermission from 'hooks/useComponentPermission';
import {
	type ConfirmableAction,
	useConfirmableAction,
} from 'hooks/useConfirmableAction';
import { getPanelDefinition } from 'pages/DashboardPageV2/DashboardContainer/Panels/registry';
import { useOpenPanelEditor } from 'pages/DashboardPageV2/DashboardContainer/hooks/useOpenPanelEditor';
import type { PanelQueryData } from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';
import { useDashboardStore } from 'pages/DashboardPageV2/DashboardContainer/store/useDashboardStore';
import { useAppContext } from 'providers/App/App';

import type { DashboardSection } from '../../../utils';
import type { PanelActionsConfig } from '../Panel';
import { useClonePanel } from '../hooks/useClonePanel';
import { useCreateAlertFromPanel } from '../hooks/useCreateAlertFromPanel';
import { useDeletePanel } from '../hooks/useDeletePanel';
import { useDownloadPanelMenuItem } from '../hooks/useDownloadPanelMenuItem';
import { useMovePanelToSection } from '../hooks/useMovePanelToSection';
import { useViewPanel } from '../hooks/useViewPanel';
import { buildMoveItems } from '../utils/buildMoveItems';
import { PANEL_ACTION_META } from './panelActionMeta';
import DisabledMenuItemLabel from '../../../components/DisabledMenuItemLabel/DisabledMenuItemLabel';
import { DASHBOARD_LOCKED_REASON } from '../../../hooks/useDashboardEditGuard';

// Stable fallback so renders without layout context don't churn the mutation
// hooks' deps (a fresh [] each render would re-create their callbacks).
const EMPTY_SECTIONS: DashboardSection[] = [];

interface UsePanelActionItemsArgs {
	panelId: string;
	/** The panel itself — seeds "Create Alerts" and the download filename. */
	panel: DashboardtypesPanelDTO;
	/** The panel's query response — the source for "Download as CSV". */
	data: PanelQueryData;
	/** Layout context for move/delete — absent outside editable mode. */
	panelActions?: PanelActionsConfig;
}

export interface PanelActionItems {
	items: MenuItem[];
	/** Two-step confirm flow for the destructive Delete action. */
	deleteConfirm: ConfirmableAction;
}

/**
 * Resolves the panel actions menu items. Each action passes three gates before
 * it appears: kind (PanelDefinition.actions), role (useComponentPermission) and
 * context (dashboard editable + layout config present). View and Download stay
 * available on read-only dashboards, as in V1.
 */
export function usePanelActionItems({
	panelId,
	panel,
	data,
	panelActions,
}: UsePanelActionItemsArgs): PanelActionItems {
	const panelKind = panel.spec.plugin.kind;
	const { user } = useAppContext();
	const [canEditWidget, canMove, canDelete] = useComponentPermission(
		[
			// edit_widget gates both Edit and Clone, exactly as in V1.
			PANEL_ACTION_META.edit.permission ?? 'edit_widget',
			PANEL_ACTION_META.move.permission ?? 'edit_dashboard',
			PANEL_ACTION_META.delete.permission ?? 'delete_widget',
		],
		user.role,
	);
	const canEditDashboard = useDashboardStore((s) => s.canEditDashboard);
	const isLocked = useDashboardStore((s) => s.isLocked);
	const openPanelEditor = useOpenPanelEditor();
	const createAlert = useCreateAlertFromPanel();
	const { openView } = useViewPanel();

	// Mutations are store-backed; the layout tree only supplies `sections`.
	const sections = panelActions?.sections ?? EMPTY_SECTIONS;
	const movePanel = useMovePanelToSection({ sections });
	const deletePanel = useDeletePanel({ sections });
	const clonePanel = useClonePanel({ sections });

	const panelCapabilities = getPanelDefinition(panelKind).actions;
	const downloadItem = useDownloadPanelMenuItem({
		panelId,
		panel,
		data,
		actions: panelCapabilities,
	});

	// Delete runs on confirm, not on click — the menu item opens a prompt.
	const deleteConfirm = useConfirmableAction(
		useCallback(async (): Promise<void> => {
			if (!panelActions) {
				return;
			}
			await deletePanel({
				panelId,
				layoutIndex: panelActions.currentLayoutIndex,
			});
		}, [deletePanel, panelActions, panelId]),
	);
	// Stable opener so the items memo doesn't rebuild on dialog state changes.
	const { request: requestDelete } = deleteConfirm;

	const items = useMemo<MenuItem[]>(() => {
		// Edit actions are shown only to edit-permitted users; the lock is their only
		// disabled state, surfaced as a hover tooltip on the row.
		const canEdit = canEditDashboard;
		const label = (text: string): ReactNode =>
			isLocked ? (
				<DisabledMenuItemLabel reason={DASHBOARD_LOCKED_REASON}>
					{text}
				</DisabledMenuItemLabel>
			) : (
				text
			);

		const panelGroup: MenuItem[] = [];
		if (panelCapabilities.view) {
			panelGroup.push({
				key: 'view-panel',
				label: 'View',
				icon: <Fullscreen size={14} />,
				onClick: (): void => openView(panelId),
			});
		}
		if (canEdit && canEditWidget && panelCapabilities.edit) {
			panelGroup.push({
				key: 'edit-panel',
				label: label('Edit panel'),
				icon: <PenLine size={14} />,
				disabled: isLocked,
				onClick: (): void => openPanelEditor(panelId),
			});
		}
		if (canEdit && canEditWidget && panelCapabilities.clone) {
			// Needs section context to place the copy; disabled without it.
			panelGroup.push({
				key: 'clone-panel',
				label: label('Clone'),
				icon: <Copy size={14} />,
				disabled: isLocked || !panelActions,
				onClick: (): void => {
					if (panelActions) {
						void clonePanel({
							panelId,
							layoutIndex: panelActions.currentLayoutIndex,
						});
					}
				},
			});
		}

		const dataGroup: MenuItem[] = [];
		if (downloadItem) {
			dataGroup.push(downloadItem);
		}

		// Create Alerts opens a new tab and never mutates the dashboard, so —
		// unlike edit/clone — it isn't gated on editability (V1 parity).
		if (panelCapabilities.createAlert) {
			dataGroup.push({
				key: 'create-alert',
				label: 'Create Alerts',
				icon: <Bell size={14} />,
				onClick: (): void => createAlert(panel, panelId),
			});
		}

		let moveGroup: MenuItem[] = [];
		if (canEdit && canMove) {
			moveGroup =
				!isLocked && panelActions
					? buildMoveItems({
							sections,
							currentLayoutIndex: panelActions.currentLayoutIndex,
							panelId,
							movePanel,
						})
					: [
							{
								key: 'move',
								label: label('Move to section'),
								icon: <FolderInput size={14} />,
								disabled: true,
							},
						];
		}

		const deleteGroup: MenuItem[] =
			canEdit && canDelete
				? [
						{
							key: 'delete-panel',
							danger: true,
							icon: <Trash2 size={14} />,
							label: label('Delete panel'),
							disabled: isLocked || !panelActions,
							onClick: (): void => requestDelete(),
						},
					]
				: [];

		return [panelGroup, dataGroup, moveGroup, deleteGroup]
			.filter((group) => group.length > 0)
			.flatMap((group, index) =>
				index === 0 ? group : [{ type: 'divider' as const }, ...group],
			);
	}, [
		canEditDashboard,
		isLocked,
		canEditWidget,
		canMove,
		canDelete,
		panelCapabilities,
		panel,
		panelActions,
		sections,
		panelId,
		downloadItem,
		openView,
		openPanelEditor,
		createAlert,
		movePanel,
		clonePanel,
		requestDelete,
	]);

	return { items, deleteConfirm };
}
