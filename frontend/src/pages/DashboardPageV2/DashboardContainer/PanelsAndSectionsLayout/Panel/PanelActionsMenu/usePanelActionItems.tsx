import { useCallback, useMemo } from 'react';
import {
	Bell,
	CloudDownload,
	Copy,
	FileCode,
	FileImage,
	FileSpreadsheet,
	FolderInput,
	Fullscreen,
	PenLine,
	Trash2,
} from '@signozhq/icons';
import type { MenuItem } from '@signozhq/ui/dropdown-menu';
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
import { useDeletePanel } from '../hooks/useDeletePanel';
import { useDownloadPanelImage } from '../hooks/useDownloadPanelImage';
import { useMovePanelToSection } from '../hooks/useMovePanelToSection';
import type { PanelImageFormat } from '../utils/downloadPanelImage';
import { PANEL_ACTION_META } from './panelActionMeta';
import { PanelKind } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelKind';
import type {
	DownloadFormat,
	PanelActionCapabilities,
} from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelDefinition';

// Stable fallback so renders without layout context don't churn the mutation
// hooks' deps (a fresh [] each render would re-create their callbacks).
const EMPTY_SECTIONS: DashboardSection[] = [];

// Placeholder for the V1-parity actions whose V2 implementations land in
// later milestones (view, clone, download, create-alerts).
function notImplementedYet(feature: string): void {
	// eslint-disable-next-line no-alert -- temporary placeholder, see above
	alert(`${feature} option clicked`);
}

const DOWNLOAD_FORMAT_OPTIONS: {
	format: DownloadFormat;
	label: string;
	icon: JSX.Element;
}[] = [
	{
		format: 'csv',
		label: 'Download as CSV',
		icon: <FileSpreadsheet size={14} />,
	},
	{ format: 'png', label: 'Download as PNG', icon: <FileImage size={14} /> },
	{ format: 'svg', label: 'Download as SVG', icon: <FileCode size={14} /> },
];

interface DownloadMenuItemArgs {
	kindActions?: PanelActionCapabilities;
	panelId: string;
	panelName: string;
	downloadPanelImage: (
		panelId: string,
		panelName: string,
		format: PanelImageFormat,
	) => Promise<void>;
}

/**
 * Builds the single "Download" entry — a submenu with one option per format the
 * kind supports (`actions.download`). Returns null when the kind supports none,
 * so the caller can skip the entry entirely.
 */
function buildDownloadMenuItem({
	kindActions,
	panelId,
	panelName,
	downloadPanelImage,
}: DownloadMenuItemArgs): MenuItem | null {
	const supported = kindActions?.download;
	if (!supported) {
		return null;
	}

	const children: MenuItem[] = DOWNLOAD_FORMAT_OPTIONS.filter(
		({ format }) => supported[format],
	).map(({ format, label, icon }) => ({
		key: `download-${format}`,
		label,
		icon,
		onClick: (): void => {
			// CSV export isn't wired up yet (table-only placeholder, V1 parity);
			// PNG/SVG capture the rendered panel via the image util.
			if (format === 'csv') {
				notImplementedYet('Download');
				return;
			}
			void downloadPanelImage(panelId, panelName, format);
		},
	}));

	if (children.length === 0) {
		return null;
	}
	return {
		key: 'download',
		label: 'Download',
		icon: <CloudDownload size={14} />,
		children,
	};
}

interface UsePanelActionItemsArgs {
	panelId: string;
	/** Panel title — used as the downloaded image's filename. */
	panelName: string;
	/** Full plugin kind (e.g. `signoz/TimeSeriesPanel`); */
	panelKind: PanelKind;
	/** Layout context for move/delete — absent outside editable mode. */
	panelActions?: PanelActionsConfig;
}

export interface PanelActionItems {
	items: MenuItem[];
	/**
	 * Two-step confirm flow for the destructive Delete action — the menu defers
	 * to it instead of deleting on click. The presentational menu renders
	 * ConfirmDeleteDialog from this.
	 */
	deleteConfirm: ConfirmableAction;
}

/**
 * Resolves the panel actions menu items (the V1 WidgetHeader action set plus
 * V2's "Move to section"). Every action passes three gates before it appears:
 *
 *   kind — what the panel kind declares it supports (PanelDefinition.actions);
 *          unknown kinds support no kind-gated actions.
 *   role — componentPermission lookup for the current user (PANEL_ACTION_META;
 *          actions without a permission key are open to every role, V1 parity).
 *   context — runtime state: dashboard editable (store), layout config present.
 *          View and Download remain available on read-only dashboards, as in V1.
 *
 * Items are composed as groups with dividers inserted between non-empty
 * groups, so adding an action never touches divider bookkeeping.
 */
export function usePanelActionItems({
	panelId,
	panelName,
	panelKind,
	panelActions,
}: UsePanelActionItemsArgs): PanelActionItems {
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
	// Folds in the dashboard lock + edit_dashboard permission (set once by
	// DashboardContainer). Mutating actions respect it; view/download don't.
	const isEditable = useDashboardStore((s) => s.isEditable);
	const openPanelEditor = useOpenPanelEditor();
	const { downloadPanelImage } = useDownloadPanelImage();

	// Mutations are store-backed (dashboardId/refetch) — the layout tree only
	// supplies data (`sections`), so no callbacks are threaded through it.
	const sections = panelActions?.sections ?? EMPTY_SECTIONS;
	const movePanel = useMovePanelToSection({ sections });
	const deletePanel = useDeletePanel({ sections });
	const clonePanel = useClonePanel({ sections });

	const kindActions = getPanelDefinition(panelKind)?.actions;

	// Delete is destructive, so the menu item opens a confirmation prompt rather
	// than deleting on click; the actual mutation runs on confirm.
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
	// Stable opener — used in the items memo without rebuilding it when the
	// dialog's open/pending state changes.
	const { request: requestDelete } = deleteConfirm;

	const items = useMemo<MenuItem[]>(() => {
		// Group 1 — open/author the panel: View, Edit, Clone.
		const panelGroup: MenuItem[] = [];
		if (kindActions?.view) {
			panelGroup.push({
				key: 'view-panel',
				label: 'View',
				icon: <Fullscreen size={14} />,
				onClick: (): void => notImplementedYet('View'),
			});
		}
		if (isEditable && canEditWidget && kindActions?.edit) {
			panelGroup.push({
				key: 'edit-panel',
				label: 'Edit panel',
				icon: <PenLine size={14} />,
				onClick: (): void => openPanelEditor(panelId),
			});
		}
		// Clone needs the section context (source spec + dimensions) to place the
		// copy, so — unlike Edit — it requires panelActions.
		if (isEditable && canEditWidget && panelActions && kindActions?.clone) {
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

		// Group 2 — derive from the panel's data: Download (submenu), Create Alerts.
		// The Download entry (CSV/PNG/SVG) is non-mutating, so — like View — it
		// stays available on read-only dashboards.
		const dataGroup: MenuItem[] = [];
		const downloadItem = buildDownloadMenuItem({
			kindActions,
			panelId,
			panelName,
			downloadPanelImage,
		});
		if (downloadItem) {
			dataGroup.push(downloadItem);
		}

		if (isEditable && kindActions?.createAlert) {
			dataGroup.push({
				key: 'create-alert',
				label: 'Create Alerts',
				icon: <Bell size={14} />,
				onClick: (): void => notImplementedYet('Create Alerts'),
			});
		}

		// Group 3 — layout: Move to section.
		const moveGroup: MenuItem[] = [];
		if (canMove && panelActions) {
			const targets = sections.filter(
				(s) => s.title && s.layoutIndex !== panelActions.currentLayoutIndex,
			);
			moveGroup.push({
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
										fromLayoutIndex: panelActions.currentLayoutIndex,
										toLayoutIndex: s.layoutIndex,
									}),
							})),
						}),
			});
		}

		// Group 4 — danger: Delete.
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
		kindActions,
		panelActions,
		sections,
		panelId,
		panelName,
		openPanelEditor,
		downloadPanelImage,
		movePanel,
		clonePanel,
		requestDelete,
	]);

	return { items, deleteConfirm };
}
