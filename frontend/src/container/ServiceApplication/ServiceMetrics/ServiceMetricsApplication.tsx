import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import { FeatureKeys } from '../../../constants/features';
import { useAppContext } from '../../../providers/App/App';
import { ServiceMetricsProps } from '../types';
import { getQueryRangeRequestData } from '../utils';
import ServiceMetricTable from './ServiceMetricTable';

function ServiceMetricsApplication({
	topLevelOperations,
}: ServiceMetricsProps): JSX.Element {
	const { selectedTime: globalSelectedInterval } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const { featureFlags } = useAppContext();
	const dotMetricsEnabled =
		featureFlags?.find((flag) => flag.name === FeatureKeys.DOT_METRICS_ENABLED)
			?.active || false;

	const queryRangeRequestData = useMemo(
		() =>
			getQueryRangeRequestData({
				topLevelOperations,
				globalSelectedInterval,
				dotMetricsEnabled,
			}),
		[globalSelectedInterval, topLevelOperations, dotMetricsEnabled],
	);
	return (
		<ServiceMetricTable
			topLevelOperations={topLevelOperations}
			queryRangeRequestData={queryRangeRequestData}
		/>
	);
}

export default ServiceMetricsApplication;
