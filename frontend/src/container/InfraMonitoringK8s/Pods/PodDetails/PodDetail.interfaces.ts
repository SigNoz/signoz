import { K8sPodsData } from 'api/infraMonitoring/getK8sPodsList';

export type PodDetailProps = {
	pod: K8sPodsData | null;
	isModalTimeSelection: boolean;
	onClose: () => void;
};
