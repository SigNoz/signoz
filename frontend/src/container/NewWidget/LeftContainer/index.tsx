import React, { memo } from 'react';

import { NewWidgetProps } from '../index';
import QuerySection from './QuerySection';
import { QueryContainer } from './styles';
import WidgetGraph from './WidgetGraph';

function LeftContainer({
	selectedGraph,
	yAxisUnit,
}: NewWidgetProps): JSX.Element {
	return (
		<>
			<WidgetGraph selectedGraph={selectedGraph} yAxisUnit={yAxisUnit} />
			<QueryContainer>
				<QuerySection selectedGraph={selectedGraph} />
			</QueryContainer>
		</>
	);
}

export default memo(LeftContainer);
