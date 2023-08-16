import { LogViewMode } from 'container/LogsTable';

import { OrderPreferenceItems, viewModeOptionList } from './config';

export const isLogViewMode = (value: unknown): value is LogViewMode =>
	typeof value === 'string' &&
	viewModeOptionList.some((option) => option.key === value);

export const getIdConditions = (
	idStart: string,
	idEnd: string,
	order: OrderPreferenceItems,
): Record<string, string> => {
	const idConditions: Record<string, string> = {};

	if (idStart && order === OrderPreferenceItems.ASC) {
		idConditions.idLt = idStart;
	} else if (idStart) {
		idConditions.idGt = idStart;
	}

	if (idEnd && order === OrderPreferenceItems.ASC) {
		idConditions.idGt = idEnd;
	} else if (idEnd) {
		idConditions.idLt = idEnd;
	}

	return idConditions;
};
