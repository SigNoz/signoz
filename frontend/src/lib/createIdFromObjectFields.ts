import { idDivider } from 'constants/queryBuilder';

export const createIdFromObjectFields = <T, K extends keyof T>(
	obj: T,
	keys?: K[],
): string => {
	const currentObj = obj as Record<string, unknown>;
	const currentKeys = keys ?? (Object.keys(currentObj) as K[]);

	return currentKeys.map((key) => obj[key]).join(idDivider);
};
