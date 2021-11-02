import Graph from 'components/Graph';
import { colors } from 'lib/getRandomColor';
import React from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { TraceReducer } from 'types/reducer/trace';

import { CustomGraphContainer } from './styles';

const TraceCustomGraph = (): JSX.Element => {
	const { spansAggregate } = useSelector<AppState, TraceReducer>(
		(state) => state.trace,
	);

	return (
		<CustomGraphContainer>
			<Graph
				type="line"
				data={{
					labels: spansAggregate.map((s) => new Date(s.timestamp / 1000000)),
					datasets: [
						{
							data: spansAggregate.map((e) => e.value),
							borderColor: colors[0],
						},
					],
				}}
			/>
		</CustomGraphContainer>
	);
};

export default TraceCustomGraph;
