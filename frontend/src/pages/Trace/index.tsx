import { Card } from 'antd';
import Filters from 'container/Trace/Filters';
import TraceGraph from 'container/Trace/Graph';
import Search from 'container/Trace/Search';
import TraceGraphFilter from 'container/Trace/TraceGraphFilter';
import TraceTable from 'container/Trace/TraceTable';
import React, { useEffect } from 'react';
import { connect, useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { GetFilter } from 'store/actions/trace/getFilters';
import { GetInitialTraceFilter } from 'store/actions/trace/getInitialFilter';
import {
	GetSpansAggregate,
	GetSpansAggregateProps,
} from 'store/actions/trace/getInitialSpansAggregate';
import { GetSpans, GetSpansProps } from 'store/actions/trace/getSpans';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { RESET_TRACE_FILTER, UPDATE_PRE_SELECTED } from 'types/actions/trace';
import { GlobalReducer } from 'types/reducer/globalTime';
import { TraceReducer } from 'types/reducer/trace';

import { Container, LeftContainer, RightContainer } from './styles';

const Trace = ({
	getFilters,
	getSpansAggregate,
	getSpans,
	getInitialFilter,
}: Props): JSX.Element => {
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const dispatch = useDispatch<Dispatch<AppActions>>();

	const {
		selectedFilter,
		spansAggregate,
		selectedTags,
		selectedFunction,
		selectedGroupBy,
		filterLoading,
		spansGraph,
		preSelectedFilter,
	} = useSelector<AppState, TraceReducer>((state) => state.traces);

	useEffect(() => {
		getInitialFilter(minTime, maxTime);
	}, [getFilters, maxTime, minTime]);

	useEffect(() => {
		if (!filterLoading)
			getSpansAggregate({
				maxTime: maxTime,
				minTime: minTime,
				selectedFilter,
				current: spansAggregate.currentPage,
				pageSize: spansAggregate.pageSize,
				selectedTags,
			});
	}, [
		selectedFilter,
		spansAggregate.currentPage,
		spansAggregate.pageSize,
		selectedTags,
		filterLoading,
		getSpansAggregate,
	]);

	useEffect(() => {
		if (!filterLoading)
			getSpans({
				end: maxTime,
				function: selectedFunction,
				groupBy: selectedGroupBy,
				selectedFilter,
				selectedTags,
				start: minTime,
				step: 60,
				preSelectedFilter,
			});
	}, [
		selectedFunction,
		selectedGroupBy,
		selectedFilter,
		selectedTags,
		filterLoading,
		getSpans,
	]);

	// resetting the whole data when the page un mount
	useEffect(() => {
		return () => {
			dispatch({
				type: RESET_TRACE_FILTER,
			});
		};
	}, []);

	useEffect(() => {
		if (!spansAggregate.loading && !spansGraph.loading) {
			dispatch({
				type: UPDATE_PRE_SELECTED,
				payload: {
					preSelectedFilter: false,
				},
			});
		}
	}, [spansGraph, spansAggregate]);

	return (
		<>
			<Search />
			<Container>
				<LeftContainer>
					<Filters />
				</LeftContainer>

				<RightContainer>
					<Card>
						<TraceGraphFilter />
						<TraceGraph />
					</Card>

					<Card style={{ marginTop: '2rem' }}>
						<TraceTable />
					</Card>
				</RightContainer>
			</Container>
		</>
	);
};

interface DispatchProps {
	getFilters: (
		query: string,
		minTime: GlobalReducer['minTime'],
		maxTime: GlobalReducer['maxTime'],
	) => void;
	getSpansAggregate: (props: GetSpansAggregateProps) => void;
	getSpans: (props: GetSpansProps) => void;
	getInitialFilter: (
		minTime: GlobalReducer['minTime'],
		maxTime: GlobalReducer['maxTime'],
	) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	getFilters: bindActionCreators(GetFilter, dispatch),
	getInitialFilter: bindActionCreators(GetInitialTraceFilter, dispatch),
	getSpansAggregate: bindActionCreators(GetSpansAggregate, dispatch),
	getSpans: bindActionCreators(GetSpans, dispatch),
});

type Props = DispatchProps;

export default connect(null, mapDispatchToProps)(Trace);
