import { EQueryType } from 'types/common/dashboard';

import { EQueryTypeToQueryKeyMapping } from '../types';

export const getQueryKey = (
	queryCategory: EQueryType,
): EQueryTypeToQueryKeyMapping => {
	return EQueryTypeToQueryKeyMapping[
		EQueryType[queryCategory] as keyof typeof EQueryTypeToQueryKeyMapping
	];
};
