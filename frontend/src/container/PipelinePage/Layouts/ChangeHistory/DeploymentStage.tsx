import { LoadingOutlined } from '@ant-design/icons';
import { Spin } from 'antd';
import { IconDataSpan } from 'container/PipelinePage/styles';
import React from 'react';

import { getDeploymentStage } from './utils';

function DeploymentStage(deployStatus: string): JSX.Element {
	const antSpinner = <LoadingOutlined style={{ fontSize: 15 }} spin />;

	return (
		<>
			{deployStatus === 'IN_PROGRESS' && <Spin indicator={antSpinner} />}
			<IconDataSpan>{getDeploymentStage(deployStatus)}</IconDataSpan>
		</>
	);
}

export default DeploymentStage;
