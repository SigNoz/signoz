import axios from 'axios';
import Spinner from 'components/Spinner';
import { useGetMetricMeta } from 'hooks/apDex/useGetMetricMeta';
import { useNotifications } from 'hooks/useNotifications';

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
	const { notifications } = useNotifications();

	if (isLoading) {
		return <Spinner height="40vh" tip="Loading..." />;
	}

	if (error && axios.isAxiosError(error)) {
		notifications.error({
			message: error.message,
		});
	}

	return (
		<ApDexMetrics
			handleGraphClick={handleGraphClick}
			delta={data?.data.delta}
			le={data?.data.le}
			onDragSelect={onDragSelect}
			topLevelOperationsRoute={topLevelOperationsRoute}
			tagFilterItems={tagFilterItems}
			thresholdValue={thresholdValue}
		/>
	);
}

export default ApDexMetricsApplication;
