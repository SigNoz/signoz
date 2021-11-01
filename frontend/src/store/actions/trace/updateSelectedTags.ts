import getSpan from 'api/trace/getSpan';
import { AxiosError } from 'axios';
import { Dispatch } from 'redux';
import store from 'store';
import AppActions from 'types/actions';
import { TraceReducer } from 'types/reducer/trace';

export const UpdateSelectedTags = (
	selectedTags: TraceReducer['selectedTags'],
): ((dispatch: Dispatch<AppActions>) => void) => {
	return async (dispatch: Dispatch<AppActions>): Promise<void> => {
		try {
			const { trace, globalTime } = store.getState();
			const {
				selectedKind,
				selectedLatency,
				selectedOperation,
				selectedService,
			} = trace;

			const { maxTime, minTime } = globalTime;

			const [spanResponse] = await Promise.all([
				getSpan({
					start: minTime,
					end: maxTime,
					kind: selectedKind || '',
					limit: '100',
					lookback: '2d',
					maxDuration: selectedLatency.max || '',
					minDuration: selectedLatency.min || '',
					operation: selectedOperation || '',
					service: selectedService || '',
					tags: JSON.stringify(selectedTags),
				}),
			]);

			if (spanResponse.statusCode === 200) {
				dispatch({
					type: 'UPDATE_TRACE_SELECTED_TAGS',
					payload: {
						selectedTags,
						spansList: spanResponse.payload,
					},
				});
			}
		} catch (error) {
			dispatch({
				type: 'GET_TRACE_INITIAL_DATA_ERROR',
				payload: {
					errorMessage: (error as AxiosError).toString() || 'Something went wrong',
				},
			});
		}
	};
};
