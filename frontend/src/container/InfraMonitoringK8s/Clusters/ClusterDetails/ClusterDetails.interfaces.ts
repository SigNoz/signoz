import { K8sClustersData } from 'api/infraMonitoring/getK8sClustersList';

export type ClusterDetailsProps = {
	cluster: K8sClustersData | null;
	isModalTimeSelection: boolean;
	onClose: () => void;
};
