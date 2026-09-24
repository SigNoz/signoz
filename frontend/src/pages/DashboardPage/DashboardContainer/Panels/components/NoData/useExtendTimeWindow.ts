// eslint-disable-next-line no-restricted-imports -- global time lives in redux; V2 time dispatch is not yet migrated
import { useSelector } from 'react-redux';
import { useZoomOut } from 'hooks/useZoomOut';
import { getNextZoomOutRange } from 'lib/zoomOutUtils';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import { buildExtendWindow, ExtendTimeWindow } from './extendWindow';
import { NANO_SECOND_MULTIPLIER } from '@/store/globalTime';

/**
 * Default empty-state extender: widen the dashboard's global time via the shared
 * zoom-out ladder. Dispatch + URL sync live in `useZoomOut`; the View modal
 * overrides this with its own local extender via the store.
 */
export function useExtendTimeWindow(): ExtendTimeWindow {
	const { minTime, maxTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const extend = useZoomOut();
	const result = getNextZoomOutRange(
		Math.floor(minTime / NANO_SECOND_MULTIPLIER),
		Math.floor(maxTime / NANO_SECOND_MULTIPLIER),
	);
	return buildExtendWindow(result, extend);
}
