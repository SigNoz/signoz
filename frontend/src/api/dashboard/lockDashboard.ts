import axios from 'api';
import { AxiosResponse } from 'axios';

interface LockDashboardProps {
	uuid: string;
}

const lockDashboard = (props: LockDashboardProps): Promise<AxiosResponse> =>
	axios.put(`/dashboards/${props.uuid}/lock`);

export default lockDashboard;
