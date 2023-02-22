import { NotificationInstance } from 'antd/es/notification/interface';
import getSpansAggregate from 'api/trace/getSpansAggregate';
import { Dispatch, Store } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { UPDATE_SPANS_AGGREGATE } from 'types/actions/trace';
import { Props as GetSpanAggregateProps } from 'types/api/trace/getSpanAggregate';
import { GlobalReducer } from 'types/reducer/globalTime';
import { TraceReducer } from 'types/reducer/trace';

import { updateURL } from './util';

export const GetSpansAggregate = (
	props: GetSpansAggregateProps,
	notify: NotificationInstance,
): ((
	dispatch: Dispatch<AppActions>,
	getState: Store<AppState>['getState'],
) => void) => async (dispatch, getState): Promise<void> => {
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

	const { order = '' } = props;

	try {
		// triggering loading
		dispatch({
			type: UPDATE_SPANS_AGGREGATE,
			payload: {
				spansAggregate: {
					currentPage: props.current,
					loading: true,
					data: spansAggregate.data,
					error: false,
					total: spansAggregate.total,
					pageSize: props.pageSize,
					order,
					orderParam: spansAggregate.orderParam,
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
			order,
			orderParam: props.orderParam,
			spanKind: props.spanKind,
		});

		if (response.statusCode === 200) {
			dispatch({
				type: UPDATE_SPANS_AGGREGATE,
				payload: {
					spansAggregate: {
						currentPage: props.current,
						loading: false,
						data: response.payload.spans,
						error: false,
						total: response.payload.totalSpans,
						pageSize: props.pageSize,
						order,
						orderParam: spansAggregate.orderParam,
					},
				},
			});

			updateURL(
				traces.selectedFilter,
				traces.filterToFetchData,
				props.current,
				traces.selectedTags,
				traces.isFilterExclude,
				traces.userSelectedFilter,
				order,
				traces.spansAggregate.pageSize,
				spansAggregate.orderParam,
			);
		} else {
			notify.error({
				message: response.error || 'Something went wrong',
			});

			dispatch({
				type: UPDATE_SPANS_AGGREGATE,
				payload: {
					spansAggregate: {
						currentPage: props.current,
						loading: false,
						data: spansAggregate.data,
						error: true,
						total: spansAggregate.total,
						pageSize: props.pageSize,
						order,
						orderParam: spansAggregate.orderParam,
					},
				},
			});
		}
	} catch (error) {
		dispatch({
			type: UPDATE_SPANS_AGGREGATE,
			payload: {
				spansAggregate: {
					currentPage: props.current,
					loading: false,
					data: spansAggregate.data,
					error: true,
					total: spansAggregate.total,
					pageSize: props.pageSize,
					order,
					orderParam: spansAggregate.orderParam,
				},
			},
		});
	}
};

export interface GetSpansAggregateProps {
	maxTime: GlobalReducer['maxTime'];
	minTime: GlobalReducer['minTime'];
	selectedFilter: TraceReducer['selectedFilter'];
	current: TraceReducer['spansAggregate']['currentPage'];
	pageSize: TraceReducer['spansAggregate']['pageSize'];
	selectedTags: TraceReducer['selectedTags'];
	order: GetSpanAggregateProps['order'];
	orderParam: GetSpanAggregateProps['orderParam'];
	spanKind: TraceReducer['spanKind'];
}
