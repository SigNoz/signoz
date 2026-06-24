import { useMutation } from 'react-query';
import { generatePath } from 'react-router-dom';
import { Popover } from 'antd';
import { Button } from '@signozhq/ui/button';
import { toast } from '@signozhq/ui/sonner';
import {
	Copy,
	Expand,
	EllipsisVertical,
	Link2,
	SquareArrowOutUpRight,
} from '@signozhq/icons';
import { useCopyToClipboard } from 'react-use';
import { cloneDashboardV2 } from 'api/generated/services/dashboard';
import ROUTES from 'constants/routes';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';
import { getAbsoluteUrl } from 'utils/basePath';
import { openInNewTab } from 'utils/navigation';

import DeleteActionItem from './DeleteActionItem';
import styles from './ActionsPopover.module.scss';

interface Props {
	link: string;
	dashboardId: string;
	dashboardName: string;
	createdBy: string;
	isLocked: boolean;
	onView: (event: React.MouseEvent<HTMLElement>) => void;
}

function ActionsPopover({
	link,
	dashboardId,
	dashboardName,
	createdBy,
	isLocked,
	onView,
}: Props): JSX.Element {
	const [, setCopy] = useCopyToClipboard();
	const { safeNavigate } = useSafeNavigate();
	const { showErrorModal } = useErrorModal();

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

	return (
		<Popover
			content={
				<div className={styles.content}>
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
					<DeleteActionItem
						dashboardId={dashboardId}
						dashboardName={dashboardName}
						createdBy={createdBy}
						isLocked={isLocked}
					/>
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
	);
}

export default ActionsPopover;
