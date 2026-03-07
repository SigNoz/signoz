import { K8sStatefulSetsData } from 'api/infraMonitoring/getsK8sStatefulSetsList';

export type StatefulSetDetailsProps = {
	statefulSet: K8sStatefulSetsData | null;
	isModalTimeSelection: boolean;
	onClose: () => void;
};
