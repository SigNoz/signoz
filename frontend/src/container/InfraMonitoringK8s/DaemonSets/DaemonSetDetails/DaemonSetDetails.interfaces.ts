import { K8sDaemonSetsData } from 'api/infraMonitoring/getK8sDaemonSetsList';

export type DaemonSetDetailsProps = {
	daemonSet: K8sDaemonSetsData | null;
	isModalTimeSelection: boolean;
	onClose: () => void;
};
