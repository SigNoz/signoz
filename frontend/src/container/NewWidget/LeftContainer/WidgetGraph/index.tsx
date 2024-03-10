import { InfoCircleOutlined } from '@ant-design/icons';
import { Card } from 'container/GridCardLayout/styles';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { memo } from 'react';

import { WidgetGraphContainerProps } from '../../types';
import PlotTag from './PlotTag';
import { AlertIconContainer, Container } from './styles';
import WidgetGraphComponent from './WidgetGraphContainer';

function WidgetGraph({
	selectedGraph,
	yAxisUnit,
	selectedTime,
	thresholds,
	fillSpans,
	softMax,
	softMin,
	selectedLogFields,
	selectedTracesFields,
	queryResponse,
	setRequestData,
	selectedWidget,
}: WidgetGraphContainerProps): JSX.Element {
	const { currentQuery } = useQueryBuilder();

	if (selectedWidget === undefined) {
		return <Card $panelType={selectedGraph}>Invalid widget</Card>;
	}

	return (
		<Container $panelType={selectedGraph}>
			<PlotTag queryType={currentQuery.queryType} panelType={selectedGraph} />
			{queryResponse.error && (
				<AlertIconContainer color="red" title={queryResponse.error.message}>
					<InfoCircleOutlined />
				</AlertIconContainer>
			)}

			<WidgetGraphComponent
				thresholds={thresholds}
				selectedTime={selectedTime}
				selectedGraph={selectedGraph}
				yAxisUnit={yAxisUnit}
				fillSpans={fillSpans}
				softMax={softMax}
				softMin={softMin}
				selectedLogFields={selectedLogFields}
				selectedTracesFields={selectedTracesFields}
				queryResponse={queryResponse}
				setRequestData={setRequestData}
				selectedWidget={selectedWidget}
			/>
		</Container>
	);
}

export default memo(WidgetGraph);
