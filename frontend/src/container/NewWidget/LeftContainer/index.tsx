import { memo } from 'react';

import { WidgetGraphProps } from '../types';
import QuerySection from './QuerySection';
import { QueryContainer } from './styles';
import WidgetGraph from './WidgetGraph';

function LeftContainer({
	selectedGraph,
	yAxisUnit,
	selectedTime,
	thresholds,
}: WidgetGraphProps): JSX.Element {
	return (
		<>
			<WidgetGraph
				thresholds={thresholds}
				selectedTime={selectedTime}
				selectedGraph={selectedGraph}
				yAxisUnit={yAxisUnit}
			/>
			<QueryContainer>
				<QuerySection selectedTime={selectedTime} selectedGraph={selectedGraph} />
			</QueryContainer>
		</>
	);
}

export default memo(LeftContainer);
