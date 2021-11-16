import getSpan from 'api/trace/getSpan';
import getSpansAggregate from 'api/trace/getSpanAggregate';
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
			dispatch({
				type: 'UPDATE_SPANS_LOADING',
				payload: {
					loading: true,
				},
			});

			const { trace, globalTime } = store.getState();
			const {
				selectedKind,
				selectedLatency,
				selectedOperation,
				selectedService,
				selectedAggOption,
				selectedEntity,
				spansAggregate,
			} = trace;

			const { maxTime, minTime } = globalTime;

			const [spanResponse, spansAggregateResponse] = await Promise.all([
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
				getSpansAggregate({
					aggregation_option: selectedAggOption,
					dimension: selectedEntity,
					end: maxTime,
					kind: selectedKind || '',
					maxDuration: selectedLatency.max || '',
					minDuration: selectedLatency.min || '',
					operation: selectedOperation || '',
					service: selectedService || '',
					start: minTime,
					step: '60',
					tags: JSON.stringify(selectedTags),
				}),
			]);

			const condition =
				spansAggregateResponse.statusCode === 200 ||
				spansAggregateResponse.statusCode === 400;

			if (spanResponse.statusCode === 200 && condition) {
				dispatch({
					type: 'UPDATE_TRACE_SELECTED_TAGS',
					payload: {
						selectedTags,
						spansList: spanResponse.payload,
						spansAggregate:
							spansAggregateResponse.statusCode === 400
								? spansAggregate
								: spansAggregateResponse.payload || [],
					},
				});
			}
			dispatch({
				type: 'UPDATE_SPANS_LOADING',
				payload: {
					loading: false,
				},
			});
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
