import axios from 'axios';
import Spinner from 'components/Spinner';
import { Card, GraphContainer } from 'container/MetricsApplication/styles';
import { useGetApDexSettings } from 'hooks/apDex/useGetApDexSettings';
import { useNotifications } from 'hooks/useNotifications';
import { memo } from 'react';
import { useParams } from 'react-router-dom';

import { IServiceName } from '../../types';
import ApDexDataSwitcher from './ApDexDataSwitcher';
import { ApDexApplicationProps } from './types';

function ApDexApplication({
	handleGraphClick,
	onDragSelect,
	topLevelOperationsRoute,
	tagFilterItems,
}: ApDexApplicationProps): JSX.Element {
	const { servicename } = useParams<IServiceName>();
	const { data, isLoading, error, isRefetching } = useGetApDexSettings(
		servicename,
	);
	const { notifications } = useNotifications();

	if (error && axios.isAxiosError(error)) {
		notifications.error({
			message: error.message,
		});
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
						thresholdValue={data?.data[0].threshold}
					/>
				)}
			</GraphContainer>
		</Card>
	);
}

export default memo(ApDexApplication);
