import { K8sVolumesData } from 'api/infraMonitoring/getK8sVolumesList';

export type VolumeDetailsProps = {
	volume: K8sVolumesData | null;
	isModalTimeSelection: boolean;
	onClose: () => void;
};
