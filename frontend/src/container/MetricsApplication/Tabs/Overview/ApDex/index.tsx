import Spinner from 'components/Spinner';
import { Card, GraphContainer } from 'container/MetricsApplication/styles';
import { useGetApDexSettings } from 'hooks/apDex/useGetApDexSettings';
import { useNotifications } from 'hooks/useNotifications';
import { memo, useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { IServiceName } from '../../types';
import ApDexMetricsApplication from './ApDexMetricsApplication';
import { ApDexApplicationProps } from './types';

function ApDexApplication({
	handleGraphClick,
	onDragSelect,
	topLevelOperationsRoute,
	tagFilterItems,
}: ApDexApplicationProps): JSX.Element {
	const { servicename: encodedServiceName } = useParams<IServiceName>();
	const servicename = decodeURIComponent(encodedServiceName);
	const { notifications } = useNotifications();

	const { data, isLoading, error, isRefetching } = useGetApDexSettings(
		servicename,
	);

	useEffect(() => {
		if (error) {
			notifications.error({
				message: error.getErrorCode(),
				description: error.getErrorMessage(),
			});
		}
	}, [error, notifications]);

	if (isLoading || isRefetching) {
		return (
			<Card>
				<Spinner height="40vh" tip="Loading..." />
			</Card>
		);
	}

	return (
		<Card data-testid="apdex">
			<GraphContainer>
				<ApDexMetricsApplication
					handleGraphClick={handleGraphClick}
					onDragSelect={onDragSelect}
					topLevelOperationsRoute={topLevelOperationsRoute}
					tagFilterItems={tagFilterItems}
					thresholdValue={data?.data[0].threshold}
				/>
			</GraphContainer>
		</Card>
	);
}

export default memo(ApDexApplication);
