import { PANEL_TYPES } from 'constants/queryBuilder';
import { memo } from 'react';

import { WidgetGraphProps } from '../types';
import ExplorerColumnsRenderer from './ExplorerColumnsRenderer';
import QuerySection from './QuerySection';
import { QueryContainer } from './styles';
import WidgetGraph from './WidgetGraph';
// import WidgetListView from './WidgetListView/WidgetListView';

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
	selectedTracesFields,
	setSelectedTracesFields,
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
				selectedTracesFields={selectedTracesFields}
			/>
			<QueryContainer>
				<QuerySection selectedTime={selectedTime} selectedGraph={selectedGraph} />
				{selectedGraph === PANEL_TYPES.LIST && (
					<ExplorerColumnsRenderer
						selectedLogFields={selectedLogFields}
						setSelectedLogFields={setSelectedLogFields}
						selectedTracesFields={selectedTracesFields}
						setSelectedTracesFields={setSelectedTracesFields}
					/>
				)}
			</QueryContainer>
		</>
	);
}

export default memo(LeftContainer);
