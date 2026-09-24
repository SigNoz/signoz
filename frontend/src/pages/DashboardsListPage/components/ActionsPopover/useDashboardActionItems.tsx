import { ReactNode, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
	Copy,
	Expand,
	Link2,
	LockKeyhole,
	PenLine,
	SquareArrowOutUpRight,
	Tag,
	Trash2,
} from '@signozhq/icons';
import { useCopyToClipboard } from 'react-use';
import logEvent from 'api/common/logEvent';
import { DashboardtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { useDashboardLockPermission } from 'hooks/dashboards/useDashboardLockPermission';
import { useDashboardPermissions } from 'hooks/dashboards/useDashboardPermissions';
import type { AuthZDropdownItemType } from 'lib/authz/components/AuthZDropdown/types';
import { DashboardCreatePermission } from 'lib/authz/hooks/useAuthZ/permissions/dashboard.permissions';
import { DashboardListEvents } from 'pages/DashboardsListPage/constants/events';
import { getAbsoluteUrl } from 'utils/basePath';
import { openInNewTab } from 'utils/navigation';

import { useCloneDashboardAction } from './useCloneDashboardAction';
import { useDeleteDashboardAction } from './useDeleteDashboardAction';
import { useLockToggleAction } from './useLockToggleAction';

interface Params {
	link: string;
	dashboardId: string;
	dashboardName: string;
	source: DashboardtypesSourceDTO;
	isLocked: boolean;
	tags: string[];
	isLegacy: boolean;
	/** False until the menu first opens, so closed rows fire no checks. */
	enabled: boolean;
	onView: (event: React.MouseEvent) => void;
	onOpenRename: () => void;
	onOpenEditTags: () => void;
}

// A reason blocks the row; without one the row's checks decide.
function blockedBy(reason: string): {
	disabled: boolean;
	disabledTooltip: string | undefined;
} {
	return { disabled: !!reason, disabledTooltip: reason || undefined };
}

export function useDashboardActionItems({
	link,
	dashboardId,
	dashboardName,
	source,
	isLocked,
	tags,
	isLegacy,
	enabled,
	onView,
	onOpenRename,
	onOpenEditTags,
}: Params): { items: AuthZDropdownItemType[]; contextHolder: ReactNode } {
	const { t } = useTranslation('dashboard');
	const [, setCopy] = useCopyToClipboard();

	const { canEdit, editChecks, readPermission } = useDashboardPermissions(
		dashboardId,
		{ enabled },
	);
	// A non-empty reason already means "cannot toggle".
	const { disabledTooltip: lockDisabledTooltip } = useDashboardLockPermission({
		dashboardId,
		source,
		enabled,
	});

	const { clone, isCloning } = useCloneDashboardAction({
		dashboardId,
		dashboardName,
	});
	const { toggleLock, isTogglingLock } = useLockToggleAction({
		dashboardId,
		isLocked,
	});
	const {
		openConfirm: openDeleteConfirm,
		deleteChecks,
		lockTooltip: deleteLockTooltip,
		contextHolder,
	} = useDeleteDashboardAction({
		dashboardId,
		dashboardName,
		isLocked,
		enabled,
	});

	// The lock only: a missing `update` outranks it and is reported by the checks.
	const editLockTooltip = canEdit && isLocked ? t('dashboard_locked') : '';

	const items = useMemo((): AuthZDropdownItemType[] => {
		const deleteItem: AuthZDropdownItemType = {
			type: 'item',
			value: 'delete',
			label: 'Delete Dashboard',
			prefix: <Trash2 size={14} />,
			testId: 'dashboard-action-delete',
			danger: true,
			checks: deleteChecks,
			...blockedBy(deleteLockTooltip),
			onClick: openDeleteConfirm,
		};

		// A legacy (pre-v2) dashboard has no v2 spec, so only Delete applies.
		if (isLegacy) {
			return [deleteItem];
		}

		const logRowAction = (action: string): void => {
			void logEvent(DashboardListEvents.RowAction, { action, dashboardId });
		};

		return [
			{
				type: 'item',
				value: 'view',
				label: 'View',
				prefix: <Expand size={14} />,
				testId: 'dashboard-action-view',
				onClick: onView,
			},
			{
				type: 'item',
				value: 'open-new-tab',
				label: 'Open in New Tab',
				prefix: <SquareArrowOutUpRight size={14} />,
				testId: 'dashboard-action-open-new-tab',
				onClick: (): void => {
					openInNewTab(link);
					logRowAction('openNewTab');
				},
			},
			{
				type: 'item',
				value: 'copy-link',
				label: 'Copy Link',
				prefix: <Link2 size={14} />,
				testId: 'dashboard-action-copy-link',
				onClick: (): void => {
					setCopy(getAbsoluteUrl(link));
					logRowAction('copyLink');
				},
			},
			{
				type: 'item',
				value: 'rename',
				label: 'Rename',
				prefix: <PenLine size={14} />,
				testId: 'dashboard-action-rename',
				checks: editChecks,
				...blockedBy(editLockTooltip),
				onClick: onOpenRename,
			},
			{
				type: 'item',
				value: 'edit-tags',
				label: tags.length > 0 ? 'Edit Tags' : 'Add Tags',
				prefix: <Tag size={14} />,
				testId: 'dashboard-action-edit-tags',
				checks: editChecks,
				...blockedBy(editLockTooltip),
				onClick: onOpenEditTags,
			},
			{
				type: 'item',
				value: 'duplicate',
				label: 'Duplicate',
				prefix: <Copy size={14} />,
				testId: 'dashboard-action-duplicate',
				// Cloning reads this dashboard and creates another, so both are named.
				checks: [readPermission, DashboardCreatePermission],
				loading: isCloning,
				loadingTooltip: 'Duplicating',
				onClick: clone,
			},
			{
				type: 'item',
				value: 'lock',
				label: isLocked ? 'Unlock Dashboard' : 'Lock Dashboard',
				prefix: <LockKeyhole size={14} />,
				testId: 'dashboard-action-lock',
				checks: editChecks,
				...blockedBy(lockDisabledTooltip),
				loading: isTogglingLock,
				loadingTooltip: isLocked ? 'Unlocking' : 'Locking',
				onClick: toggleLock,
			},
			{ type: 'separator', value: 'before-delete' },
			deleteItem,
		];
	}, [
		clone,
		dashboardId,
		deleteChecks,
		deleteLockTooltip,
		editChecks,
		editLockTooltip,
		isCloning,
		isLegacy,
		isLocked,
		isTogglingLock,
		link,
		lockDisabledTooltip,
		onOpenEditTags,
		onOpenRename,
		onView,
		openDeleteConfirm,
		readPermission,
		setCopy,
		tags.length,
		toggleLock,
	]);

	return { items, contextHolder };
}
