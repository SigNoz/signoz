import type { TabsProps } from 'antd';
import { Tabs } from 'antd';
import getPipeline from 'api/pipeline/get';
import Spinner from 'components/Spinner';
import PipelinePage from 'container/PipelinePage/Layouts';
import ChangeHistory from 'container/PipelinePage/Layouts/ChangeHistory';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
import { Pipeline } from 'types/api/pipeline/def';

function Pipelines(): JSX.Element {
	const { t } = useTranslation('common');
	const {
		isLoading,
		data: piplineData,
		isError,
		refetch: refetchPipelineLists,
	} = useQuery(['version', 'latest', 'pipeline'], {
		queryFn: () =>
			getPipeline({
				version: 'latest',
			}),
	});

	const tabItems: TabsProps['items'] = useMemo(
		() => [
			{
				key: 'pipelines',
				label: `Pipelines`,
				children: (
					<PipelinePage
						refetchPipelineLists={refetchPipelineLists}
						piplineData={piplineData?.payload as Pipeline}
					/>
				),
			},
			{
				key: 'change-history',
				label: `Change History`,
				children: <ChangeHistory piplineData={piplineData?.payload as Pipeline} />,
			},
		],
		[piplineData?.payload, refetchPipelineLists],
	);

	if (isError) {
		return <div>{piplineData?.error || t('something_went_wrong')}</div>;
	}

	if (isLoading || !piplineData?.payload) {
		return <Spinner height="75vh" tip="Loading Pipelines..." />;
	}

	return <Tabs defaultActiveKey="pipelines" items={tabItems} />;
}

export default Pipelines;
