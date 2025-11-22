import WidgetGraphComponent from 'container/GridCardLayout/GridCard/WidgetGraphComponent';
import { useGetPublicDashboardWidgetData } from 'hooks/dashboard/useGetPublicDashboardWidgetData';
import { memo } from 'react';
import { Widgets } from 'types/api/dashboard/getAll';

const formatQueryResponse = () => {
	console.log('formatQueryResponse');
};

function Panel({
	widget,
	index,
	dashboardId,
	startTime,
	endTime,
}: {
	widget: Widgets;
	index: number;
	dashboardId: string;
	startTime: number;
	endTime: number;
}): JSX.Element {
	console.log('widget', widget);
	console.log('index', index);

	const {
		data: publicDashboardWidgetData,
		isLoading: isLoadingPublicDashboardWidgetData,
	} = useGetPublicDashboardWidgetData(
		dashboardId,
		index,
		startTime * 1000, // convert to milliseconds
		endTime * 1000, // convert to milliseconds
	);

	console.log('publicDashboardWidgetData', publicDashboardWidgetData);
	console.log(
		'isLoadingPublicDashboardWidgetData',
		isLoadingPublicDashboardWidgetData,
	);

	// const queryResponse = formatQueryResponse(publicDashboardWidgetData?);

	// const queryResponse = publicDashboardWidgetData?.data?.payload?.data?.result;

	return (
		<div className="panel-container">
			{/* <WidgetGraphComponent widget={widget} queryResponse={queryResponse} /> */}
		</div>
	);
}

export default memo(Panel);
