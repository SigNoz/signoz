import { PANEL_TYPES } from 'constants/queryBuilder';
import { memo } from 'react';

import { WidgetGraphProps } from '../types';
import ExplorerColumnsRenderer from './ExplorerColumnsRenderer';
import QuerySection from './QuerySection';
import { QueryContainer } from './styles';
import WidgetGraph from './WidgetGraph';

function LeftContainer({
	selectedGraph,
	yAxisUnit,
	selectedTime,
	thresholds,
	fillSpans,
	softMax,
	softMin,
	selectedLogFields,
	setSelectedLogFields,
}: WidgetGraphProps): JSX.Element {
	return (
		<>
			<WidgetGraph
				thresholds={thresholds}
				selectedTime={selectedTime}
				selectedGraph={selectedGraph}
				yAxisUnit={yAxisUnit}
				fillSpans={fillSpans}
				softMax={softMax}
				softMin={softMin}
				selectedLogFields={selectedLogFields}
			/>
			<QueryContainer>
				<QuerySection
					selectedTime={selectedTime}
					selectedGraph={selectedGraph}
					isDashboardPanel
				/>
				{selectedGraph === PANEL_TYPES.LIST && (
					<ExplorerColumnsRenderer
						selectedLogFields={selectedLogFields}
						setSelectedLogFields={setSelectedLogFields}
					/>
				)}
			</QueryContainer>
		</>
	);
}

export default memo(LeftContainer);
