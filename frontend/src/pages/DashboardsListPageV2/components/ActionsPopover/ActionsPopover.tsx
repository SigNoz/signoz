import { useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { generatePath } from 'react-router-dom';
import { Popover, Tooltip } from 'antd';
import { Button } from '@signozhq/ui/button';
import { toast } from '@signozhq/ui/sonner';
import {
	Copy,
	Expand,
	EllipsisVertical,
	Link2,
	LockKeyhole,
	PenLine,
	SquareArrowOutUpRight,
} from '@signozhq/icons';
import { useCopyToClipboard } from 'react-use';
import {
	cloneDashboardV2,
	invalidateListDashboardsForUserV2,
	lockDashboardV2,
	unlockDashboardV2,
} from 'api/generated/services/dashboard';
import ROUTES from 'constants/routes';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { useAppContext } from 'providers/App/App';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';
import { USER_ROLES } from 'types/roles';
import { getAbsoluteUrl } from 'utils/basePath';
import { openInNewTab } from 'utils/navigation';

import DeleteActionItem from './DeleteActionItem';
import RenameDashboardModal from './RenameDashboardModal';
import styles from './ActionsPopover.module.scss';

interface Props {
	link: string;
	dashboardId: string;
	dashboardName: string;
	createdBy: string;
	isLocked: boolean;
	// Edit permission (edit_dashboard). Read actions show regardless; edit actions are hidden without it.
	canEdit: boolean;
	onView: (event: React.MouseEvent<HTMLElement>) => void;
}

function ActionsPopover({
	link,
	dashboardId,
	dashboardName,
	createdBy,
	isLocked,
	canEdit,
	onView,
}: Props): JSX.Element {
	const [, setCopy] = useCopyToClipboard();
	const { safeNavigate } = useSafeNavigate();
	const { showErrorModal } = useErrorModal();
	const [isRenameOpen, setIsRenameOpen] = useState(false);

	// Clone keeps the source's name/panels/tags as a new unlocked dashboard owned
	// by the caller; open the copy so it can be tweaked right away.
	const { mutate: runClone, isLoading: isCloning } = useMutation({
		mutationFn: () => cloneDashboardV2({ id: dashboardId }),
		onSuccess: (response) => {
			toast.success(`Duplicated "${dashboardName}"`);
			safeNavigate(
				generatePath(ROUTES.DASHBOARD, { dashboardId: response.data.id }),
			);
		},
		onError: (error: APIError) => {
			showErrorModal(error);
		},
	});

	const queryClient = useQueryClient();
	const { user } = useAppContext();
	const isAuthor = user?.email === createdBy;
	// Author/admin can lock-unlock (mirrors the detail-page gate); integration-owned
	// dashboards are never toggleable.
	const canToggleLock =
		(isAuthor || user.role === USER_ROLES.ADMIN) && createdBy !== 'integration';

	const { mutate: runLockToggle, isLoading: isTogglingLock } = useMutation({
		mutationFn: () =>
			isLocked
				? unlockDashboardV2({ id: dashboardId })
				: lockDashboardV2({ id: dashboardId }),
		onSuccess: async () => {
			toast.success(isLocked ? 'Dashboard unlocked' : 'Dashboard locked');
			await invalidateListDashboardsForUserV2(queryClient);
		},
		onError: (error: APIError) => {
			showErrorModal(error);
		},
	});

	return (
		<>
			<Popover
				content={
					// Stop clicks inside the menu (incl. disabled items) from bubbling to the
					// row's onClick, which would navigate to the dashboard.
					// eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- wrapper only guards propagation, not an interactive control
					<div className={styles.content} onClick={(e): void => e.stopPropagation()}>
						<Button
							color="secondary"
							className={styles.menuItem}
							prefix={<Expand size={14} />}
							onClick={onView}
							testId="dashboard-action-view"
						>
							View
						</Button>
						<Button
							color="secondary"
							className={styles.menuItem}
							prefix={<SquareArrowOutUpRight size={14} />}
							onClick={(e): void => {
								e.stopPropagation();
								e.preventDefault();
								openInNewTab(link);
							}}
							testId="dashboard-action-open-new-tab"
						>
							Open in New Tab
						</Button>
						<Button
							color="secondary"
							className={styles.menuItem}
							prefix={<Link2 size={14} />}
							onClick={(e): void => {
								e.stopPropagation();
								e.preventDefault();
								setCopy(getAbsoluteUrl(link));
							}}
							testId="dashboard-action-copy-link"
						>
							Copy Link
						</Button>
						{canEdit && (
							<Tooltip
								placement="left"
								title={
									isLocked ? 'This dashboard is locked, so it cannot be renamed.' : ''
								}
							>
								<span className={styles.menuItemWrap}>
									<Button
										color="secondary"
										className={styles.menuItem}
										prefix={<PenLine size={14} />}
										disabled={isLocked}
										onClick={(e): void => {
											e.stopPropagation();
											e.preventDefault();
											if (!isLocked) {
												setIsRenameOpen(true);
											}
										}}
										testId="dashboard-action-rename"
									>
										Rename
									</Button>
								</span>
							</Tooltip>
						)}
						{canEdit && (
							<Button
								color="secondary"
								className={styles.menuItem}
								prefix={<Copy size={14} />}
								loading={isCloning}
								onClick={(e): void => {
									e.stopPropagation();
									e.preventDefault();
									runClone();
								}}
								testId="dashboard-action-duplicate"
							>
								Duplicate
							</Button>
						)}
						{canToggleLock && (
							<Button
								color="secondary"
								className={styles.menuItem}
								prefix={<LockKeyhole size={14} />}
								loading={isTogglingLock}
								onClick={(e): void => {
									e.stopPropagation();
									e.preventDefault();
									runLockToggle();
								}}
								testId="dashboard-action-lock"
							>
								{isLocked ? 'Unlock Dashboard' : 'Lock Dashboard'}
							</Button>
						)}
						{canEdit && (
							<DeleteActionItem
								dashboardId={dashboardId}
								dashboardName={dashboardName}
								createdBy={createdBy}
								isLocked={isLocked}
							/>
						)}
					</div>
				}
				placement="bottomRight"
				arrow={false}
				rootClassName="dashboardActionsPopover"
				trigger="click"
			>
				<Button
					size="icon"
					variant="ghost"
					color="secondary"
					testId="dashboard-action-icon"
					onClick={(e): void => {
						e.stopPropagation();
						e.preventDefault();
					}}
				>
					<EllipsisVertical size={14} />
				</Button>
			</Popover>
			<RenameDashboardModal
				open={isRenameOpen}
				dashboardId={dashboardId}
				currentName={dashboardName}
				onClose={(): void => setIsRenameOpen(false)}
			/>
		</>
	);
}

export default ActionsPopover;
