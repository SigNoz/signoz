import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { getFieldContextPrefix } from 'utils/fieldKeyContext';

export const buildDefaultLegendFromGroupBy = (
	groupBy: IBuilderQuery['groupBy'],
): string | null => {
	const segments = groupBy
		.map((item) => item?.key)
		.filter((key): key is string => Boolean(key))
		// Series labels carry the bare name; a stored key may carry a context prefix.
		.map((key) => `${key} = {{${getFieldContextPrefix(key)?.remainder ?? key}}}`);

	if (segments.length === 0) {
		return null;
	}

	return segments.join(', ');
};
