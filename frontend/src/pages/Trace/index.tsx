import React, { useEffect } from 'react';
import Search from 'container/Trace/Search';

import { Container, LeftContainer, RightContainer } from './styles';

import TraceGraphFilter from 'container/Trace/TraceGraphFilter';
import Filters from 'container/Trace/Filters';
import { useLocation } from 'react-router-dom';
import { connect, useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';
import { ThunkDispatch } from 'redux-thunk';
import AppActions from 'types/actions';
import { GetFilter } from 'store/actions/trace/getFilters';
import { bindActionCreators } from 'redux';

const Trace = ({ getFilters }: Props): JSX.Element => {
	const { search } = useLocation();

	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	useEffect(() => {
		getFilters(search, minTime, maxTime);
	}, [search, minTime, maxTime]);

	return (
		<>
			<Search />
			<Container>
				<LeftContainer>
					<Filters />
				</LeftContainer>

				<RightContainer>
					<TraceGraphFilter />
					{/* <TraceGraph />
					<TraceTable /> */}
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
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	getFilters: bindActionCreators(GetFilter, dispatch),
});

type Props = DispatchProps;

export default connect(null, mapDispatchToProps)(Trace);
