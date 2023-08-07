import axios from 'axios';
import Spinner from 'components/Spinner';
import { Card, GraphContainer } from 'container/MetricsApplication/styles';
import { useGetApDexSettings } from 'hooks/apDex/useGetApDexSettings';
import { useNotifications } from 'hooks/useNotifications';
import { useParams } from 'react-router-dom';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';

import { IServiceName } from '../../types';
import ApDexTraces from './ApDexTraces';

function ApDex({
	onDragSelect,
	topLevelOperationsRoute,
	tagFilterItems,
}: ApDexProps): JSX.Element {
	const { servicename } = useParams<IServiceName>();
	const { data, isLoading, error, isRefetching } = useGetApDexSettings(
		servicename,
	);
	const { notifications } = useNotifications();

	if (error && axios.isAxiosError(error)) {
		notifications.error({
			message: error.message,
		});
		return <Card>{error.message}</Card>;
	}

	return (
		<Card>
			<GraphContainer>
				{isLoading || isRefetching ? (
					<Spinner height="10vh" />
				) : (
					<ApDexTraces
						onDragSelect={onDragSelect}
						topLevelOperationsRoute={topLevelOperationsRoute}
						tagFilterItems={tagFilterItems}
						thresholdValue={data?.data[0].threshold || 0}
					/>
				)}
			</GraphContainer>
		</Card>
	);
}

interface ApDexProps {
	onDragSelect: (start: number, end: number) => void;
	topLevelOperationsRoute: string[];
	tagFilterItems: TagFilterItem[];
}

export default ApDex;
