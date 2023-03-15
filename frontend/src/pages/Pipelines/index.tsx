import { Tabs } from 'antd';
import getPipeline from 'api/pipeline/get';
import Spinner from 'components/Spinner';
import PipelinePage from 'container/PipelinePage/Layouts';
import ChangeHistory from 'container/PipelinePage/Layouts/ChangeHistory';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';

function Pipelines(): JSX.Element {
	const { t } = useTranslation('common');
	const {
		isLoading,
		data: piplineData,
		isError,
		refetch: refetchPipelineLists,
	} = useQuery(['version', 'latest'], {
		queryFn: () =>
			getPipeline({
				version: 'latest',
			}),
	});

	if (isError) {
		return <div>{piplineData?.error || t('something_went_wrong')}</div>;
	}

	if (isLoading || !piplineData?.payload) {
		return <Spinner height="75vh" tip="Loading Pipelines..." />;
	}

	return (
		<Tabs defaultActiveKey="Pipelines">
			<Tabs.TabPane tabKey="Pipelines" tab="Pipelines" key="Pipelines">
				<PipelinePage
					refetchPipelineLists={refetchPipelineLists}
					piplineData={piplineData}
				/>
			</Tabs.TabPane>

			<Tabs.TabPane
				tabKey="Change History"
				tab="Change History"
				key="Change History"
			>
				<ChangeHistory piplineData={piplineData} />
			</Tabs.TabPane>
		</Tabs>
	);
}

export default Pipelines;
