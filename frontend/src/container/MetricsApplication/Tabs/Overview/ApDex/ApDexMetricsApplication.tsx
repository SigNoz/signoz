import Spinner from 'components/Spinner';
import { useGetMetricMeta } from 'hooks/apDex/useGetMetricMeta';
import useErrorNotification from 'hooks/useErrorNotification';

import ApDexMetrics from './ApDexMetrics';
import ApDexTraces from './ApDexTraces';
import { metricMeta } from './constants';
import { ApDexDataSwitcherProps } from './types';

function ApDexMetricsApplication({
	handleGraphClick,
	onDragSelect,
	tagFilterItems,
	thresholdValue,
	topLevelOperationsRoute,
}: ApDexDataSwitcherProps): JSX.Element {
	const { data, isLoading, error } = useGetMetricMeta(metricMeta);
	useErrorNotification(error);

	if (isLoading) {
		return <Spinner height="40vh" tip="Loading..." />;
	}

	const isMetricApdex = data?.data.delta;

	return isMetricApdex ? (
		<ApDexMetrics
			topLevelOperationsRoute={topLevelOperationsRoute}
			handleGraphClick={handleGraphClick}
			delta={data?.data.delta}
			metricsBuckets={data?.data.le || []}
			onDragSelect={onDragSelect}
			tagFilterItems={tagFilterItems}
			thresholdValue={thresholdValue}
		/>
	) : (
		<ApDexTraces
			handleGraphClick={handleGraphClick}
			onDragSelect={onDragSelect}
			tagFilterItems={tagFilterItems}
			topLevelOperationsRoute={topLevelOperationsRoute}
			thresholdValue={thresholdValue}
		/>
	);
}

export default ApDexMetricsApplication;
