import axios from 'axios';
import Spinner from 'components/Spinner';
import { Card, GraphContainer } from 'container/MetricsApplication/styles';
import { useGetApDexSettings } from 'hooks/apDex/useGetApDexSettings';
import { useNotifications } from 'hooks/useNotifications';
import { memo } from 'react';
import { useParams } from 'react-router-dom';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';

import { ClickHandlerType } from '../../Overview';
import { IServiceName } from '../../types';
import ApDexDataSwitcher from './ApDexDataSwitcher';

function ApDex({
	handleGraphClick,
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
					<Spinner height="40vh" tip="Loading..." />
				) : (
					<ApDexDataSwitcher
						handleGraphClick={handleGraphClick}
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
	handleGraphClick: (type: string) => ClickHandlerType;
	onDragSelect: (start: number, end: number) => void;
	topLevelOperationsRoute: string[];
	tagFilterItems: TagFilterItem[];
}

export default memo(ApDex);
