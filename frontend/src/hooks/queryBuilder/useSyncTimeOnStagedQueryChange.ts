import { useEffect, useRef } from 'react';
// eslint-disable-next-line no-restricted-imports
import { useDispatch, useSelector } from 'react-redux';
import { UpdateTimeInterval } from 'store/actions';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

// Push fresh min/max back into Redux whenever the staged query changes for a
// relative time interval. The data hooks that read minTime/maxTime from Redux
// otherwise keep refetching with the originally frozen window and the time
// picker displays a stale absolute range.
// ref - SigNoz/signoz#8277
export function useSyncTimeOnStagedQueryChange(
	stagedQueryId: string | undefined,
): void {
	const dispatch = useDispatch();
	const selectedTime = useSelector<AppState, GlobalReducer['selectedTime']>(
		(state) => state.globalTime.selectedTime,
	);
	const prevStagedQueryIdRef = useRef<string | undefined>();

	useEffect(() => {
		const prevId = prevStagedQueryIdRef.current;
		const currentId = stagedQueryId;
		prevStagedQueryIdRef.current = currentId;

		if (
			prevId !== undefined &&
			currentId !== undefined &&
			prevId !== currentId &&
			selectedTime !== 'custom'
		) {
			dispatch(UpdateTimeInterval(selectedTime));
		}
	}, [stagedQueryId, selectedTime, dispatch]);
}
