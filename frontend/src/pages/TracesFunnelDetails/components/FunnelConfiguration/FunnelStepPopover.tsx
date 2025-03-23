import { Button, Popover } from 'antd';
import cx from 'classnames';
import { Ellipsis, PencilLine, Trash2 } from 'lucide-react';

interface FunnelStepPopoverProps {
	isPopoverOpen: boolean;
	setIsPopoverOpen: (isOpen: boolean) => void;
	className?: string;
	funnelId: string;
	stepId: string;
}

function FunnelStepActions(): JSX.Element {
	return (
		<div className="funnel-item__actions">
			<Button
				type="text"
				className="funnel-item__action-btn"
				icon={<PencilLine size={14} />}
			>
				Add details
			</Button>
			<Button
				type="text"
				className="funnel-item__action-btn funnel-item__action-btn--delete"
				icon={<Trash2 size={14} />}
			>
				Delete
			</Button>
		</div>
	);
}

function FunnelStepPopover({
	isPopoverOpen,
	setIsPopoverOpen,
	funnelId,
	stepId,
	className,
}: FunnelStepPopoverProps): JSX.Element {
	const preventDefault = (e: React.MouseEvent | React.KeyboardEvent): void => {
		e.preventDefault();
		e.stopPropagation();
	};

	console.log('funnelId', funnelId);
	console.log('stepId', stepId);

	return (
		// eslint-disable-next-line jsx-a11y/click-events-have-key-events
		<div onClick={preventDefault} role="button" tabIndex={0}>
			<Popover
				trigger="click"
				rootClassName="funnel-item__actions"
				open={isPopoverOpen}
				onOpenChange={setIsPopoverOpen}
				content={<FunnelStepActions />}
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
		</div>
	);
}

FunnelStepPopover.defaultProps = {
	className: '',
};

export default FunnelStepPopover;
