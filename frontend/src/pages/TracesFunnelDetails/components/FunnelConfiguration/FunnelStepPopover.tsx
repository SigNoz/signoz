import { Button, Popover, Tooltip } from 'antd';
import cx from 'classnames';
import { Ellipsis, PencilLine, Trash2 } from 'lucide-react';
import { useState } from 'react';

import AddFunnelStepDetailsModal from './AddFunnelStepDetailsModal';
import DeleteFunnelStep from './DeleteFunnelStep';

interface FunnelStepPopoverProps {
	isPopoverOpen: boolean;
	setIsPopoverOpen: (isOpen: boolean) => void;
	className?: string;
	stepOrder: number;
	stepsCount: number;
	onStepRemove: () => void;
}

interface FunnelStepActionsProps {
	setIsPopoverOpen: (isOpen: boolean) => void;
	setIsAddDetailsModalOpen: (isOpen: boolean) => void;
	setIsDeleteModalOpen: (isOpen: boolean) => void;
	stepsCount: number;
}

function FunnelStepActions({
	setIsPopoverOpen,
	setIsAddDetailsModalOpen,
	setIsDeleteModalOpen,
	stepsCount,
}: FunnelStepActionsProps): JSX.Element {
	return (
		<div className="funnel-item__actions">
			<Button
				type="text"
				className="funnel-item__action-btn"
				icon={<PencilLine size={14} />}
				onClick={(): void => {
					setIsPopoverOpen(false);
					setIsAddDetailsModalOpen(true);
				}}
			>
				Add details
			</Button>

			<Tooltip title={stepsCount <= 2 ? 'Minimum 2 steps required' : 'Delete'}>
				<Button
					type="text"
					className="funnel-item__action-btn funnel-item__action-btn--delete"
					icon={<Trash2 size={14} />}
					disabled={stepsCount <= 2}
					onClick={(): void => {
						if (stepsCount > 2) {
							setIsPopoverOpen(false);
							setIsDeleteModalOpen(true);
						}
					}}
				>
					Delete
				</Button>
			</Tooltip>
		</div>
	);
}

function FunnelStepPopover({
	isPopoverOpen,
	setIsPopoverOpen,
	stepOrder,
	className,
	onStepRemove,
	stepsCount,
}: FunnelStepPopoverProps): JSX.Element {
	const [isAddDetailsModalOpen, setIsAddDetailsModalOpen] = useState<boolean>(
		false,
	);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

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
					<FunnelStepActions
						setIsDeleteModalOpen={setIsDeleteModalOpen}
						setIsPopoverOpen={setIsPopoverOpen}
						setIsAddDetailsModalOpen={setIsAddDetailsModalOpen}
						stepsCount={stepsCount}
					/>
				}
				placement="bottomRight"
				arrow={false}
			>
				<Ellipsis
					className={cx('funnel-item__action-icon', className, {
						'funnel-item__action-icon--active': isPopoverOpen,
					})}
					size={14}
				/>
			</Popover>

			<DeleteFunnelStep
				isOpen={isDeleteModalOpen}
				onClose={(): void => setIsDeleteModalOpen(false)}
				onStepRemove={onStepRemove}
			/>

			<AddFunnelStepDetailsModal
				isOpen={isAddDetailsModalOpen}
				onClose={(): void => setIsAddDetailsModalOpen(false)}
				stepOrder={stepOrder}
			/>
		</div>
	);
}

FunnelStepPopover.defaultProps = {
	className: '',
};

export default FunnelStepPopover;
