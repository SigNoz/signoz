import axios from 'axios';
import Spinner from 'components/Spinner';
import { useGetMetricMeta } from 'hooks/apDex/useGetMetricMeta';
import { useNotifications } from 'hooks/useNotifications';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';

import { ClickHandlerType } from '../../Overview';
import ApDexMetrics from './ApDexMetrics';
import { metricMeta } from './constants';

function ApDexMetricsApplication({
	handleGraphClick,
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

interface ApDexMetricsApplicationProps {
	handleGraphClick: (type: string) => ClickHandlerType;
	onDragSelect: (start: number, end: number) => void;
	topLevelOperationsRoute: string[];
	tagFilterItems: TagFilterItem[];
	thresholdValue: number;
}

export default ApDexMetricsApplication;
