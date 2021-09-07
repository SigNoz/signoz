import React, { memo } from 'react';

import { NewWidgetProps } from '../index';
import { timePreferance } from '../RightContainer/timeItems';
import QuerySection from './QuerySection';
import { QueryContainer } from './styles';
import WidgetGraph from './WidgetGraph';

const LeftContainer = ({
	selectedGraph,
	selectedTime,
}: LeftContainerProps): JSX.Element => {
	return (
		<>
			<WidgetGraph selectedGraph={selectedGraph} />

			<QueryContainer>
				<QuerySection selectedTime={selectedTime} />
			</QueryContainer>
		</>
	);
};

interface LeftContainerProps extends NewWidgetProps {
	selectedTime: timePreferance;
}

export default memo(LeftContainer);
