import { ReactElement } from 'react';
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

export type SaveViewModalMode = 'create' | 'saveAsNew';

export interface SaveViewModalProps {
	mode: SaveViewModalMode;
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
