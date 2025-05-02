import { HostData } from 'api/infraMonitoring/getHostLists';

export type HostDetailProps = {
	host: HostData | null;
	isModalTimeSelection: boolean;
	onClose: () => void;
};
