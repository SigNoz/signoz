import { IconDataSpan } from 'container/PipelinePage/styles';

import { getDeploymentStage, getDeploymentStageIcon } from './utils';

import { Flex } from 'antd';

function DeploymentStage(deployStatus: string): JSX.Element {
	return (
		<Flex align="center" justify="center" gap="2px">
			{getDeploymentStageIcon(deployStatus)}
			<IconDataSpan>{getDeploymentStage(deployStatus)}</IconDataSpan>
		</Flex>
	);
}

export default DeploymentStage;
