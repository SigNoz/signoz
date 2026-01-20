import Spinner from 'components/Spinner';
import { useGetMetricMeta } from 'hooks/apDex/useGetMetricMeta';
import useErrorNotification from 'hooks/useErrorNotification';
import { useParams } from 'react-router-dom';

import { FeatureKeys } from '../../../../../constants/features';
import { useAppContext } from '../../../../../providers/App/App';
import { WidgetKeys } from '../../../constant';
import { IServiceName } from '../../types';
import ApDexMetrics from './ApDexMetrics';
import { ApDexDataSwitcherProps } from './types';

function ApDexMetricsApplication({
	handleGraphClick,
	onDragSelect,
	tagFilterItems,
	thresholdValue,
	topLevelOperationsRoute,
}: ApDexDataSwitcherProps): JSX.Element {
	const { servicename: encodedServiceName } = useParams<IServiceName>();
	const servicename = decodeURIComponent(encodedServiceName);

	const { featureFlags } = useAppContext();
	const dotMetricsEnabled =
		featureFlags?.find((flag) => flag.name === FeatureKeys.DOT_METRICS_ENABLED)
			?.active || false;

	const signozLatencyBucketMetrics = dotMetricsEnabled
		? WidgetKeys.Signoz_latency_bucket
		: WidgetKeys.Signoz_latency_bucket_norm;

	const { data, isLoading, error } = useGetMetricMeta(
		signozLatencyBucketMetrics,
		servicename,
	);
	useErrorNotification(error);

	if (isLoading) {
		return <Spinner height="40vh" tip="Loading..." />;
	}

	return (
		<ApDexMetrics
			topLevelOperationsRoute={topLevelOperationsRoute}
			handleGraphClick={handleGraphClick}
			delta={data?.data.delta}
			metricsBuckets={data?.data.le || []}
			onDragSelect={onDragSelect}
			tagFilterItems={tagFilterItems}
			thresholdValue={thresholdValue}
		/>
	);
}

export default ApDexMetricsApplication;
