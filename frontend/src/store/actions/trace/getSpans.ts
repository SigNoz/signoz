import { NotificationInstance } from 'antd/es/notification/interface';
import getSpans from 'api/trace/getSpans';
import { Dispatch, Store } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import {
	UPDATE_TRACE_GRAPH_ERROR,
	UPDATE_TRACE_GRAPH_LOADING,
	UPDATE_TRACE_GRAPH_SUCCESS,
} from 'types/actions/trace';
import { Props } from 'types/api/trace/getSpans';

export const GetSpans = (
	props: GetSpansProps,
	notify: NotificationInstance,
): ((
	dispatch: Dispatch<AppActions>,
	getState: Store<AppState>['getState'],
) => void) => {
	const defaultMessage = 'Something went wrong';

	return async (dispatch, getState): Promise<void> => {
		try {
			const { traces, globalTime } = getState();
			const { spansGraph } = traces;

			if (globalTime.maxTime !== props.end && globalTime.minTime !== props.start) {
				return;
			}

			const { selectedTime } = globalTime;

			if (traces.filterLoading) {
				return;
			}

			// @TODO refactor this logic when share url functionlity is updated
			const isCustomSelected = selectedTime === 'custom';

			const end = isCustomSelected
				? globalTime.maxTime + 15 * 60 * 1000000000
				: props.end;

			const start = isCustomSelected
				? globalTime.minTime - 15 * 60 * 1000000000
				: props.start;

			if (!spansGraph.loading) {
				dispatch({
					type: UPDATE_TRACE_GRAPH_LOADING,
					payload: {
						loading: true,
					},
				});
			}

			const response = await getSpans({
				end,
				function: props.function,
				groupBy: props.groupBy,
				selectedFilter: props.selectedFilter,
				selectedTags: props.selectedTags,
				start,
				step: props.step,
				isFilterExclude: props.isFilterExclude,
				spanKind: props.spanKind,
			});

			if (response.statusCode === 200) {
				dispatch({
					type: UPDATE_TRACE_GRAPH_SUCCESS,
					payload: {
						data: response.payload,
					},
				});
			} else {
				notify.error({
					message: response.error || defaultMessage,
				});
				dispatch({
					type: UPDATE_TRACE_GRAPH_ERROR,
					payload: {
						error: true,
						errorMessage: response.error || defaultMessage,
					},
				});
			}
		} catch (error) {
			dispatch({
				type: UPDATE_TRACE_GRAPH_ERROR,
				payload: {
					error: true,
					errorMessage: (error as Error)?.toString() || defaultMessage,
				},
			});
		}
	};
};

export type GetSpansProps = Props;
