import { LogViewMode } from 'container/LogsTable';

import { viewModeOptionList } from './config';

export const isLogViewMode = (value: unknown): value is LogViewMode =>
	typeof value === 'string' &&
	viewModeOptionList.some((option) => option.key === value);
