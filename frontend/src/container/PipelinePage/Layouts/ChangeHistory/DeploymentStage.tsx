import { ReloadOutlined } from '@ant-design/icons';
import { IconDataSpan } from 'container/PipelinePage/styles';
import React from 'react';

function DeploymentStage(deployStatus: string): JSX.Element {
	return (
		<>
			<ReloadOutlined />
			<IconDataSpan>{deployStatus}</IconDataSpan>
		</>
	);
}

export default DeploymentStage;
