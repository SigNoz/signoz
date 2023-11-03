import axios from 'api';
import { AxiosResponse } from 'axios';

interface UnlockDashboardProps {
	uuid: string;
}

const unlockDashboard = (props: UnlockDashboardProps): Promise<AxiosResponse> =>
	axios.put(`/dashboards/${props.uuid}/unlock`);

export default unlockDashboard;
