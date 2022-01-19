import Filters from 'container/Trace/Filters';
import Search from 'container/Trace/Search';
import TraceGraphFilter from 'container/Trace/TraceGraphFilter';
import TraceTable from 'container/Trace/TraceTable';
import React, { useEffect } from 'react';
import { connect, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { bindActionCreators } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { GetFilter } from 'store/actions/trace/getFilters';
import {
	GetSpansAggregate,
	GetSpansAggregateProps,
} from 'store/actions/trace/getInitialSpansAggregate';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { GlobalReducer } from 'types/reducer/globalTime';
import { TraceReducer } from 'types/reducer/trace';

import { Container, LeftContainer, RightContainer } from './styles';

const Trace = ({ getFilters, getSpansAggregate }: Props): JSX.Element => {
	const { search } = useLocation();

	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const { selectedFilter, spansAggregate } = useSelector<AppState, TraceReducer>(
		(state) => state.traces,
	);

	useEffect(() => {
		getFilters(search, minTime, maxTime);
	}, [minTime, maxTime, getFilters, search]);

	useEffect(() => {
		getSpansAggregate({
			maxTime: maxTime,
			minTime: minTime,
			selectedFilter,
			current: spansAggregate.currentPage,
			pageSize: spansAggregate.pageSize,
		});
	}, [
		maxTime,
		minTime,
		selectedFilter,
		spansAggregate.currentPage,
		spansAggregate.pageSize,
	]);

	return (
		<>
			<Search />
			<Container>
				<LeftContainer>
					<Filters />
				</LeftContainer>

				<RightContainer>
					<TraceGraphFilter />
					{/* <TraceGraph /> */}
					<TraceTable />
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
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	getFilters: bindActionCreators(GetFilter, dispatch),
	getSpansAggregate: bindActionCreators(GetSpansAggregate, dispatch),
});

type Props = DispatchProps;

export default connect(null, mapDispatchToProps)(Trace);
