import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import { ServiceMetricsProps } from '../types';
import { getQueryRangeRequestData } from '../utils';
import ServiceMetricTable from './ServiceMetricTable';

function ServiceMetricsApplication({
	topLevelOperations,
}: ServiceMetricsProps): JSX.Element {
	const { minTime, maxTime, selectedTime: globalSelectedInterval } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const queryRangeRequestData = getQueryRangeRequestData(
		topLevelOperations,
		minTime,
		maxTime,
		globalSelectedInterval,
	);

	return (
		<ServiceMetricTable
			topLevelOperations={topLevelOperations}
			queryRangeRequestData={queryRangeRequestData}
		/>
	);
}

export default ServiceMetricsApplication;
