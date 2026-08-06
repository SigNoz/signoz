import { useState } from 'react';
import { Popover } from 'antd';
import { Button } from '@signozhq/ui/button';
import { EllipsisVertical } from '@signozhq/icons';

import ActionsPopoverContent from './ActionsPopoverContent';
import EditTagsModal from './EditTagsModal';
import RenameDashboardModal from './RenameDashboardModal';

interface Props {
	link: string;
	dashboardId: string;
	dashboardName: string;
	createdBy: string;
	isLocked: boolean;
	// Current tags as `key:value` strings, for the inline tag editor.
	tags: string[];
	onView: (event: React.MouseEvent<HTMLElement>) => void;
	// A legacy (pre-v2) dashboard has no v2 spec, so the actions that operate on
	// one (view, open, copy link, rename, edit tags, duplicate, lock) don't apply —
	// only Delete is kept.
	isLegacy?: boolean;
}

function ActionsPopover({
	link,
	dashboardId,
	dashboardName,
	createdBy,
	isLocked,
	tags,
	onView,
	isLegacy = false,
}: Props): JSX.Element {
	const [isOpen, setIsOpen] = useState(false);
	const [isRenameOpen, setIsRenameOpen] = useState(false);
	const [isEditTagsOpen, setIsEditTagsOpen] = useState(false);

	return (
		<>
			<Popover
				open={isOpen}
				onOpenChange={setIsOpen}
				// A render function, so the menu's mutations and permission checks are
				// paid for only by the row whose menu is actually open. Paired with
				// destroyTooltipOnHide, they are released again on close.
				content={(): JSX.Element => (
					<ActionsPopoverContent
						link={link}
						dashboardId={dashboardId}
						dashboardName={dashboardName}
						createdBy={createdBy}
						isLocked={isLocked}
						tags={tags}
						isLegacy={isLegacy}
						onView={onView}
						onOpenRename={(): void => {
							setIsOpen(false);
							setIsRenameOpen(true);
						}}
						onOpenEditTags={(): void => {
							setIsOpen(false);
							setIsEditTagsOpen(true);
						}}
					/>
				)}
				destroyTooltipOnHide
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
			<RenameDashboardModal
				open={isRenameOpen}
				dashboardId={dashboardId}
				currentName={dashboardName}
				onClose={(): void => setIsRenameOpen(false)}
			/>
			<EditTagsModal
				open={isEditTagsOpen}
				dashboardId={dashboardId}
				currentTags={tags}
				onClose={(): void => setIsEditTagsOpen(false)}
			/>
		</>
	);
}

export default ActionsPopover;
