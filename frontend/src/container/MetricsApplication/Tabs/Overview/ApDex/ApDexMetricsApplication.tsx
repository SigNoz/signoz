import Spinner from 'components/Spinner';
import { useGetMetricMeta } from 'hooks/apDex/useGetMetricMeta';
import useErrorNotification from 'hooks/useErrorNotification';

import ApDexMetrics from './ApDexMetrics';
import { metricMeta } from './constants';
import { ApDexDataSwitcherProps } from './types';

function ApDexMetricsApplication({
	handleGraphClick,
	onDragSelect,
	tagFilterItems,
	topLevelOperationsRoute,
	thresholdValue,
}: ApDexDataSwitcherProps): JSX.Element {
	const { data, isLoading, error } = useGetMetricMeta(metricMeta);
	useErrorNotification(error);

	if (isLoading) {
		return <Spinner height="40vh" tip="Loading..." />;
	}

	return (
		<ApDexMetrics
			handleGraphClick={handleGraphClick}
			delta={data?.data.delta}
			metricsBuckets={data?.data.le}
			onDragSelect={onDragSelect}
			topLevelOperationsRoute={topLevelOperationsRoute}
			tagFilterItems={tagFilterItems}
			thresholdValue={thresholdValue}
		/>
	);
}

export default ApDexMetricsApplication;
