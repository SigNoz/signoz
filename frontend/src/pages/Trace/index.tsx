import React from 'react';
import Search from 'container/Trace/Search';

import { Container, LeftContainer, RightContainer } from './styles';

import TraceGraph from 'container/Trace/Graph';
import TraceTable from 'container/Trace/TraceTable';
import TraceGraphFilter from 'container/Trace/TraceGraphFilter';
import Filters from 'container/Trace/Filters';

const Trace = (): JSX.Element => {
	return (
		<>
			<Search />
			<Container>
				<LeftContainer>
					<Filters />
				</LeftContainer>

				<RightContainer>
					<TraceGraphFilter />
					<TraceGraph />
					<TraceTable />
				</RightContainer>
			</Container>
		</>
	);
};

export default Trace;
