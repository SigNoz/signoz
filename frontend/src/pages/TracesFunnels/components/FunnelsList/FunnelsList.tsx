import './FunnelsList.styles.scss';

import { Button, Popover } from 'antd';
import cx from 'classnames';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import ROUTES from 'constants/routes';
import dayjs from 'dayjs';
import { CalendarClock, Ellipsis, PencilLine, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { generatePath, Link } from 'react-router-dom';
import { FunnelData } from 'types/api/traceFunnels';

import DeleteFunnel from '../DeleteFunnel/DeleteFunnel';
import RenameFunnel from '../RenameFunnel/RenameFunnel';

interface FunnelListItemProps {
	funnel: FunnelData;
}

interface FunnelItemPopoverProps {
	isPopoverOpen: boolean;
	setIsPopoverOpen: (isOpen: boolean) => void;
	funnel: FunnelData;
}

function FunnelItemPopover({
	isPopoverOpen,
	setIsPopoverOpen,
	funnel,
}: FunnelItemPopoverProps): JSX.Element {
	const [isRenameModalOpen, setIsRenameModalOpen] = useState<boolean>(false);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

	const handleRenameCancel = (): void => {
		setIsRenameModalOpen(false);
	};

	const preventDefault = (e: React.MouseEvent | React.KeyboardEvent): void => {
		e.preventDefault();
		e.stopPropagation();
	};

	return (
		// eslint-disable-next-line jsx-a11y/click-events-have-key-events
		<div onClick={preventDefault} role="button" tabIndex={0}>
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
							onClick={(): void => {
								setIsPopoverOpen(false);
								setIsRenameModalOpen(true);
							}}
						>
							Rename
						</Button>
						<Button
							type="text"
							className="funnel-item__action-btn funnel-item__action-btn--delete"
							icon={<Trash2 size={14} />}
							onClick={(): void => {
								setIsPopoverOpen(false);
								setIsDeleteModalOpen(true);
							}}
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

			<DeleteFunnel
				isOpen={isDeleteModalOpen}
				onClose={(): void => setIsDeleteModalOpen(false)}
				funnelId={funnel.id}
			/>

			<RenameFunnel
				isOpen={isRenameModalOpen}
				onClose={handleRenameCancel}
				funnelId={funnel.id}
				initialName={funnel.funnel_name}
			/>
		</div>
	);
}

function FunnelListItem({ funnel }: FunnelListItemProps): JSX.Element {
	const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

	return (
		<Link
			to={generatePath(ROUTES.TRACES_FUNNELS_DETAILS, { funnelId: funnel.id })}
			className="funnel-item"
		>
			<div className="funnel-item__header">
				<div className="funnel-item__title">
					<div>{funnel.funnel_name}</div>
				</div>
				<FunnelItemPopover
					isPopoverOpen={isPopoverOpen}
					setIsPopoverOpen={setIsPopoverOpen}
					funnel={funnel}
				/>
			</div>

			<div className="funnel-item__details">
				<div className="funnel-item__created-at">
					<CalendarClock size={14} />
					<div>
						{dayjs(funnel.creation_timestamp).format(
							DATE_TIME_FORMATS.FUNNELS_LIST_DATE,
						)}
					</div>
				</div>

				<div className="funnel-item__user">
					{funnel.user && (
						<div className="funnel-item__user-avatar">
							{funnel.user.substring(0, 1).toUpperCase()}
						</div>
					)}
					<div>{funnel.user}</div>
				</div>
			</div>
		</Link>
	);
}

interface FunnelsListProps {
	data: FunnelData[];
}

function FunnelsList({ data }: FunnelsListProps): JSX.Element {
	return (
		<div className="funnels-list">
			{data.map((funnel) => (
				<FunnelListItem key={funnel.id} funnel={funnel} />
			))}
		</div>
	);
}

export default FunnelsList;
