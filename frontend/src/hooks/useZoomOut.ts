import { useCallback, useRef } from 'react';
// eslint-disable-next-line no-restricted-imports
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { QueryParams } from 'constants/query';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import { getNextZoomOutRange } from 'lib/zoomOutUtils';
import { UpdateTimeInterval } from 'store/actions';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';
import { persistTimeDurationForRoute } from 'utils/metricsTimeStorageUtils';

export interface UseZoomOutOptions {
	/** When true, the zoom out handler does nothing (e.g. when live logs are enabled) */
	isDisabled?: boolean;
	/** URL params to delete when zooming out (e.g. [QueryParams.activeLogId] for logs) */
	urlParamsToDelete?: string[];
}

/**
 * Reusable hook for zoom-out functionality in explorers (logs, traces, etc.).
 * Computes the next time range using the zoom-out ladder, updates Redux global time,
 * and navigates with the new URL params.
 */
const EMPTY_PARAMS: string[] = [];

export function useZoomOut(options: UseZoomOutOptions = {}): () => void {
	const { isDisabled = false, urlParamsToDelete = EMPTY_PARAMS } = options;
	const urlParamsToDeleteRef = useRef(urlParamsToDelete);
	urlParamsToDeleteRef.current = urlParamsToDelete;

	const dispatch = useDispatch();
	const { minTime, maxTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const urlQuery = useUrlQuery();
	const location = useLocation();
	const { safeNavigate } = useSafeNavigate();

	return useCallback((): void => {
		if (isDisabled) {
			return;
		}
		const minMs = Math.floor((minTime ?? 0) / 1e6);
		const maxMs = Math.floor((maxTime ?? 0) / 1e6);
		const result = getNextZoomOutRange(minMs, maxMs);
		if (!result) {
			return;
		}
		const [newStartMs, newEndMs] = result.range;
		const { preset } = result;

		if (preset) {
			dispatch(UpdateTimeInterval(preset));
			urlQuery.delete(QueryParams.startTime);
			urlQuery.delete(QueryParams.endTime);
			urlQuery.set(QueryParams.relativeTime, preset);
			persistTimeDurationForRoute(location.pathname, preset);
		} else {
			dispatch(UpdateTimeInterval('custom', [newStartMs, newEndMs]));
			urlQuery.set(QueryParams.startTime, String(newStartMs));
			urlQuery.set(QueryParams.endTime, String(newEndMs));
			urlQuery.delete(QueryParams.relativeTime);
		}
		for (const param of urlParamsToDeleteRef.current) {
			urlQuery.delete(param);
		}
		safeNavigate(`${location.pathname}?${urlQuery.toString()}`);
	}, [
		dispatch,
		isDisabled,
		location.pathname,
		maxTime,
		minTime,
		safeNavigate,
		urlQuery,
	]);
}
