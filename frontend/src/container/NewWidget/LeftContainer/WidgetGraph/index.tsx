import './WidgetGraph.styles.scss';

import { InfoCircleOutlined } from '@ant-design/icons';
import WarningPopover from 'components/WarningPopover/WarningPopover';
import { Card } from 'container/GridCardLayout/styles';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { isEmpty } from 'lodash-es';
import { memo } from 'react';
import { Warning } from 'types/api';

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
	enableDrillDown = false,
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
				<div className="header-left">
					<PlotTag queryType={currentQuery.queryType} panelType={selectedGraph} />
					{!isEmpty(queryResponse.data?.warning) && (
						<WarningPopover warningData={queryResponse.data?.warning as Warning} />
					)}
				</div>
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
				enableDrillDown={enableDrillDown}
			/>
		</Container>
	);
}

export default memo(WidgetGraph);
