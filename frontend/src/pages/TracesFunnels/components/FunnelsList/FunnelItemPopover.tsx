import { Button, Popover } from 'antd';
import cx from 'classnames';
import { Ellipsis, PencilLine, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { FunnelData } from 'types/api/traceFunnels';

import DeleteFunnel from '../DeleteFunnel/DeleteFunnel';
import RenameFunnel from '../RenameFunnel/RenameFunnel';

interface FunnelItemPopoverProps {
	isPopoverOpen: boolean;
	setIsPopoverOpen: (isOpen: boolean) => void;
	funnel: FunnelData;
}

interface FunnelItemActionsProps {
	setIsPopoverOpen: (isOpen: boolean) => void;
	setIsRenameModalOpen: (isOpen: boolean) => void;
	setIsDeleteModalOpen: (isOpen: boolean) => void;
}

function FunnelItemActions({
	setIsPopoverOpen,
	setIsRenameModalOpen,
	setIsDeleteModalOpen,
}: FunnelItemActionsProps): JSX.Element {
	return (
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
	);
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
					<FunnelItemActions
						setIsDeleteModalOpen={setIsDeleteModalOpen}
						setIsPopoverOpen={setIsPopoverOpen}
						setIsRenameModalOpen={setIsRenameModalOpen}
					/>
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

export default FunnelItemPopover;
