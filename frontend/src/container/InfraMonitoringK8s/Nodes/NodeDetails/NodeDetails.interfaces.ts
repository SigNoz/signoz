import { K8sNodesData } from 'api/infraMonitoring/getK8sNodesList';

export type NodeDetailsProps = {
	node: K8sNodesData | null;
	isModalTimeSelection: boolean;
	onClose: () => void;
};
