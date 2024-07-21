import './WidgetGraph.styles.scss';

import { InfoCircleOutlined } from '@ant-design/icons';
import { Card } from 'container/GridCardLayout/styles';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { memo } from 'react';

import { WidgetGraphContainerProps } from '../../types';
import PlotTag from './PlotTag';
import { AlertIconContainer, Container } from './styles';
import WidgetGraphComponent from './WidgetGraphContainer';

function WidgetGraph({
	selectedGraph,
	queryResponse,
	setRequestData,
	selectedWidget,
	isLoadingPanelData,
}: WidgetGraphContainerProps): JSX.Element {
	const { currentQuery } = useQueryBuilder();

	const isDarkMode = useIsDarkMode();

	if (selectedWidget === undefined) {
		return (
			<Card $panelType={selectedGraph} isDarkMode={isDarkMode}>
				Invalid widget
			</Card>
		);
	}

	return (
		<Container $panelType={selectedGraph} className="widget-graph">
			<div className="header">
				<PlotTag queryType={currentQuery.queryType} panelType={selectedGraph} />
				<DateTimeSelectionV2 showAutoRefresh={false} hideShareModal />
			</div>
			{queryResponse.error && (
				<AlertIconContainer color="red" title={queryResponse.error.message}>
					<InfoCircleOutlined />
				</AlertIconContainer>
			)}

			<WidgetGraphComponent
				isLoadingPanelData={isLoadingPanelData}
				selectedGraph={selectedGraph}
				queryResponse={queryResponse}
				setRequestData={setRequestData}
				selectedWidget={selectedWidget}
			/>
		</Container>
	);
}

export default memo(WidgetGraph);
