import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@signozhq/ui/button';
import { Skeleton } from '@signozhq/ui/skeleton';
import { Typography } from '@signozhq/ui/typography';
import {
	SavedviewtypesSavedViewDTO,
	SavedviewtypesSourceDTO,
} from 'api/generated/services/sigNoz.schemas';
import { useGetSavedViewParams } from 'hooks/saveViews/useGetSavedViewParams';
import { SavedViewReadPermission } from 'lib/authz/hooks/useAuthZ/permissions/saved-view.permissions';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';

import { SAVED_VIEWS_LIST_LOADING_ROWS } from './constants';
import DeleteSavedViewDialog from './DeleteSavedViewDialog';
import { useSavedViewActions } from './hooks/useSavedViewActions';
import { useSavedViewHoverCard } from './hooks/useSavedViewHoverCard';
import { useSavedViewRowActions } from './hooks/useSavedViewRowActions';
import { useSaveNewView } from './hooks/useSaveNewView';
import { useSavedViewsList } from './hooks/useSavedViewsList';
import SavedViewHoverCard from './SavedViewHoverCard';
import SavedViewsEmptyState from './SavedViewsEmptyState';
import SavedViewsListSection from './SavedViewsListSection';
import SaveViewModal from './SaveViewModal';
import {
	PendingSavedViewAction,
	SavedViewRowActionKey,
	SavedViewsListRowHoverProps,
} from './types';

import styles from './SavedViewsList.module.scss';

function SavedViewsList({
	source,
	search,
}: {
	source: SavedviewtypesSourceDTO;
	search: string;
}): JSX.Element {
	const { viewKey } = useGetSavedViewParams();
	const { selectView, clearView, createView, isSaving } =
		useSavedViewActions(source);
	const saveNewView = useSaveNewView(createView);
	const { createdByMe, createdByOthers, isLoading, isError, refetch } =
		useSavedViewsList(source, search);
	const { copyViewLink, renameView, deleteView, isRenaming, isDeleting } =
		useSavedViewRowActions(source);
	const [pendingAction, setPendingAction] =
		useState<PendingSavedViewAction | null>(null);
	const listRef = useRef<HTMLDivElement>(null);
	const { deniedPermissions: deniedReadPermissions } = useAuthZ([
		SavedViewReadPermission,
	]);
	const isReadDenied = deniedReadPermissions.length > 0;
	const hoverCard = useSavedViewHoverCard();
	const {
		onRowEnter: onHoverCardRowEnter,
		onRowLeave: onHoverCardRowLeave,
		close: closeHoverCard,
	} = hoverCard;

	useEffect(() => {
		closeHoverCard();
	}, [search, closeHoverCard]);

	const rowHover = useMemo<SavedViewsListRowHoverProps>(
		() => ({
			onRowEnter: (view, row): void => {
				const listTop = listRef.current?.getBoundingClientRect().top ?? 0;
				const rowRect = row.getBoundingClientRect();
				onHoverCardRowEnter({
					view,
					anchorTop: rowRect.top - listTop,
					anchorHeight: rowRect.height,
				});
			},
			onRowLeave: onHoverCardRowLeave,
			onMenuOpen: closeHoverCard,
		}),
		[onHoverCardRowEnter, onHoverCardRowLeave, closeHoverCard],
	);

	const handleAction = useCallback(
		(view: SavedviewtypesSavedViewDTO, key: SavedViewRowActionKey): void => {
			if (key === 'copyLink') {
				copyViewLink(view);
				return;
			}
			closeHoverCard();
			setPendingAction({ key, view });
		},
		[copyViewLink, closeHoverCard],
	);

	const closePendingAction = useCallback((): void => setPendingAction(null), []);

	const handleDelete = useCallback(async (): Promise<void> => {
		if (!pendingAction || !(await deleteView(pendingAction.view))) {
			return;
		}
		if (pendingAction.view.id === viewKey) {
			clearView();
		}
		setPendingAction(null);
	}, [pendingAction, deleteView, viewKey, clearView]);

	if (isLoading) {
		return (
			<div className={styles.loading} data-testid="saved-views-list-loading">
				{Array.from({ length: SAVED_VIEWS_LIST_LOADING_ROWS }, (_, index) => (
					<Skeleton.Input key={index} active size="small" block />
				))}
			</div>
		);
	}

	if (isError) {
		return (
			<div className={styles.state} data-testid="saved-views-list-error">
				<Typography.Text className={styles.stateText}>
					Could not load views
				</Typography.Text>
				<Button
					variant="outlined"
					color="secondary"
					size="sm"
					onClick={refetch}
					data-testid="saved-views-list-retry"
				>
					Retry
				</Button>
			</div>
		);
	}

	if (createdByMe.length === 0 && createdByOthers.length === 0) {
		return (
			<SavedViewsEmptyState
				isSearching={search.trim().length > 0}
				isSaving={isSaving}
				onSave={saveNewView}
			/>
		);
	}

	return (
		<div
			ref={listRef}
			className={styles.list}
			onScrollCapture={closeHoverCard}
			data-testid="saved-views-list"
		>
			{createdByMe.length > 0 && (
				<SavedViewsListSection
					title="Created by me"
					views={createdByMe}
					activeViewId={viewKey}
					onSelect={selectView}
					onClear={clearView}
					onAction={handleAction}
					hover={rowHover}
					isReadDenied={isReadDenied}
					testId="saved-views-created-by-me"
				/>
			)}
			{createdByOthers.length > 0 && (
				<SavedViewsListSection
					title="Created by others"
					views={createdByOthers}
					activeViewId={viewKey}
					onSelect={selectView}
					onClear={clearView}
					onAction={handleAction}
					hover={rowHover}
					isReadDenied={isReadDenied}
					testId="saved-views-created-by-others"
				/>
			)}
			<SavedViewHoverCard
				target={hoverCard.target}
				onCardEnter={hoverCard.onCardEnter}
				onCardLeave={hoverCard.onCardLeave}
				onClose={closeHoverCard}
			/>
			{pendingAction?.key === 'editDetails' && (
				<SaveViewModal
					mode="edit"
					initialName={pendingAction.view.spec.displayName}
					isSaving={isRenaming}
					onClose={closePendingAction}
					onSave={(displayName): Promise<boolean> =>
						renameView(pendingAction.view, displayName)
					}
				/>
			)}
			{pendingAction?.key === 'delete' && (
				<DeleteSavedViewDialog
					isDeleting={isDeleting}
					onCancel={closePendingAction}
					onConfirm={(): void => {
						void handleDelete();
					}}
				/>
			)}
		</div>
	);
}

export default SavedViewsList;
