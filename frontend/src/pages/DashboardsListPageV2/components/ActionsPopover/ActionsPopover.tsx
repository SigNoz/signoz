import { Popover } from 'antd';
import {
	Expand,
	EllipsisVertical,
	Link2,
	SquareArrowOutUpRight,
} from '@signozhq/icons';
import { useCopyToClipboard } from 'react-use';
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

	return (
		<Popover
			content={
				<div className={styles.content}>
					<button
						type="button"
						className={styles.actionItem}
						onClick={onView}
						data-testid="dashboard-action-view"
					>
						<span className={styles.actionIcon}>
							<Expand size={14} />
						</span>
						<span className={styles.actionLabel}>View</span>
					</button>
					<button
						type="button"
						className={styles.actionItem}
						onClick={(e): void => {
							e.stopPropagation();
							e.preventDefault();
							openInNewTab(link);
						}}
						data-testid="dashboard-action-open-new-tab"
					>
						<span className={styles.actionIcon}>
							<SquareArrowOutUpRight size={14} />
						</span>
						<span className={styles.actionLabel}>Open in New Tab</span>
					</button>
					<button
						type="button"
						className={styles.actionItem}
						onClick={(e): void => {
							e.stopPropagation();
							e.preventDefault();
							setCopy(getAbsoluteUrl(link));
						}}
						data-testid="dashboard-action-copy-link"
					>
						<span className={styles.actionIcon}>
							<Link2 size={14} />
						</span>
						<span className={styles.actionLabel}>Copy Link</span>
					</button>
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
			<button
				type="button"
				className={styles.triggerIcon}
				data-testid="dashboard-action-icon"
				onClick={(e): void => {
					e.stopPropagation();
					e.preventDefault();
				}}
			>
				<EllipsisVertical size={14} />
			</button>
		</Popover>
	);
}

export default ActionsPopover;
