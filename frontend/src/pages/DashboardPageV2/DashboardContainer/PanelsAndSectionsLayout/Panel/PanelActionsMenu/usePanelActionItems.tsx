import { useCallback, useMemo } from 'react';
import {
	Bell,
	CloudDownload,
	Copy,
	FolderInput,
	FolderOutput,
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
import { useDashboardStore } from 'pages/DashboardPageV2/DashboardContainer/store/useDashboardStore';
import { useAppContext } from 'providers/App/App';

import type { DashboardSection } from '../../../utils';
import type { PanelActionsConfig } from '../Panel';
import { useClonePanel } from '../hooks/useClonePanel';
import { useCreateAlertFromPanel } from '../hooks/useCreateAlertFromPanel';
import { useDeletePanel } from '../hooks/useDeletePanel';
import {
	type MovePanelArgs,
	useMovePanelToSection,
} from '../hooks/useMovePanelToSection';
import { PANEL_ACTION_META } from './panelActionMeta';

// Stable fallback so renders without layout context don't churn the mutation
// hooks' deps (a fresh [] each render would re-create their callbacks).
const EMPTY_SECTIONS: DashboardSection[] = [];

/** Placeholder for V1-parity actions whose V2 implementations land later. */
function notImplementedYet(feature: string): void {
	// eslint-disable-next-line no-alert -- temporary placeholder, see above
	alert(`${feature} option clicked`);
}

interface MoveItemsArgs {
	sections: DashboardSection[];
	currentLayoutIndex: number;
	panelId: string;
	movePanel: (args: MovePanelArgs) => Promise<void>;
}

/**
 * The "Move to section" submenu (other titled sections) plus a direct "Move out
 * of section" to the untitled root, shown only when the panel sits in a titled
 * section and a root section exists to receive it.
 */
function buildMoveItems({
	sections,
	currentLayoutIndex,
	panelId,
	movePanel,
}: MoveItemsArgs): MenuItem[] {
	const targets = sections.filter(
		(s) => s.title && s.layoutIndex !== currentLayoutIndex,
	);
	const items: MenuItem[] = [
		{
			key: 'move',
			label: 'Move to section',
			icon: <FolderInput size={14} />,
			...(targets.length === 0
				? { disabled: true }
				: {
						children: targets.map((s) => ({
							key: `move-${s.layoutIndex}`,
							label: s.title,
							onClick: (): void =>
								void movePanel({
									panelId,
									fromLayoutIndex: currentLayoutIndex,
									toLayoutIndex: s.layoutIndex,
								}),
						})),
					}),
		},
	];

	const rootSection = sections.find((s) => !s.title);
	if (rootSection && rootSection.layoutIndex !== currentLayoutIndex) {
		items.push({
			key: 'move-to-root',
			label: 'Move out of section',
			icon: <FolderOutput size={14} />,
			onClick: (): void =>
				void movePanel({
					panelId,
					fromLayoutIndex: currentLayoutIndex,
					toLayoutIndex: rootSection.layoutIndex,
				}),
		});
	}
	return items;
}

interface UsePanelActionItemsArgs {
	panelId: string;
	/** The panel itself — its query seeds the "Create Alerts" action. */
	panel: DashboardtypesPanelDTO;
	/** Layout context for move/delete — absent outside editable mode. */
	panelActions?: PanelActionsConfig;
}

export interface PanelActionItems {
	items: MenuItem[];
	/** Two-step confirm flow for the destructive Delete action. */
	deleteConfirm: ConfirmableAction;
}

/**
 * Resolves the panel actions menu items (V1 WidgetHeader set plus V2's "Move to
 * section"). Every action passes three gates before it appears:
 *
 *   kind — what the panel kind declares it supports (PanelDefinition.actions);
 *          unknown kinds support no kind-gated actions.
 *   role — componentPermission lookup for the current user (PANEL_ACTION_META;
 *          actions without a permission key are open to every role, V1 parity).
 *   context — runtime state: dashboard editable (store), layout config present.
 *          View and Download remain available on read-only dashboards, as in V1.
 */
export function usePanelActionItems({
	panelId,
	panel,
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
	const isEditable = useDashboardStore((s) => s.isEditable);
	const openPanelEditor = useOpenPanelEditor();
	const createAlert = useCreateAlertFromPanel();

	// Mutations are store-backed (dashboardId/refetch) — the layout tree only
	// supplies data (`sections`), so no callbacks are threaded through it.
	const sections = panelActions?.sections ?? EMPTY_SECTIONS;
	const movePanel = useMovePanelToSection({ sections });
	const deletePanel = useDeletePanel({ sections });
	const clonePanel = useClonePanel({ sections });

	const panelCapabilities = getPanelDefinition(panelKind).actions;

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
		const panelGroup: MenuItem[] = [];
		if (panelCapabilities.view) {
			panelGroup.push({
				key: 'view-panel',
				label: 'View',
				icon: <Fullscreen size={14} />,
				onClick: (): void => notImplementedYet('View'),
			});
		}
		if (isEditable && canEditWidget && panelCapabilities.edit) {
			panelGroup.push({
				key: 'edit-panel',
				label: 'Edit panel',
				icon: <PenLine size={14} />,
				onClick: (): void => openPanelEditor(panelId),
			});
		}
		// Clone needs the section context (source spec + dimensions) to place the
		// copy, so — unlike Edit — it requires panelActions.
		if (isEditable && canEditWidget && panelActions && panelCapabilities.clone) {
			panelGroup.push({
				key: 'clone-panel',
				label: 'Clone',
				icon: <Copy size={14} />,
				onClick: (): void =>
					void clonePanel({
						panelId,
						layoutIndex: panelActions.currentLayoutIndex,
					}),
			});
		}

		const dataGroup: MenuItem[] = [];
		if (panelCapabilities.download) {
			dataGroup.push({
				key: 'download-panel',
				label: 'Download as CSV',
				icon: <CloudDownload size={14} />,
				onClick: (): void => notImplementedYet('Download'),
			});
		}
		// Seeding an alert opens a new tab and never mutates the dashboard, so —
		// unlike edit/clone — it isn't gated on `isEditable` (V1 parity: available
		// on locked dashboards too).
		if (panelCapabilities.createAlert) {
			dataGroup.push({
				key: 'create-alert',
				label: 'Create Alerts',
				icon: <Bell size={14} />,
				onClick: (): void => createAlert(panel, panelId),
			});
		}

		const moveGroup: MenuItem[] =
			canMove && panelActions
				? buildMoveItems({
						sections,
						currentLayoutIndex: panelActions.currentLayoutIndex,
						panelId,
						movePanel,
					})
				: [];

		const deleteGroup: MenuItem[] =
			canDelete && panelActions
				? [
						{
							key: 'delete-panel',
							danger: true,
							icon: <Trash2 size={14} />,
							label: 'Delete panel',
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
		isEditable,
		canEditWidget,
		canMove,
		canDelete,
		panelCapabilities,
		panel,
		panelActions,
		sections,
		panelId,
		openPanelEditor,
		createAlert,
		movePanel,
		clonePanel,
		requestDelete,
	]);

	return { items, deleteConfirm };
}
