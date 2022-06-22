import { EQueryType } from 'types/common/dashboard';

import { EQueryTypeToQueryKeyMapping } from '../types';

export const getQueryKey = (queryCategory) => {
	return EQueryTypeToQueryKeyMapping[EQueryType[queryCategory]];
};
