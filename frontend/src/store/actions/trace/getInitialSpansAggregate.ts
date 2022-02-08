import { Dispatch, Store } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { UPDATE_SPANS_AGGREEGATE } from 'types/actions/trace';
import getSpansAggregate from 'api/trace/getSpansAggregate';
import { GlobalReducer } from 'types/reducer/globalTime';
import { TraceReducer } from 'types/reducer/trace';
import { notification } from 'antd';

export const GetSpansAggregate = (
	props: GetSpansAggregateProps,
): ((
	dispatch: Dispatch<AppActions>,
	getState: Store<AppState>['getState'],
) => void) => {
	return async (dispatch, getState): Promise<void> => {
		const { traces, globalTime } = getState();
		const { spansAggregate } = traces;

		if (
			globalTime.maxTime !== props.maxTime &&
			globalTime.minTime !== props.minTime
		) {
			return;
		}

		if (traces.filterLoading) {
			return;
		}

		try {
			// triggering loading
			dispatch({
				type: UPDATE_SPANS_AGGREEGATE,
				payload: {
					spansAggregate: {
						currentPage: props.current,
						loading: true,
						data: spansAggregate.data,
						error: false,
						total: spansAggregate.total,
						pageSize: props.pageSize,
					},
				},
			});

			const response = await getSpansAggregate({
				end: props.maxTime,
				start: props.minTime,
				selectedFilter: props.selectedFilter,
				limit: props.pageSize,
				offset: props.current * props.pageSize - props.pageSize,
				selectedTags: props.selectedTags,
				isFilterExclude: traces.isFilterExclude,
			});

			if (response.statusCode === 200) {
				dispatch({
					type: UPDATE_SPANS_AGGREEGATE,
					payload: {
						spansAggregate: {
							currentPage: props.current,
							loading: false,
							data: response.payload.spans,
							error: false,
							total: response.payload.totalSpans,
							pageSize: props.pageSize,
						},
					},
				});
			} else {
				notification.error({
					message: response.error || 'Something went wrong',
				});

				dispatch({
					type: UPDATE_SPANS_AGGREEGATE,
					payload: {
						spansAggregate: {
							currentPage: props.current,
							loading: false,
							data: spansAggregate.data,
							error: true,
							total: spansAggregate.total,
							pageSize: props.pageSize,
						},
					},
				});
			}
		} catch (error) {
			dispatch({
				type: UPDATE_SPANS_AGGREEGATE,
				payload: {
					spansAggregate: {
						currentPage: props.current,
						loading: false,
						data: spansAggregate.data,
						error: true,
						total: spansAggregate.total,
						pageSize: props.pageSize,
					},
				},
			});
		}
	};
};

export interface GetSpansAggregateProps {
	maxTime: GlobalReducer['maxTime'];
	minTime: GlobalReducer['minTime'];
	selectedFilter: TraceReducer['selectedFilter'];
	current: TraceReducer['spansAggregate']['currentPage'];
	pageSize: TraceReducer['spansAggregate']['pageSize'];
	selectedTags: TraceReducer['selectedTags'];
}
