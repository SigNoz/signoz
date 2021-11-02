import getSpansAggregate from 'api/trace/getSpanAggregate';
import { Dispatch } from 'redux';
import store from 'store';
import AppActions from 'types/actions';
import { TraceReducer } from 'types/reducer/trace';

export const GetSpanAggregate = ({
	selectedAggOption,
	selectedEntity,
	selectedKind,
	selectedLatency,
	selectedOperation,
	selectedService,
	selectedTags,
}: SpanAggregateProps): ((dispatch: Dispatch<AppActions>) => void) => {
	return async (dispatch: Dispatch<AppActions>): Promise<void> => {
		try {
			dispatch({
				type: 'UPDATE_SPANS_LOADING',
				payload: {
					loading: true,
				},
			});
			const { globalTime } = store.getState();
			const { minTime, maxTime } = globalTime;

			const [spanAggregateResponse] = await Promise.all([
				getSpansAggregate({
					aggregation_option: selectedAggOption,
					dimension: selectedEntity,
					end: maxTime,
					kind: selectedKind,
					maxDuration: selectedLatency.max,
					minDuration: selectedLatency.min,
					operation: selectedOperation,
					service: selectedService,
					start: minTime,
					step: '60',
					tags: JSON.stringify(selectedTags),
				}),
			]);

			if (spanAggregateResponse.statusCode === 400) {
				return;
			}

			if (spanAggregateResponse.statusCode === 200) {
				dispatch({
					type: 'UPDATE_SPAN_AGGREDATE_SUCCESS',
					payload: {
						spansAggregate: spanAggregateResponse.payload || [],
					},
				});

				dispatch({
					type: 'UPDATE_SPANS_LOADING',
					payload: {
						loading: false,
					},
				});
			} else {
				dispatch({
					type: 'UPDATE_SPANS_LOADING',
					payload: {
						loading: false,
					},
				});
			}

			dispatch({
				type: 'UPDATE_SELECTED_ENTITY',
				payload: {
					selectedEntity,
				},
			});
			dispatch({
				type: 'UPDATE_SELECTED_AGG_OPTION',
				payload: {
					selectedAggOption,
				},
			});
		} catch (error) {
			dispatch({
				type: 'UPDATE_SPANS_LOADING',
				payload: {
					loading: false,
				},
			});
		}
	};
};

export interface SpanAggregateProps {
	selectedAggOption: TraceReducer['selectedAggOption'];
	selectedEntity: TraceReducer['selectedEntity'];
	selectedKind: TraceReducer['selectedKind'];
	selectedLatency: TraceReducer['selectedLatency'];
	selectedOperation: TraceReducer['selectedOperation'];
	selectedService: TraceReducer['selectedService'];
	selectedTags: TraceReducer['selectedTags'];
}
