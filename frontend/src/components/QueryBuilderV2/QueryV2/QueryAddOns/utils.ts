import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

export const buildDefaultLegendFromGroupBy = (
	groupBy: IBuilderQuery['groupBy'],
): string | null => {
	if (!Array.isArray(groupBy) || groupBy.length === 0) {
		return null;
	}

	const segments = groupBy
		.map((item) => item?.key)
		.filter((key): key is string => Boolean(key))
		.map((key) => `${key} = {{${key}}}`);

	if (segments.length === 0) {
		return null;
	}

	return segments.join(', ');
};
