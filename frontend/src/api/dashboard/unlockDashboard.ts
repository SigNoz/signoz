import axios from 'api';
import { AxiosResponse } from 'axios';

const unlockDashboard = (props: any): Promise<AxiosResponse> =>
	axios.put(`/dashboards/${props.uuid}/unlock`);

export default unlockDashboard;
