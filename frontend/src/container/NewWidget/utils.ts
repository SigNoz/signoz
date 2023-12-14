import { omitIdFromQuery } from 'components/ExplorerCard/utils';
import { isEqual } from 'lodash-es';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

export const getIsQueryModified = (
	currentQuery: Query,
	stagedQuery: Query | null,
): boolean => {
	if (!stagedQuery) {
		return false;
	}
	const omitIdFromStageQuery = omitIdFromQuery(stagedQuery);
	const omitIdFromCurrentQuery = omitIdFromQuery(currentQuery);
	return !isEqual(omitIdFromStageQuery, omitIdFromCurrentQuery);
};
