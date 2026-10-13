import { useMemo } from 'react';
import {
	Copy,
	Expand,
	Link2,
	LockKeyhole,
	PenLine,
	SquareArrowOutUpRight,
	Tag,
} from '@signozhq/icons';
import { useCopyToClipboard } from 'react-use';
import logEvent from 'api/common/logEvent';
import { useDashboardLockPermission } from 'hooks/dashboards/useDashboardLockPermission';
import { useDashboardPermissions } from 'hooks/dashboards/useDashboardPermissions';
import { DashboardCreatePermission } from 'lib/authz/hooks/useAuthZ/permissions/dashboard.permissions';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';
import { DashboardListEvents } from 'pages/DashboardsListPage/constants/events';
import { getAbsoluteUrl } from 'utils/basePath';
import { openInNewTab } from 'utils/navigation';

import ActionsMenuItem from './ActionsMenuItem';
import DeleteActionItem from './DeleteActionItem';
import { useCloneDashboardAction } from './useCloneDashboardAction';
import { useLockToggleAction } from './useLockToggleAction';
import styles from './ActionsPopover.module.scss';
import { useTranslation } from 'react-i18next';
import { DashboardtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';

interface Props {
	link: string;
	dashboardId: string;
	dashboardName: string;
	source: DashboardtypesSourceDTO;
	isLocked: boolean;
	tags: string[];
	isLegacy: boolean;
	onView: (event: React.MouseEvent<HTMLElement>) => void;
	onOpenRename: () => void;
	onOpenEditTags: () => void;
}

// Mounted only while the popover is open, so a page of rows doesn't pay for 20
// copies of the menu, its mutations or its permission checks.
// These rows need no permission; the component still owns the styling.
const NO_CHECKS: BrandedPermission[] = [];

function ActionsPopoverContent({
	link,
	dashboardId,
	dashboardName,
	source,
	isLocked,
	tags,
	isLegacy,
	onView,
	onOpenRename,
	onOpenEditTags,
}: Props): JSX.Element {
	const { t } = useTranslation('dashboard');
	const [, setCopy] = useCopyToClipboard();

	const { canEdit, editChecks, readPermission } =
		useDashboardPermissions(dashboardId);
	// A non-empty reason already means "cannot toggle".
	const { disabledTooltip: lockDisabledTooltip } = useDashboardLockPermission({
		dashboardId,
		source,
	});

	const { clone, isCloning } = useCloneDashboardAction({
		dashboardId,
		dashboardName,
	});
	const { toggleLock, isTogglingLock } = useLockToggleAction({
		dashboardId,
		isLocked,
	});

	// The lock only: a missing `update` outranks it and is reported by the component.
	const editLockTooltip = canEdit && isLocked ? t('dashboard_locked') : '';
	// Cloning reads this dashboard and creates another, so both are named.
	const cloneChecks = useMemo(
		() => [readPermission, DashboardCreatePermission],
		[readPermission],
	);

	return (
		// Stop clicks inside the menu (incl. disabled items) from bubbling to the
		// row's onClick, which would navigate to the dashboard.
		// eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- wrapper only guards propagation, not an interactive control
		<div className={styles.content} onClick={(e): void => e.stopPropagation()}>
			{!isLegacy && (
				<>
					<ActionsMenuItem
						label="View"
						icon={<Expand size={14} />}
						testId="dashboard-action-view"
						checks={NO_CHECKS}
						onClick={onView}
					/>
					<ActionsMenuItem
						label="Open in New Tab"
						icon={<SquareArrowOutUpRight size={14} />}
						testId="dashboard-action-open-new-tab"
						checks={NO_CHECKS}
						onClick={(): void => {
							openInNewTab(link);
							void logEvent(DashboardListEvents.RowAction, {
								action: 'openNewTab',
								dashboardId,
							});
						}}
					/>
					<ActionsMenuItem
						label="Copy Link"
						icon={<Link2 size={14} />}
						testId="dashboard-action-copy-link"
						checks={NO_CHECKS}
						onClick={(): void => {
							setCopy(getAbsoluteUrl(link));
							void logEvent(DashboardListEvents.RowAction, {
								action: 'copyLink',
								dashboardId,
							});
						}}
					/>
					<ActionsMenuItem
						label="Rename"
						icon={<PenLine size={14} />}
						testId="dashboard-action-rename"
						checks={editChecks}
						disabledTooltip={editLockTooltip}
						onClick={onOpenRename}
					/>
					<ActionsMenuItem
						label={tags.length > 0 ? 'Edit Tags' : 'Add Tags'}
						icon={<Tag size={14} />}
						testId="dashboard-action-edit-tags"
						checks={editChecks}
						disabledTooltip={editLockTooltip}
						onClick={onOpenEditTags}
					/>
					<ActionsMenuItem
						label="Duplicate"
						icon={<Copy size={14} />}
						testId="dashboard-action-duplicate"
						checks={cloneChecks}
						loading={isCloning}
						onClick={clone}
					/>
					<ActionsMenuItem
						label={isLocked ? 'Unlock Dashboard' : 'Lock Dashboard'}
						icon={<LockKeyhole size={14} />}
						testId="dashboard-action-lock"
						checks={editChecks}
						disabledTooltip={lockDisabledTooltip}
						loading={isTogglingLock}
						onClick={toggleLock}
					/>
				</>
			)}
			<DeleteActionItem
				dashboardId={dashboardId}
				dashboardName={dashboardName}
				isLocked={isLocked}
				showDivider={!isLegacy}
			/>
		</div>
	);
}

export default ActionsPopoverContent;
