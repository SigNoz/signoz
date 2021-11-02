import Graph from 'components/Graph';
import { colors } from 'lib/getRandomColor';
import React, { memo } from 'react';
import { TraceReducer } from 'types/reducer/trace';

import { CustomGraphContainer } from './styles';

const TraceCustomGraph = ({
	spansAggregate,
}: TraceCustomGraphProps): JSX.Element => {
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

interface TraceCustomGraphProps {
	spansAggregate: TraceReducer['spansAggregate'];
}

export default memo(TraceCustomGraph);
