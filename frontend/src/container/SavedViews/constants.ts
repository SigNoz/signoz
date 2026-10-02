import { Link, PenLine, Trash2 } from '@signozhq/icons';
import {
	SavedviewtypesSchemaVersionDTO,
	SavedviewtypesSourceDTO,
} from 'api/generated/services/sigNoz.schemas';
import { QueryParams } from 'constants/query';
import {
	buildSavedViewDeletePermission,
	buildSavedViewUpdatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/saved-view.permissions';
import { DataSource } from 'types/common/queryBuilder';

import { SavedViewRowActionConfig, SaveViewModalMode } from './types';

export const SAVED_VIEW_SCHEMA_VERSION = SavedviewtypesSchemaVersionDTO.v2;

// Only the logs and traces explorers have columns and formatting to save.
export const SAVED_VIEW_OPTIONS_DATA_SOURCE: Partial<
	Record<SavedviewtypesSourceDTO, DataSource>
> = {
	[SavedviewtypesSourceDTO.logs]: DataSource.LOGS,
	[SavedviewtypesSourceDTO.traces]: DataSource.TRACES,
};

// What selecting a view writes to the url, so clearing it removes exactly these.
export const SAVED_VIEW_URL_PARAMS = [
	QueryParams.viewKey,
	QueryParams.viewName,
	QueryParams.compositeQuery,
	QueryParams.panelTypes,
];

export const MY_VIEW_NAME = 'My view';

export const SAVED_VIEW_LOAD_FAILED_NAME = 'Saved view failed to load';

export const SAVED_VIEW_FORBIDDEN_NAME = 'No access to this view';

export const SAVED_VIEWS_LIST_LOADING_ROWS = 4;

export const SAVED_VIEW_HOVER_CARD_OPEN_DELAY_MS = 1000;

// Long enough for the pointer to cross from the row into the card.
export const SAVED_VIEW_HOVER_CARD_CLOSE_DELAY_MS = 150;

export const SAVED_VIEW_UPDATED_AT_FORMAT = 'HH:mm:ss — MMM D, YYYY';

export const SAVE_VIEW_MODAL_TITLE: Record<SaveViewModalMode, string> = {
	create: 'Create new view',
	saveAsNew: 'Save as new view',
	edit: 'Edit view details',
};

export const SAVED_VIEW_ROW_ACTIONS: SavedViewRowActionConfig[] = [
	{ key: 'copyLink', label: 'Copy link', icon: Link },
	{
		key: 'editDetails',
		label: 'Edit details',
		icon: PenLine,
		buildPermission: buildSavedViewUpdatePermission,
	},
	{
		key: 'delete',
		label: 'Delete',
		icon: Trash2,
		danger: true,
		hasDividerBefore: true,
		buildPermission: buildSavedViewDeletePermission,
	},
];

export const SAVED_VIEW_TOAST_POSITION = 'top-right' as const;
