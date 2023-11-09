import { memo } from 'react';

import { WidgetGraphProps } from '../types';
import QuerySection from './QuerySection';
import { QueryContainer } from './styles';
import WidgetGraph from './WidgetGraph';

function LeftContainer({
	selectedGraph,
	yAxisUnit,
	selectedTime,
	fillSpans,
}: WidgetGraphProps): JSX.Element {
	return (
		<>
			<WidgetGraph
				selectedTime={selectedTime}
				selectedGraph={selectedGraph}
				yAxisUnit={yAxisUnit}
				fillSpans={fillSpans}
			/>
			<QueryContainer>
				<QuerySection selectedTime={selectedTime} selectedGraph={selectedGraph} />
			</QueryContainer>
		</>
	);
}

export default memo(LeftContainer);
