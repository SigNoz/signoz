import { Button, Popover } from 'antd';
import {
	Expand,
	EllipsisVertical,
	Link2,
	SquareArrowOutUpRight,
} from '@signozhq/icons';
import { useCopyToClipboard } from 'react-use';
import { DeleteButton } from 'container/ListOfDashboard/TableComponents/DeleteButton';
import { getAbsoluteUrl } from 'utils/basePath';
import { openInNewTab } from 'utils/navigation';

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
						type="text"
						className={styles.actionButton}
						icon={<Expand size={12} />}
						onClick={onView}
					>
						View
					</Button>
					<Button
						type="text"
						className={styles.actionButton}
						icon={<SquareArrowOutUpRight size={12} />}
						onClick={(e): void => {
							e.stopPropagation();
							e.preventDefault();
							openInNewTab(link);
						}}
					>
						Open in New Tab
					</Button>
					<Button
						type="text"
						className={styles.actionButton}
						icon={<Link2 size={12} />}
						onClick={(e): void => {
							e.stopPropagation();
							e.preventDefault();
							setCopy(getAbsoluteUrl(link));
						}}
					>
						Copy Link
					</Button>
					<DeleteButton
						name={dashboardName}
						id={dashboardId}
						isLocked={isLocked}
						createdBy={createdBy}
					/>
				</div>
			}
			placement="bottomRight"
			arrow={false}
			rootClassName="dashboardActionsPopover"
			trigger="click"
		>
			<EllipsisVertical
				className={styles.triggerIcon}
				size={14}
				data-testid="dashboard-action-icon"
				onClick={(e): void => {
					e.stopPropagation();
					e.preventDefault();
				}}
			/>
		</Popover>
	);
}

export default ActionsPopover;
