import { useCallback, useState } from 'react';
import { Button } from '@signozhq/ui/button';
import { EllipsisVertical } from '@signozhq/icons';
import AuthZDropdown from 'lib/authz/components/AuthZDropdown/AuthZDropdown';

import EditTagsModal from './EditTagsModal';
import RenameDashboardModal from './RenameDashboardModal';
import { useDashboardActionItems } from './useDashboardActionItems';
import { DashboardtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';

interface Props {
	link: string;
	dashboardId: string;
	dashboardName: string;
	source: DashboardtypesSourceDTO;
	isLocked: boolean;
	// Current tags as `key:value` strings, for the inline tag editor.
	tags: string[];
	onView: (event: React.MouseEvent) => void;
	// A legacy (pre-v2) dashboard has no v2 spec, so the actions that operate on
	// one (view, open, copy link, rename, edit tags, duplicate, lock) don't apply —
	// only Delete is kept.
	isLegacy?: boolean;
}

function ActionsPopover({
	link,
	dashboardId,
	dashboardName,
	source,
	isLocked,
	tags,
	onView,
	isLegacy = false,
}: Props): JSX.Element {
	const [hasOpened, setHasOpened] = useState(false);
	const [isRenameOpen, setIsRenameOpen] = useState(false);
	const [isEditTagsOpen, setIsEditTagsOpen] = useState(false);

	const handleOpenChange = useCallback((open: boolean): void => {
		if (open) {
			setHasOpened(true);
		}
	}, []);
	const openRename = useCallback((): void => setIsRenameOpen(true), []);
	const openEditTags = useCallback((): void => setIsEditTagsOpen(true), []);

	const { items, contextHolder } = useDashboardActionItems({
		link,
		dashboardId,
		dashboardName,
		source,
		isLocked,
		tags,
		isLegacy,
		enabled: hasOpened,
		onView,
		onOpenRename: openRename,
		onOpenEditTags: openEditTags,
	});

	return (
		<>
			<AuthZDropdown
				items={items}
				nativeButton
				side="bottom"
				align="end"
				aria-label="Dashboard actions"
				testId="dashboard-action-icon"
				onOpenChange={handleOpenChange}
			>
				<Button
					aria-label="Action"
					size="sm"
					icon
					variant="ghost"
					color="secondary"
					// The row navigates on click.
					onClick={(e): void => e.stopPropagation()}
				>
					<EllipsisVertical size={14} />
				</Button>
			</AuthZDropdown>
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
			{contextHolder}
		</>
	);
}

export default ActionsPopover;
