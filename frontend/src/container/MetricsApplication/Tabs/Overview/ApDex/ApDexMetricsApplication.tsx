import axios from 'axios';
import Spinner from 'components/Spinner';
import { Card } from 'container/MetricsApplication/styles';
import { useGetMetricMeta } from 'hooks/apDex/useGetMetricMeta';
import { useNotifications } from 'hooks/useNotifications';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';

import ApDexMetrics from './ApDexMetrics';
import { metricMeta } from './constants';

function ApDexMetricsApplication({
	onDragSelect,
	tagFilterItems,
	topLevelOperationsRoute,
	thresholdValue,
}: ApDexMetricsApplicationProps): JSX.Element {
	const { data, isLoading, error } = useGetMetricMeta(metricMeta);
	const { notifications } = useNotifications();

	if (isLoading) {
		return <Spinner height="40vh" tip="Loading..." />;
	}

	if (error && axios.isAxiosError(error)) {
		notifications.error({
			message: error.message,
		});
		return <Card>{error.message}</Card>;
	}

	if (!isLoading && !data?.data.delta && !data?.data.le) {
		return <Card>No data available</Card>;
	}

	return (
		<ApDexMetrics
			delta={data.data.delta}
			le={data.data.le}
			onDragSelect={onDragSelect}
			topLevelOperationsRoute={topLevelOperationsRoute}
			tagFilterItems={tagFilterItems}
			thresholdValue={thresholdValue}
		/>
	);
}

interface ApDexMetricsApplicationProps {
	onDragSelect: (start: number, end: number) => void;
	topLevelOperationsRoute: string[];
	tagFilterItems: TagFilterItem[];
	thresholdValue: number;
}

export default ApDexMetricsApplication;
