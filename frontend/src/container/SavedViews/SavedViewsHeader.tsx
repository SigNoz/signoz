import { useCallback, useState } from 'react';
import cx from 'classnames';
import { ArrowUpToLine, List, Plus, Undo2, X } from '@signozhq/icons';
import { Skeleton } from '@signozhq/ui/skeleton';
import { toast } from '@signozhq/ui/sonner';
import { Tooltip } from '@signozhq/ui/tooltip';
import { SavedviewtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';
import { useGetSavedViewParams } from 'hooks/saveViews/useGetSavedViewParams';
import AuthZTooltip from 'lib/authz/components/AuthZTooltip/AuthZTooltip';
import {
	buildSavedViewReadPermission,
	SavedViewCreatePermission,
	SavedViewListPermission,
} from 'lib/authz/hooks/useAuthZ/permissions/saved-view.permissions';

import {
	MY_VIEW_NAME,
	SAVED_VIEW_FORBIDDEN_NAME,
	SAVED_VIEW_LOAD_FAILED_NAME,
	SAVED_VIEW_TOAST_POSITION,
} from './constants';
import { SavedViewCreatedFrom } from './events';
import { useActiveSavedView } from './hooks/useActiveSavedView';
import { useSaveNewView } from './hooks/useSaveNewView';
import { useSavedViewActions } from './hooks/useSavedViewActions';
import SaveChangesMenu from './SaveChangesMenu';
import SavedViewsIconButton from './SavedViewsIconButton';
import SaveViewModal from './SaveViewModal';
import { SaveViewModalMode } from './types';

import styles from './SavedViewsHeader.module.scss';

function SavedViewsHeader({
	source,
	onOpenViews,
	onCollapse,
}: {
	source: SavedviewtypesSourceDTO;
	// Absent while the list is on screen.
	onOpenViews?: () => void;
	onCollapse?: () => void;
}): JSX.Element {
	const {
		view,
		isLoading,
		isError,
		isReadDenied,
		errorMessage,
		hasUnsavedChanges,
	} = useActiveSavedView(source);
	const { viewKey } = useGetSavedViewParams();
	const readPermission = buildSavedViewReadPermission(viewKey);
	const { revertView, clearView, createView, updateView, isSaving } =
		useSavedViewActions(source);

	const [modalMode, setModalMode] = useState<SaveViewModalMode | null>(null);

	const saveNewView = useSaveNewView(createView);
	const handleSave = useCallback(
		(displayName: string): Promise<boolean> =>
			saveNewView(
				displayName,
				modalMode === 'saveAsNew'
					? SavedViewCreatedFrom.SaveAsNew
					: SavedViewCreatedFrom.Header,
			),
		[saveNewView, modalMode],
	);

	const handleUpdate = useCallback(async (): Promise<void> => {
		if (view && (await updateView(view))) {
			toast.success('View updated', { position: SAVED_VIEW_TOAST_POSITION });
		}
	}, [view, updateView]);

	const openSaveAsNew = useCallback((): void => setModalMode('saveAsNew'), []);
	const closeModal = useCallback((): void => setModalMode(null), []);

	let name = view?.spec.displayName ?? MY_VIEW_NAME;
	if (isReadDenied) {
		name = SAVED_VIEW_FORBIDDEN_NAME;
	} else if (isError) {
		name = SAVED_VIEW_LOAD_FAILED_NAME;
	}
	const isDirty = !isError && !!view && hasUnsavedChanges;

	const nameChip = (
		<span
			className={cx(styles.name, {
				[styles.isDirty]: isDirty,
				[styles.isError]: isError,
			})}
			data-testid="saved-views-name"
		>
			{isDirty && <span className={styles.dot} />}
			<span className={styles.nameText}>{name}</span>
		</span>
	);

	return (
		<div
			className={cx(styles.header, {
				[styles.isDirty]: isDirty,
				[styles.isError]: isError,
			})}
			data-testid="saved-views-header"
			data-source={source}
		>
			<div className={styles.viewTitle}>
				{!isDirty && onOpenViews && (
					<SavedViewsIconButton
						title="All views"
						icon={<List size={14} />}
						checks={[SavedViewListPermission]}
						onClick={onOpenViews}
						testId="saved-views-open"
					/>
				)}
				{isLoading ? (
					<Skeleton.Input
						active
						size="small"
						className={styles.skeleton}
						testId="saved-views-loading"
					/>
				) : isReadDenied ? (
					<AuthZTooltip checks={[readPermission]}>{nameChip}</AuthZTooltip>
				) : (
					<Tooltip title={errorMessage ?? name}>{nameChip}</Tooltip>
				)}
			</div>

			<div className={styles.actions}>
				{!view && (
					<SavedViewsIconButton
						title="Create new view"
						icon={<Plus size={14} />}
						disabled={isLoading}
						disabledTooltip="Loading views"
						checks={[SavedViewCreatePermission]}
						onClick={(): void => setModalMode('create')}
						testId="saved-views-create"
					/>
				)}
				{(isError || (view && !isDirty)) && (
					<SavedViewsIconButton
						title="Clear view"
						icon={<Undo2 size={14} />}
						onClick={clearView}
						testId="saved-views-clear"
					/>
				)}
				{view && isDirty && (
					<>
						<SaveChangesMenu
							viewId={view.id}
							disabled={isSaving}
							onSaveAsNew={openSaveAsNew}
							onUpdate={(): void => {
								void handleUpdate();
							}}
						/>
						<SavedViewsIconButton
							title="Discard changes"
							icon={<X size={14} />}
							color="warning"
							disabled={isSaving}
							disabledTooltip="Saving the view"
							onClick={(): void => revertView(view)}
							testId="saved-views-discard"
						/>
					</>
				)}
				{onCollapse && (
					<SavedViewsIconButton
						title="Collapse Filters"
						icon={<ArrowUpToLine size={14} className={styles.collapseIcon} />}
						onClick={onCollapse}
						testId="saved-views-collapse"
					/>
				)}
			</div>

			{modalMode && (
				<SaveViewModal
					mode={modalMode}
					isSaving={isSaving}
					onClose={closeModal}
					onSave={handleSave}
				/>
			)}
		</div>
	);
}

export default SavedViewsHeader;
