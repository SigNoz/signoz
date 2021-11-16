import getSpansAggregate from 'api/trace/getSpanAggregate';
import { AxiosError } from 'axios';
import { Dispatch } from 'redux';
import store from 'store';
import AppActions from 'types/actions';
import { TraceReducer } from 'types/reducer/trace';

export const GetTraceVisualAggregates = ({
	selectedEntity,
	selectedAggOption,
}: GetTraceVisualAggregatesProps): ((
	dispatch: Dispatch<AppActions>,
) => void) => {
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
				selectedTags,
			} = trace;

			const { selectedTime, maxTime, minTime } = globalTime;

			const isCustomSelected = selectedTime === 'custom';

			const end = isCustomSelected
				? globalTime.maxTime + 15 * 60 * 1000000000
				: maxTime;

			const start = isCustomSelected
				? globalTime.minTime - 15 * 60 * 1000000000
				: minTime;

			const [spanAggregateResponse] = await Promise.all([
				getSpansAggregate({
					aggregation_option: selectedAggOption,
					dimension: selectedEntity,
					end,
					start,
					kind: selectedKind || '',
					maxDuration: selectedLatency.max || '',
					minDuration: selectedLatency.min || '',
					operation: selectedOperation || '',
					service: selectedService || '',
					step: '60',
					tags: JSON.stringify(selectedTags) || '[]',
				}),
			]);

			if (spanAggregateResponse.statusCode === 200) {
				dispatch({
					type: 'UPDATE_AGGREGATES',
					payload: {
						spansAggregate: spanAggregateResponse.payload,
						selectedAggOption,
						selectedEntity,
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

export interface GetTraceVisualAggregatesProps {
	selectedAggOption: TraceReducer['selectedAggOption'];
	selectedEntity: TraceReducer['selectedEntity'];
}
