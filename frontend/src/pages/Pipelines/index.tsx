import './Pipelines.styles.scss';

import * as Sentry from '@sentry/react';
import type { TabsProps } from 'antd';
import { Tabs } from 'antd';
import getPipeline from 'api/pipeline/get';
import Spinner from 'components/Spinner';
import ChangeHistory from 'container/PipelinePage/Layouts/ChangeHistory';
import PipelinePage from 'container/PipelinePage/Layouts/Pipeline';
import { useNotifications } from 'hooks/useNotifications';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
import { SuccessResponse } from 'types/api';
import { Pipeline } from 'types/api/pipeline/def';

const pipelineRefetchInterval = (
	pipelineResponse: SuccessResponse<Pipeline> | undefined,
): number | false => {
	// Refetch pipeline data periodically if deployment of
	// its latest changes is not complete yet.
	const latestVersion = pipelineResponse?.payload?.history?.[0];
	const isLatestDeploymentFinished = ['DEPLOYED', 'FAILED'].includes(
		latestVersion?.deployStatus || '',
	);
	if (latestVersion && !isLatestDeploymentFinished) {
		return 3000;
	}
	return false;
};

function Pipelines(): JSX.Element {
	const { t } = useTranslation('common');
	const { notifications } = useNotifications();
	const {
		isLoading,
		data: pipelineData,
		isError,
		refetch: refetchPipelineLists,
	} = useQuery(['version', 'latest', 'pipeline'], {
		queryFn: () =>
			getPipeline({
				version: 'latest',
			}),
		refetchInterval: pipelineRefetchInterval,
	});

	const tabItems: TabsProps['items'] = useMemo(
		() => [
			{
				key: 'pipelines',
				label: `Pipelines`,
				children: (
					<PipelinePage
						refetchPipelineLists={refetchPipelineLists}
						pipelineData={pipelineData?.payload as Pipeline}
					/>
				),
			},
			{
				key: 'change-history',
				label: `Change History`,
				children: (
					<ChangeHistory pipelineData={pipelineData?.payload as Pipeline} />
				),
			},
		],
		[pipelineData?.payload, refetchPipelineLists],
	);

	useEffect(() => {
		if (pipelineData?.error && isError) {
			notifications.error({
				message: pipelineData?.error || t('something_went_wrong'),
			});
		}
	}, [isError, notifications, pipelineData?.error, t]);

	if (isLoading) {
		return <Spinner height="75vh" tip="Loading Pipelines..." />;
	}

	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			<Tabs
				className="pipeline-tabs"
				defaultActiveKey="pipelines"
				items={tabItems}
			/>
		</Sentry.ErrorBoundary>
	);
}

export default Pipelines;
