import React, { memo } from 'react';

import { NewWidgetProps } from '../index';
import { timePreferance } from '../RightContainer/timeItems';
import QuerySection from './QuerySection';
import { QueryContainer } from './styles';
import WidgetGraph from './WidgetGraph';

function LeftContainer({
	selectedGraph,
	selectedTime,
	yAxisUnit,
}: LeftContainerProps): JSX.Element {
	return (
		<>
			<WidgetGraph selectedGraph={selectedGraph} yAxisUnit={yAxisUnit} />

			<QueryContainer>
				<QuerySection selectedTime={selectedTime} />
			</QueryContainer>
		</>
	);
}

interface LeftContainerProps extends NewWidgetProps {
	selectedTime: timePreferance;
}

export default memo(LeftContainer);
