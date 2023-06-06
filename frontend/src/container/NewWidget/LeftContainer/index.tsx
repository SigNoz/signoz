import { memo } from 'react';

import { NewWidgetProps } from '../index';
import QuerySection from './QuerySection';
import { QueryContainer } from './styles';
import WidgetGraph from './WidgetGraph';

function LeftContainer({
	selectedGraph,
	yAxisUnit,
	selectedTime,
}: NewWidgetProps): JSX.Element {
	return (
		<>
			<WidgetGraph
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
