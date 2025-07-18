import { Button, Popover, Tooltip } from 'antd';
import cx from 'classnames';
import { Ellipsis, PencilLine, Trash2 } from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import { useState } from 'react';
import { FunnelStepData } from 'types/api/traceFunnels';

import AddFunnelStepDetailsModal from './AddFunnelStepDetailsModal';
import DeleteFunnelStep from './DeleteFunnelStep';

export interface FunnelStepPopoverProps {
	isPopoverOpen: boolean;
	setIsPopoverOpen: (isOpen: boolean) => void;
	className?: string;
	stepData: {
		step_order: FunnelStepData['step_order'];
		name?: FunnelStepData['name'];
		description?: FunnelStepData['description'];
	};
	stepsCount: number;
	onStepRemove: () => void;
	isAddDetailsModalOpen: boolean;
	setIsAddDetailsModalOpen: (isOpen: boolean) => void;
}

interface FunnelStepActionsProps {
	setIsPopoverOpen: (isOpen: boolean) => void;
	setIsAddDetailsModalOpen: (isOpen: boolean) => void;
	setIsDeleteModalOpen: (isOpen: boolean) => void;
	stepsCount: number;
	hasEditPermission: boolean;
}

function FunnelStepActions({
	setIsPopoverOpen,
	setIsAddDetailsModalOpen,
	setIsDeleteModalOpen,
	stepsCount,
	hasEditPermission,
}: FunnelStepActionsProps): JSX.Element {
	return (
		<div className="funnel-item__actions">
			<Button
				type="text"
				className="funnel-item__action-btn"
				icon={<PencilLine size={14} />}
				disabled={!hasEditPermission}
				onClick={(): void => {
					setIsPopoverOpen(false);
					setIsAddDetailsModalOpen(true);
				}}
			>
				Add details
			</Button>

			<Tooltip
				title={
					// eslint-disable-next-line no-nested-ternary
					!hasEditPermission
						? 'You need editor or admin access to delete steps'
						: stepsCount <= 2
						? 'Minimum 2 steps required'
						: 'Delete'
				}
			>
				<Button
					type="text"
					className="funnel-item__action-btn funnel-item__action-btn--delete"
					icon={<Trash2 size={14} />}
					disabled={stepsCount <= 2 || !hasEditPermission}
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
	stepData,
	className,
	onStepRemove,
	stepsCount,
	isAddDetailsModalOpen,
	setIsAddDetailsModalOpen,
}: FunnelStepPopoverProps): JSX.Element {
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
	const { hasEditPermission } = useAppContext();

	const preventDefault = (e: React.MouseEvent | React.KeyboardEvent): void => {
		e.preventDefault();
		e.stopPropagation();
	};

	if (!hasEditPermission) {
		return (
			<Tooltip title="You need editor or admin access to add details to step">
				<Button
					type="text"
					className="funnel-item__action-btn"
					icon={<Ellipsis size={14} />}
					disabled
				/>
			</Tooltip>
		);
	}

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
						hasEditPermission={hasEditPermission}
					/>
				}
				placement="bottomRight"
				arrow={false}
				destroyTooltipOnHide
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
				stepData={stepData}
			/>
		</div>
	);
}

FunnelStepPopover.defaultProps = {
	className: '',
};

export default FunnelStepPopover;
