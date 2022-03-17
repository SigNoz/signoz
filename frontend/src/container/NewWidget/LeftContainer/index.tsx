import React, { memo } from 'react';

import { NewWidgetProps } from '../index';
import { timePreferance } from '../RightContainer/timeItems';
import QuerySection from './QuerySection';
import { QueryContainer } from './styles';
import WidgetGraph from './WidgetGraph';

const LeftContainer = ({
	selectedGraph,
	selectedTime,
	yAxisUnit,
}: LeftContainerProps): JSX.Element => {
	return (
		<>
			<WidgetGraph selectedGraph={selectedGraph} yAxisUnit={yAxisUnit} />

			<QueryContainer>
				<QuerySection selectedTime={selectedTime} />
			</QueryContainer>
		</>
	);
};

interface LeftContainerProps extends NewWidgetProps {
	selectedTime: timePreferance;
	yAxisUnit: string;
}

export default memo(LeftContainer);
