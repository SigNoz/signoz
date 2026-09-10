import { useMemo } from 'react';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import {
	TelemetrytypesSignalDTO,
	TelemetrytypesSourceDTO,
} from 'api/generated/services/sigNoz.schemas';
import { NANO_SECOND_MULTIPLIER } from 'store/globalTime';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import { QuickFilterCheckboxUseFieldApis } from '../types';

export function useSignalFieldApis(
	signal: TelemetrytypesSignalDTO,
	source?: TelemetrytypesSourceDTO,
): QuickFilterCheckboxUseFieldApis {
	const { minTime, maxTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	return useMemo(
		() => ({
			signal,
			source,
			startUnixMilli: Math.floor(minTime / NANO_SECOND_MULTIPLIER),
			endUnixMilli: Math.floor(maxTime / NANO_SECOND_MULTIPLIER),
			existingQuery: null,
		}),
		[signal, source, minTime, maxTime],
	);
}
