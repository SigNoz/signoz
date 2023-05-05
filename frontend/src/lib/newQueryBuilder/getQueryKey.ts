import { QUERY_TYPES } from 'constants/queryBuilder';
import { EQueryTypeToQueryKeyMapping } from 'container/NewWidget/LeftContainer/QuerySection/types';
import { EQueryType } from 'types/common/dashboard';

export const getQueryKeyString = (
	queryType: EQueryType,
): EQueryTypeToQueryKeyMapping => {
	const label = EQueryType[
		queryType
	] as keyof typeof EQueryTypeToQueryKeyMapping;
	const queryKey: EQueryTypeToQueryKeyMapping =
		EQueryTypeToQueryKeyMapping[label];

	return queryKey;
};

export const getQueryKeyNumber = (
	queryType: EQueryTypeToQueryKeyMapping,
): EQueryType => {
	const queryKey: number = EQueryType[QUERY_TYPES[queryType]];

	return queryKey;
};
