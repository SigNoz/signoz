import { useMemo } from 'react';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import { NANO_SECOND_MULTIPLIER } from 'store/globalTime';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import { QuickFilterCheckboxUseFieldApis } from '../types';

export function useSignalFieldApis(): QuickFilterCheckboxUseFieldApis {
	const { minTime, maxTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	return useMemo(
		() => ({
			startUnixMilli: Math.floor(minTime / NANO_SECOND_MULTIPLIER),
			endUnixMilli: Math.floor(maxTime / NANO_SECOND_MULTIPLIER),
			existingQuery: null,
		}),
		[minTime, maxTime],
	);
}
