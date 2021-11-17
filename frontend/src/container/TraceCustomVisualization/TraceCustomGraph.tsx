import Graph from 'components/Graph';
import convertToNanoSecondsToSecond from 'lib/convertToNanoSecondsToSecond';
import { colors } from 'lib/getRandomColor';
import React, { memo } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { TraceReducer } from 'types/reducer/trace';

import { CustomGraphContainer } from './styles';

const TraceCustomGraph = ({
	spansAggregate,
}: TraceCustomGraphProps): JSX.Element => {
	const { selectedEntity } = useSelector<AppState, TraceReducer>(
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
							data: spansAggregate.map((e) =>
								selectedEntity === 'duration'
									? parseFloat(convertToNanoSecondsToSecond(e.value))
									: e.value,
							),
							borderColor: colors[0],
						},
					],
				}}
			/>
		</CustomGraphContainer>
	);
};

interface TraceCustomGraphProps {
	spansAggregate: TraceReducer['spansAggregate'];
}

export default memo(TraceCustomGraph);
