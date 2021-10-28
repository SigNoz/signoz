import Graph from 'components/Graph';
import { colors } from 'lib/getRandomColor';
import React, { memo } from 'react';
import { PayloadProps } from 'types/api/trace/getSpanAggregate';

import { CustomGraphContainer } from './styles';

const TraceCustomGraph = ({ payload }: TraceCustomGraphProps): JSX.Element => {
	return (
		<CustomGraphContainer>
			<Graph
				type="line"
				data={{
					labels: payload.map((s) => new Date(s.timestamp / 1000000)),
					datasets: [
						{
							data: payload.map((e) => e.value),
							borderColor: colors[0],
						},
					],
				}}
			/>
		</CustomGraphContainer>
	);
};

interface TraceCustomGraphProps {
	payload: PayloadProps;
}

export default memo(TraceCustomGraph);
