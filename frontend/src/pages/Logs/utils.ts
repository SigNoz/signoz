import { LogViewMode } from 'container/LogsTable';

import { viewModeOptionList } from './config';

export const LOGS_VIEW_MODE = 'LOGS_VIEW_MODE';
export const LOGS_LINES_PER_ROW = 'LOGS_LINES_PER_ROW';

export const isLogViewMode = (value: unknown): value is LogViewMode =>
	typeof value === 'string' &&
	viewModeOptionList.some((option) => option.key === value);
