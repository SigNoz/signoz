import { K8sJobsData } from 'api/infraMonitoring/getK8sJobsList';

export type JobDetailsProps = {
	job: K8sJobsData | null;
	isModalTimeSelection: boolean;
	onClose: () => void;
};
