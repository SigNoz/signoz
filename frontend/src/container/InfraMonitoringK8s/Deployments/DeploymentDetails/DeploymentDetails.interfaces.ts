import { K8sDeploymentsData } from 'api/infraMonitoring/getK8sDeploymentsList';

export type DeploymentDetailsProps = {
	deployment: K8sDeploymentsData | null;
	isModalTimeSelection: boolean;
	onClose: () => void;
};
