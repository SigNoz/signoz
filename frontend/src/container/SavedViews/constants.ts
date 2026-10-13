import {
	SavedviewtypesSchemaVersionDTO,
	SavedviewtypesSourceDTO,
} from 'api/generated/services/sigNoz.schemas';
import { QueryParams } from 'constants/query';
import { DataSource } from 'types/common/queryBuilder';

import { SaveViewModalMode } from './types';

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

export const SAVE_VIEW_MODAL_TITLE: Record<SaveViewModalMode, string> = {
	create: 'Create new view',
	saveAsNew: 'Save as new view',
};

export const SAVED_VIEW_TOAST_POSITION = 'top-right' as const;
