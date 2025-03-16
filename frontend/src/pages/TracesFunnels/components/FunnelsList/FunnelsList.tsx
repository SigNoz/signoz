import './FunnelsList.styles.scss';

import { Button, Popover } from 'antd';
import cx from 'classnames';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import dayjs from 'dayjs';
import { CalendarClock, Ellipsis, PencilLine, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { nanoToMilli } from 'utils/timeUtils';

interface FunnelData {
	id: string;
	funnel_name: string;
	creation_timestamp: number;
	user: string;
}

interface FunnelListItemProps {
	funnel: FunnelData;
	onDelete: (id: string) => void;
	onRename: (id: string) => void;
}

function FunnelListItem({
	funnel,
	onDelete,
	onRename,
}: FunnelListItemProps): JSX.Element {
	const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

	return (
		<div className="funnel-item">
			<div className="funnel-item__header">
				<div className="funnel-item__title">
					<div>{funnel.funnel_name}</div>
				</div>

				<Popover
					trigger="click"
					rootClassName="funnel-item__actions"
					open={isPopoverOpen}
					onOpenChange={setIsPopoverOpen}
					content={
						<div className="funnel-item__actions">
							<Button
								type="text"
								className="funnel-item__action-btn"
								icon={<PencilLine size={14} />}
								onClick={(): void => onRename(funnel.id)}
							>
								Rename
							</Button>
							<Button
								type="text"
								className="funnel-item__action-btn funnel-item__action-btn--delete"
								icon={<Trash2 size={14} />}
								onClick={(): void => onDelete(funnel.id)}
							>
								Delete
							</Button>
						</div>
					}
					placement="bottomRight"
					arrow={false}
				>
					<Ellipsis
						className={cx('funnel-item__action-icon', {
							'funnel-item__action-icon--active': isPopoverOpen,
						})}
						size={14}
					/>
				</Popover>
			</div>

			<div className="funnel-item__details">
				<div className="funnel-item__created-at">
					<CalendarClock size={14} />
					<div>
						{dayjs(nanoToMilli(funnel.creation_timestamp)).format(
							DATE_TIME_FORMATS.FUNNELS_LIST_DATE,
						)}
					</div>
				</div>

				<div className="funnel-item__user">
					<div className="funnel-item__user-avatar">
						{funnel.user.substring(0, 1).toUpperCase()}
					</div>
					<div>{funnel.user}</div>
				</div>
			</div>
		</div>
	);
}

interface FunnelsListProps {
	data: FunnelData[];
	onDelete: (id: string) => void;
	onRename: (id: string) => void;
}

function FunnelsList({
	data,
	onDelete,
	onRename,
}: FunnelsListProps): JSX.Element {
	return (
		<div className="funnels-list">
			{data.map((funnel) => (
				<FunnelListItem
					key={funnel.id}
					funnel={funnel}
					onDelete={onDelete}
					onRename={onRename}
				/>
			))}
		</div>
	);
}

export default FunnelsList;
