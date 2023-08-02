import { IconDataSpan } from 'container/PipelinePage/styles';

import { getDeploymentStage, getDeploymentStageIcon } from './utils';

function DeploymentStage(deployStatus: string): JSX.Element {
	return (
		<>
			{getDeploymentStageIcon(deployStatus)}
			<IconDataSpan>{getDeploymentStage(deployStatus)}</IconDataSpan>
		</>
	);
}

export default DeploymentStage;
