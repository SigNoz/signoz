import { Button, Popover, Tooltip } from 'antd';
import cx from 'classnames';
import { Ellipsis, PencilLine, Trash2 } from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import { useState } from 'react';
import { FunnelData } from 'types/api/traceFunnels';

import DeleteFunnel from '../DeleteFunnel/DeleteFunnel';
import RenameFunnel from '../RenameFunnel/RenameFunnel';

interface FunnelItemPopoverProps {
	isPopoverOpen: boolean;
	setIsPopoverOpen: (isOpen: boolean) => void;
	funnel: FunnelData;
	shouldRedirectToTracesListOnDeleteSuccess?: boolean;
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
	shouldRedirectToTracesListOnDeleteSuccess,
}: FunnelItemPopoverProps): JSX.Element {
	const [isRenameModalOpen, setIsRenameModalOpen] = useState<boolean>(false);
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
	const { hasEditPermission } = useAppContext();

	const handleRenameCancel = (): void => {
		setIsRenameModalOpen(false);
	};

	const preventDefault = (e: React.MouseEvent | React.KeyboardEvent): void => {
		e.preventDefault();
		e.stopPropagation();
	};

	if (!hasEditPermission) {
		return (
			<Tooltip title="You need editor or admin access to edit funnels">
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
		<div
			onClick={preventDefault}
			role="button"
			tabIndex={0}
			className="funnel-item__actions-popover"
		>
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
				shouldRedirectToTracesListOnDeleteSuccess={
					shouldRedirectToTracesListOnDeleteSuccess
				}
				isOpen={isDeleteModalOpen}
				onClose={(): void => setIsDeleteModalOpen(false)}
				funnelId={funnel.funnel_id}
			/>

			<RenameFunnel
				isOpen={isRenameModalOpen}
				onClose={handleRenameCancel}
				funnelId={funnel.funnel_id}
				initialName={funnel.funnel_name}
			/>
		</div>
	);
}

FunnelItemPopover.defaultProps = {
	shouldRedirectToTracesListOnDeleteSuccess: true,
};
export default FunnelItemPopover;
