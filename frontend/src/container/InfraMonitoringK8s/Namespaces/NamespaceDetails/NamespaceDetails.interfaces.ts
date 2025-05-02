import { K8sNamespacesData } from 'api/infraMonitoring/getK8sNamespacesList';

export type NamespaceDetailsProps = {
	namespace: K8sNamespacesData | null;
	isModalTimeSelection: boolean;
	onClose: () => void;
};
