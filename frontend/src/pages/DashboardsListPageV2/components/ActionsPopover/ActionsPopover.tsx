import { Popover } from 'antd';
import { Button } from '@signozhq/ui/button';
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
