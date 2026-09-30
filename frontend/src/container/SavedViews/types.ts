import { ReactElement } from 'react';
import type { Link } from '@signozhq/icons';
import {
	SavedviewtypesSavedViewDTO,
	SavedviewtypesSourceDTO,
} from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { OptionsQuery } from 'container/OptionsMenu/types';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

export type SavedViewSourcePage = DataSource | 'meter';

export type SavedViewOptions = Pick<
	OptionsQuery,
	'selectColumns' | 'format' | 'maxLines' | 'fontSize'
>;

export interface ToSavedViewSpecArgs {
	query: Query;
	panelType: PANEL_TYPES;
	displayName: string;
	options?: SavedViewOptions;
	color?: string;
}

export interface HasUnsavedViewChangesArgs {
	view: SavedviewtypesSavedViewDTO;
	stagedQuery: Query | null;
	panelType: PANEL_TYPES;
	options?: SavedViewOptions;
}

export interface UseLastUsedViewResult {
	getLastUsedViewKey: () => string | undefined;
	setLastUsedView: (id: string, displayName: string) => void;
	clearLastUsedView: () => void;
}

export interface UseActiveSavedViewResult {
	view: SavedviewtypesSavedViewDTO | undefined;
	isLoading: boolean;
	isError: boolean;
	hasUnsavedChanges: boolean;
}

export interface UseSavedViewActionsResult {
	selectView: (view: SavedviewtypesSavedViewDTO) => void;
	revertView: (view: SavedviewtypesSavedViewDTO) => void;
	clearView: () => void;
	createView: (displayName: string) => Promise<string | undefined>;
	updateView: (view: SavedviewtypesSavedViewDTO) => Promise<boolean>;
	isSaving: boolean;
}

export interface UseRestoreLastUsedViewArgs {
	source: SavedviewtypesSourceDTO;
	selectView: UseSavedViewActionsResult['selectView'];
}

export type SaveViewModalMode = 'create' | 'saveAsNew' | 'edit';

export interface SaveViewModalProps {
	mode: SaveViewModalMode;
	initialName?: string;
	isSaving: boolean;
	onClose: () => void;
	// Resolves true when saved; the modal stays open otherwise.
	onSave: (displayName: string) => Promise<boolean>;
}

export interface SaveChangesMenuProps {
	disabled: boolean;
	onSaveAsNew: () => void;
	onUpdate: () => void;
}

export interface SavedViewsIconButtonProps {
	title: string;
	icon: ReactElement;
	testId: string;
	color?: 'secondary' | 'warning';
	disabled?: boolean;
	onClick?: () => void;
}

export interface UseSavedViewsListResult {
	createdByMe: SavedviewtypesSavedViewDTO[];
	createdByOthers: SavedviewtypesSavedViewDTO[];
	isLoading: boolean;
	isError: boolean;
	refetch: () => void;
}

export interface SavedViewsListSectionProps {
	title: string;
	views: SavedviewtypesSavedViewDTO[];
	activeViewId?: string;
	onSelect: (view: SavedviewtypesSavedViewDTO) => void;
	onClear: () => void;
	onAction: SavedViewsListRowProps['onAction'];
	hover: SavedViewsListRowHoverProps;
	testId: string;
}

export interface SavedViewsListRowProps {
	view: SavedviewtypesSavedViewDTO;
	isActive: boolean;
	onSelect: (view: SavedviewtypesSavedViewDTO) => void;
	onClear: () => void;
	onAction: (
		view: SavedviewtypesSavedViewDTO,
		key: SavedViewRowActionKey,
	) => void;
	hover: SavedViewsListRowHoverProps;
}

export type SavedViewRowActionKey = 'copyLink' | 'editDetails' | 'delete';

export interface SavedViewRowActionConfig {
	key: SavedViewRowActionKey;
	label: string;
	icon: typeof Link;
	danger?: boolean;
	hasDividerBefore?: boolean;
}

export interface PendingSavedViewAction {
	key: Exclude<SavedViewRowActionKey, 'copyLink'>;
	view: SavedviewtypesSavedViewDTO;
}

export interface SavedViewsRowButtonProps {
	icon: ReactElement;
	label: string;
	tooltip?: string;
	testId: string;
	onClick?: () => void;
	onPointerDown?: () => void;
	onKeyDown?: () => void;
}

export interface SavedViewsRowMenuProps {
	onAction: (key: SavedViewRowActionKey) => void;
	onOpen: () => void;
}

export interface DeleteSavedViewDialogProps {
	isDeleting: boolean;
	onCancel: () => void;
	onConfirm: () => void;
}

export interface UseSavedViewRowActionsResult {
	copyViewLink: (view: SavedviewtypesSavedViewDTO) => void;
	renameView: (
		view: SavedviewtypesSavedViewDTO,
		displayName: string,
	) => Promise<boolean>;
	deleteView: (view: SavedviewtypesSavedViewDTO) => Promise<boolean>;
	isRenaming: boolean;
	isDeleting: boolean;
}

export interface SavedViewHoverCardTarget {
	view: SavedviewtypesSavedViewDTO;
	anchorTop: number;
	anchorHeight: number;
}

export interface UseSavedViewHoverCardResult {
	target: SavedViewHoverCardTarget | null;
	onRowEnter: (target: SavedViewHoverCardTarget) => void;
	onRowLeave: () => void;
	onCardEnter: () => void;
	onCardLeave: () => void;
	close: () => void;
}

export interface SavedViewHoverCardProps {
	target: SavedViewHoverCardTarget | null;
	onCardEnter: () => void;
	onCardLeave: () => void;
	onClose: () => void;
}

export interface SavedViewsListRowHoverProps {
	onRowEnter: (view: SavedviewtypesSavedViewDTO, row: HTMLElement) => void;
	onRowLeave: () => void;
	onMenuOpen: () => void;
}

export interface SavedViewQuerySummary {
	queryName: string;
	expression: string;
	metric?: string;
}

export interface HighlightedQueryPart {
	from: number;
	text: string;
	color?: string;
}

export interface SavedViewsEmptyStateProps {
	isSearching: boolean;
	isSaving: boolean;
	onSave: (displayName: string) => Promise<boolean>;
}
