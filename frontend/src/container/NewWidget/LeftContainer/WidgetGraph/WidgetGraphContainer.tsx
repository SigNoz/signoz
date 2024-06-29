import { Card, Typography } from 'antd';
import Spinner from 'components/Spinner';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { WidgetGraphContainerProps } from 'container/NewWidget/types';
import { getSortedSeriesData } from 'utils/getSortedSeriesData';

import { NotFoundContainer } from './styles';
import WidgetGraph from './WidgetGraphs';

function WidgetGraphContainer({
	selectedGraph,
	queryResponse,
	setRequestData,
	selectedWidget,
	isLoadingPanelData,
}: WidgetGraphContainerProps): JSX.Element {
	if (queryResponse.data && selectedGraph === PANEL_TYPES.BAR) {
		const sortedSeriesData = getSortedSeriesData(
			queryResponse.data?.payload.data.result,
		);
		// eslint-disable-next-line no-param-reassign
		queryResponse.data.payload.data.result = sortedSeriesData;
	}

	if (selectedWidget === undefined) {
		return <Card>Invalid widget</Card>;
	}

	if (queryResponse?.error) {
		return (
			<NotFoundContainer>
				<Typography>{queryResponse.error.message}</Typography>
			</NotFoundContainer>
		);
	}
	if (queryResponse.isLoading && selectedGraph !== PANEL_TYPES.LIST) {
		return <Spinner size="large" tip="Loading..." />;
	}

	if (isLoadingPanelData) {
		return <Spinner size="large" tip="Loading..." />;
	}

	if (
		selectedGraph !== PANEL_TYPES.LIST &&
		queryResponse.data?.payload.data?.result?.length === 0
	) {
		return (
			<NotFoundContainer>
				<Typography>No Data</Typography>
			</NotFoundContainer>
		);
	}
	if (
		selectedGraph === PANEL_TYPES.LIST &&
		queryResponse.data?.payload?.data?.newResult?.data?.result?.length === 0
	) {
		return (
			<NotFoundContainer>
				<Typography>No Data</Typography>
			</NotFoundContainer>
		);
	}

	if (queryResponse.isIdle) {
		return (
			<NotFoundContainer>
				<Typography>No Data</Typography>
			</NotFoundContainer>
		);
	}

	return (
		<WidgetGraph
			selectedWidget={selectedWidget}
			queryResponse={queryResponse}
			setRequestData={setRequestData}
			selectedGraph={selectedGraph}
		/>
	);
}

export default WidgetGraphContainer;
