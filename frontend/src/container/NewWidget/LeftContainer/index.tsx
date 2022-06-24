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
	handleUnstagedChanges,
}: LeftContainerProps): JSX.Element {
	return (
		<>
			<WidgetGraph selectedGraph={selectedGraph} yAxisUnit={yAxisUnit} />
			<QueryContainer>
				<QuerySection
					selectedTime={selectedTime}
					handleUnstagedChanges={handleUnstagedChanges}
					selectedGraph={selectedGraph}
				/>
			</QueryContainer>
		</>
	);
}

interface LeftContainerProps extends NewWidgetProps {
	selectedTime: timePreferance;
	handleUnstagedChanges: (arg0: boolean) => void;
}

export default memo(LeftContainer);
